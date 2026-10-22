"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import {
  diceTrial,
  expectedRollsUntil,
  modeSums,
  mulberry32,
  productParity,
  simulateDice,
  sumCounts,
  sumDistribution,
  targetHitProbability,
  type DiceLabConfig,
  type Rng,
  type SceneProps,
} from "@gmq/animation-engine";
import { Counter, Histogram, SceneButton, SceneFrame, SceneMessage, formatNumber, tr, type Bar, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const REVEAL_MS = 3200;
/** If the child rolled fewer than this, the reveal simulates enough to show the shape. */
const REVEAL_MIN_ROLLS = 50;
const REVEAL_SIM = 500;
/** until_target buckets: 1..15 throws, then "16+". */
const BUCKETS = 16;

const PIPS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]],
};

function Die({ x, y, size, face, hit }: { x: number; y: number; size: number; face: number; hit?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width={size} height={size} rx={size * 0.18} className={hit ? "fill-fun-yellow stroke-amber-500" : "fill-white stroke-primary-300"} strokeWidth={3} />
      {PIPS[face]?.map(([px, py], i) => <circle key={i} cx={px * size} cy={py * size} r={size * 0.09} className="fill-gray-700" />)}
    </g>
  );
}

const mean = (v: readonly number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

/** C3 / C6 / C8: roll dice many times and let the histogram tell the truth. */
export default function DiceLabScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<DiceLabConfig>) {
  const { mode, dice, rolls } = config;
  const target = config.target ?? 6;
  const events = useSceneEvents(onEvent);
  const rngRef = useRef<Rng | null>(null);
  const completedRef = useRef(false);
  const [values, setValues] = useState<number[]>([]);
  const [faces, setFaces] = useState<number[] | null>(null);
  const [rollKey, setRollKey] = useState(0);

  const rng = () => (rngRef.current ??= mulberry32(config.seed ?? (Date.now() >>> 0)));

  const roll = (count: number) => {
    if (phase !== "explore") return;
    events.interact();
    const r = rng();
    const fresh: number[] = [];
    let last: number[] = [];
    for (let i = 0; i < count; i++) {
      const t = diceTrial(r, mode, dice, target);
      fresh.push(t.value);
      last = t.faces;
    }
    const next = [...values, ...fresh];
    setValues(next);
    setFaces(last);
    setRollKey((k) => k + 1);
    if (mode === "sum") events.state({ rolls: next.length, mostCommon: mostCommon(next) });
    else if (mode === "product") events.state({ rolls: next.length, even: next.filter((v) => v % 2 === 0).length, odd: next.filter((v) => v % 2 === 1).length });
    else events.state({ rolls: next.length, average: Number(mean(next).toFixed(2)) });
    if (next.length >= rolls && !completedRef.current) {
      completedRef.current = true;
      events.emit("completed", { moves: next.length });
    }
  };

  const reset = () => {
    setValues([]);
    setFaces(null);
    completedRef.current = false;
  };

  const revealValues = useMemo(() => {
    if (phase !== "reveal" || values.length >= REVEAL_MIN_ROLLS) return values;
    return [...values, ...simulateDice(mulberry32(config.seed ?? 3), mode, dice, REVEAL_SIM, target)];
  }, [phase, values, mode, dice, target, config.seed]);

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const shown = phase === "hook" ? [] : phase === "reveal" ? revealValues : values;
  const expected = expectedRollsUntil(targetHitProbability(dice));

  const label =
    mode === "sum"
      ? tr(locale, `Roll ${dice} ${dice === 1 ? "die" : "dice"} and add them`, `掷 ${dice} 个骰子，把点数加起来`)
      : mode === "product"
        ? tr(locale, `Roll ${dice} dice and multiply: odd or even?`, `掷 ${dice} 个骰子相乘：奇数还是偶数？`)
        : tr(locale, `Keep rolling until you get a ${target}`, `一直掷，直到掷出 ${target}`);

  const message = (() => {
    if (phase === "hook") return mode === "sum" ? tr(locale, "Which total comes up most?", "哪个和最常出现？") : mode === "product" ? tr(locale, "Is this game fair?", "这个游戏公平吗？") : tr(locale, "How many throws, on average?", "平均要掷几次？");
    if (phase === "reveal") {
      if (mode === "sum" && dice === 1) return tr(locale, "One die is fair: every face has 1 of 6 ways. Add a second die and 7 takes over.", "一个骰子很公平：每面都是 6 种里的 1 种。加一个骰子，7 就冒出来了。");
      if (mode === "sum") {
        const m = modeSums(dice);
        const ways = sumCounts(dice)[m[0]];
        return tr(locale, `${m.join(" and ")} ${m.length > 1 ? "have" : "has"} ${ways} of ${6 ** dice} ways: the most of any total.`, `${m.join(" 和 ")} 有 ${6 ** dice} 种里的 ${ways} 种凑法，比别的和都多。`);
      }
      if (mode === "product") {
        const p = productParity(dice);
        return tr(locale, `Even ${p.evenOutcomes} : odd ${p.oddOutcomes}. One even die makes the whole product even.`, `偶数 ${p.evenOutcomes} : 奇数 ${p.oddOutcomes}。只要有一个骰子是偶数，积就是偶数。`);
      }
      return tr(locale, `On average it takes ${formatNumber(Number(expected.toFixed(2)), locale)} throws, but single rounds vary a lot.`, `平均要掷 ${formatNumber(Number(expected.toFixed(2)), locale)} 次，但每一轮差别很大。`);
    }
    if (values.length === 0) return tr(locale, "Press a button to roll.", "点按钮开始掷。");
    if (mode === "until_target") return tr(locale, `${values.length} rounds. Last round took ${values[values.length - 1]} throws.`, `${values.length} 轮。上一轮掷了 ${values[values.length - 1]} 次。`);
    return tr(locale, `${formatNumber(values.length, locale)} rolls so far.`, `已经掷了 ${formatNumber(values.length, locale)} 次。`);
  })();

  const leftPanel = (() => {
    if (phase === "reveal") {
      if (dice === 2 && mode !== "until_target") return <TableReveal mode={mode} progress={progress} locale={locale} />;
      if (mode === "sum") return <ExactSumBars dice={dice} progress={progress} locale={locale} />;
      if (mode === "product") return <ParityBars dice={dice} progress={progress} locale={locale} />;
    }
    const show = phase === "hook" ? Array.from({ length: dice }, (_, i) => [5, 2, 6][i]) : faces;
    const size = 64;
    const w = dice * (size + 14) + 14;
    return (
      <svg viewBox={`0 0 ${w} 100`} role="img" aria-label={show ? tr(locale, `Last throw: ${show.join(", ")}`, `上一次：${show.join("、")}`) : label} className="h-full w-full">
        {show ? (
          <motion.g key={rollKey} initial={reducedMotion ? { opacity: 0 } : { rotate: -12, opacity: 0.4 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: reducedMotion ? 0.2 : 0.3 }}>
            {show.map((f, i) => <Die key={i} x={14 + i * (size + 14)} y={18} size={size} face={f} hit={mode === "until_target" && f === target} />)}
          </motion.g>
        ) : (
          <text x={w / 2} y={56} textAnchor="middle" className="fill-gray-300 text-[40px]">🎲</text>
        )}
      </svg>
    );
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="min-h-0 min-w-0 flex-1">{leftPanel}</div>
        <div className="flex min-h-0 w-[46%] shrink-0 flex-col">
          <div className="min-h-0 flex-1">
            {mode === "until_target" ? (
              <UntilChart values={shown} expected={expected} progress={phase === "reveal" ? progress : 1} reveal={phase === "reveal"} locale={locale} />
            ) : (
              <Histogram bars={chartBars(mode, dice, shown, locale)} label={tr(locale, "How often each result came up", "每种结果出现的次数")} width={mode === "sum" ? Math.max(120, (dice * 5 + 1) * 18) : 120} />
            )}
          </div>
        </div>
      </div>
      <SceneMessage>{message}</SceneMessage>
      {phase === "explore" && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <SceneButton onClick={() => roll(1)}>{tr(locale, "Roll 1", "掷 1 次")}</SceneButton>
          <SceneButton onClick={() => roll(10)}>{tr(locale, "Roll 10", "掷 10 次")}</SceneButton>
          <SceneButton onClick={() => roll(rolls)} variant="accent">
            {tr(locale, `Roll ${rolls}`, `掷 ${rolls} 次`)}
          </SceneButton>
          {mode === "until_target" && values.length > 0 && <Counter label={tr(locale, "average", "平均")} value={mean(values).toFixed(2)} tone="pink" />}
          <SceneButton onClick={reset} variant="ghost" disabled={values.length === 0}>
            {tr(locale, "Reset", "重来")}
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

function mostCommon(values: readonly number[]): number | null {
  const counts = new Map<number, number>();
  let best: number | null = null;
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (best === null || c > (counts.get(best) ?? 0)) best = v;
  }
  return best;
}

function chartBars(mode: "sum" | "product", dice: number, values: readonly number[], locale: SceneLocale): Bar[] {
  if (mode === "product") {
    const even = values.filter((v) => v % 2 === 0).length;
    const odd = values.length - even;
    const max = Math.max(1, even, odd);
    return [
      { key: "even", label: tr(locale, "even", "偶数"), value: even / max, caption: String(even), fillClass: "fill-primary-500" },
      { key: "odd", label: tr(locale, "odd", "奇数"), value: odd / max, caption: String(odd), fillClass: "fill-fun-orange" },
    ];
  }
  const counts = Array.from({ length: 6 * dice + 1 }, () => 0);
  for (const v of values) counts[v]++;
  const max = Math.max(1, ...counts);
  return counts.slice(dice).map((c, i) => ({ key: String(i + dice), label: String(i + dice), value: c / max, caption: c ? String(c) : "", fillClass: "fill-fun-purple" }));
}

/** 6 x 6 outcome table for two dice: sums with the most common lit, or products coloured by parity. */
function TableReveal({ mode, progress, locale }: { mode: "sum" | "product"; progress: number; locale: SceneLocale }) {
  const cell = 30;
  const off = 26;
  const lit = segment(progress, 0.55, 0.8) > 0;
  const best = modeSums(2);
  const p = productParity(2);
  return (
    <svg viewBox={`0 0 ${off + 6 * cell + 4} ${off + 6 * cell + 22}`} role="img" aria-label={mode === "sum" ? tr(locale, "All 36 outcomes of two dice; 7 appears 6 times", "两个骰子的 36 种结果；7 出现 6 次") : tr(locale, "All 36 products: 27 even, 9 odd", "36 种乘积：27 个偶数，9 个奇数")} className="h-full w-full">
      {[1, 2, 3, 4, 5, 6].map((d) => (
        <g key={d}>
          <text x={off + (d - 0.5) * cell} y={off - 8} textAnchor="middle" className="fill-gray-500 text-[12px] font-bold">{d}</text>
          <text x={off - 10} y={off + (d - 0.5) * cell} dy="0.35em" textAnchor="middle" className="fill-gray-500 text-[12px] font-bold">{d}</text>
        </g>
      ))}
      {Array.from({ length: 36 }, (_, i) => {
        const a = Math.floor(i / 6) + 1;
        const b = (i % 6) + 1;
        const v = mode === "sum" ? a + b : a * b;
        const appear = segment(progress, (i / 36) * 0.5, (i / 36) * 0.5 + 0.08);
        const fill = !lit ? "fill-white" : mode === "sum" ? (best.includes(v) ? "fill-fun-yellow" : "fill-white") : v % 2 === 0 ? "fill-primary-200" : "fill-fun-orange/50";
        return (
          <g key={i} opacity={appear}>
            <rect x={off + (b - 1) * cell + 1} y={off + (a - 1) * cell + 1} width={cell - 2} height={cell - 2} rx={5} className={`${fill} stroke-primary-100`} strokeWidth={1} />
            <text x={off + (b - 0.5) * cell} y={off + (a - 0.5) * cell} dy="0.35em" textAnchor="middle" className="fill-gray-700 text-[12px] font-bold">{v}</text>
          </g>
        );
      })}
      <text x={(off + 6 * cell) / 2 + 8} y={off + 6 * cell + 17} textAnchor="middle" className="fill-gray-700 text-[12px] font-bold" opacity={segment(progress, 0.8, 1)}>
        {mode === "sum" ? tr(locale, `${best[0]}: 6 of 36 ways`, `${best[0]}：36 种里有 6 种`) : `${tr(locale, "even", "偶")} ${p.evenOutcomes} : ${tr(locale, "odd", "奇")} ${p.oddOutcomes}`}
      </text>
    </svg>
  );
}

/** Exact sum distribution (1 or 3 dice), the most likely totals lit. */
function ExactSumBars({ dice, progress, locale }: { dice: number; progress: number; locale: SceneLocale }) {
  const dist = sumDistribution(dice);
  const best = modeSums(dice);
  const counts = sumCounts(dice);
  const max = Math.max(...dist);
  const grow = segment(progress, 0, 0.7);
  const bars: Bar[] = dist.slice(dice).map((p, i) => ({
    key: String(i + dice),
    label: String(i + dice),
    value: (p / max) * grow,
    caption: progress > 0.7 && best.includes(i + dice) ? String(counts[i + dice]) : "",
    fillClass: best.includes(i + dice) ? "fill-fun-yellow" : "fill-primary-300",
  }));
  return <Histogram bars={bars} width={Math.max(120, bars.length * 18)} label={tr(locale, `Exact chances of each total with ${dice} dice`, `${dice} 个骰子每个和的准确概率`)} />;
}

function ParityBars({ dice, progress, locale }: { dice: number; progress: number; locale: SceneLocale }) {
  const p = productParity(dice);
  const grow = segment(progress, 0, 0.7);
  return (
    <Histogram
      label={tr(locale, `${p.evenOutcomes} even and ${p.oddOutcomes} odd products out of ${p.outcomes}`, `${p.outcomes} 种里偶数 ${p.evenOutcomes} 种，奇数 ${p.oddOutcomes} 种`)}
      bars={[
        { key: "even", label: tr(locale, "even", "偶数"), value: p.even * grow, caption: `${p.evenOutcomes}/${p.outcomes}`, fillClass: "fill-primary-500" },
        { key: "odd", label: tr(locale, "odd", "奇数"), value: p.odd * grow, caption: `${p.oddOutcomes}/${p.outcomes}`, fillClass: "fill-fun-orange" },
      ]}
    />
  );
}

/** Throws-per-round histogram with the running average as a vertical line. */
function UntilChart({ values, expected, progress, reveal, locale }: { values: readonly number[]; expected: number; progress: number; reveal: boolean; locale: SceneLocale }) {
  const W = 200;
  const H = 150;
  const top = 14;
  const bottom = H - 26;
  const slot = (W - 8) / BUCKETS;
  // During the reveal the average is recomputed over a growing prefix, so it visibly settles.
  const upto = reveal ? Math.max(1, Math.ceil(values.length * segment(progress, 0, 0.85))) : values.length;
  const used = values.slice(0, upto);
  const counts = Array.from({ length: BUCKETS }, () => 0);
  for (const v of used) counts[Math.min(BUCKETS, v) - 1]++;
  const max = Math.max(1, ...counts);
  const avg = mean(used);
  const xOf = (throws: number) => 4 + (Math.min(BUCKETS, throws) - 0.5) * slot;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr(locale, `Throws per round; average ${avg.toFixed(2)}`, `每轮掷的次数；平均 ${avg.toFixed(2)}`)} className="h-full w-full">
      <line x1={0} x2={W} y1={bottom} y2={bottom} className="stroke-gray-300" strokeWidth={1.5} />
      {counts.map((c, i) => {
        const h = (c / max) * (bottom - top);
        return <rect key={i} x={4 + i * slot + 1} y={bottom - h} width={slot - 2} height={h} rx={2} className="fill-fun-cyan" />;
      })}
      {[1, 5, 10].map((t) => (
        <text key={t} x={xOf(t)} y={bottom + 12} textAnchor="middle" className="fill-gray-500 text-[9px]">{t}</text>
      ))}
      <text x={xOf(16)} y={bottom + 12} textAnchor="middle" className="fill-gray-500 text-[9px]">16+</text>
      {reveal && progress > 0.85 && <line x1={xOf(expected)} x2={xOf(expected)} y1={top - 4} y2={bottom} className="stroke-fun-pink" strokeWidth={1.5} strokeDasharray="4 3" />}
      {used.length > 0 && (
        <g>
          <line x1={xOf(avg)} x2={xOf(avg)} y1={top} y2={bottom} className="stroke-fun-purple" strokeWidth={2.5} />
          <text x={Math.min(W - 30, xOf(avg) + 3)} y={top + 2} className="fill-fun-purple text-[10px] font-bold">
            {tr(locale, "avg", "平均")} {avg.toFixed(1)}
          </text>
        </g>
      )}
      <text x={W / 2} y={H - 2} textAnchor="middle" className="fill-gray-400 text-[9px]">{tr(locale, "throws in a round", "一轮掷的次数")}</text>
    </svg>
  );
}
