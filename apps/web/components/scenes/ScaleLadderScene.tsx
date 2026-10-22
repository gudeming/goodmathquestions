"use client";

import { useMemo, useRef, useState } from "react";
import {
  SCALE_DEFAULTS,
  answerRung,
  ladderFor,
  ladderValues,
  roundForLadder,
  scaleAnswer,
  secondsIn,
  type LadderStep,
  type ScaleLadderConfig,
  type SceneProps,
} from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, bi, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const REVEAL_MS = 3600;
const opSign = (s: Pick<LadderStep, "op">) => (s.op === "mul" ? "×" : "÷");
const fmtV = (v: number, locale: SceneLocale) => formatNumber(roundForLadder(v), locale);
const compact = (v: number, locale: SceneLocale) => new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", { notation: "compact" }).format(v);

/** A4 / A5 / A9: climb a ladder of unit conversions, or compare two powers of ten. */
export default function ScaleLadderScene(props: SceneProps<ScaleLadderConfig>) {
  return props.config.mode === "powers" ? <PowersScene {...props} /> : <LadderScene {...props} />;
}

function LadderScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<ScaleLadderConfig>) {
  const mode = config.mode === "heartbeats" ? "heartbeats" : "time";
  const start = config.start ?? SCALE_DEFAULTS[mode].start;
  const target = config.target ?? SCALE_DEFAULTS.heartbeats.target ?? 1e9;
  const ladder = useMemo(() => ladderFor(mode, target), [mode, target]);
  const values = useMemo(() => ladderValues(start, ladder), [start, ladder]);
  const goal = answerRung(mode);
  const events = useSceneEvents(onEvent);
  const [rung, setRung] = useState(0);
  const [moves, setMoves] = useState(0);
  const [hint, setHint] = useState("");
  const done = useRef(false);

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const shownRung = phase === "reveal" ? Math.round(segment(progress, 0, 0.8) * ladder.steps.length) : phase === "hook" ? 0 : rung;

  // Distinct operation buttons, in ladder order.
  const ops = useMemo(() => {
    const seen = new Set<string>();
    return ladder.steps.filter((s) => {
      const k = `${s.op}${s.factor}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [ladder]);

  const press = (op: LadderStep) => {
    if (phase !== "explore") return;
    events.interact();
    setMoves((m) => m + 1);
    const next = ladder.steps[rung];
    if (!next) return;
    if (next.op !== op.op || next.factor !== op.factor) {
      setHint(tr(locale, `Not this one yet. Hint: ${next.why.en}.`, `还不是这一步。提示：${next.why.zh}。`));
      return;
    }
    const r = rung + 1;
    setRung(r);
    setHint("");
    events.state({ rung: r, value: roundForLadder(values[r]), unit: ladder.steps[r - 1].unit.en });
    if (r === goal && !done.current) {
      done.current = true;
      const answer = roundForLadder(values[goal]);
      onProposeAnswer?.(String(mode === "time" ? Math.round(answer * 10) / 10 : Math.round(answer)));
      events.emit("completed", { moves: moves + 1, answer });
    }
  };
  const back = () => {
    setRung((r) => Math.max(0, r - 1));
    setHint("");
  };

  const unitAt = (i: number) => bi(locale, i === 0 ? ladder.startUnit : ladder.steps[i - 1].unit);
  const label =
    mode === "time"
      ? tr(locale, `How long is ${formatNumber(start, locale)} seconds?`, `${formatNumber(start, locale)} 秒有多久？`)
      : tr(locale, `${start} heartbeats a minute: when is beat number ${formatNumber(target, locale)}?`, `每分钟跳 ${start} 下：第 ${formatNumber(target, locale)} 下在什么时候？`);

  const chain = () => {
    const parts = ladder.steps.slice(0, goal).map((s) => (s.op === "into" ? "" : `${opSign(s)} ${formatNumber(s.factor, locale)}`));
    if (mode === "time") return `${formatNumber(start, locale)} ${unitAt(0)} ${parts.join(" ")} ≈ ${fmtV(values[goal], locale)} ${unitAt(goal)}`;
    return `${start} ${parts.slice(0, 3).join(" ")} = ${fmtV(values[3], locale)} ${unitAt(3)} → ${formatNumber(target, locale)} ÷ ${fmtV(values[3], locale)} ≈ ${fmtV(values[4], locale)} ${unitAt(4)}`;
  };

  const message = (() => {
    if (phase === "hook") return label;
    if (phase === "reveal") return progress > 0.8 ? chain() : tr(locale, "One rung at a time…", "一级一级往上爬……");
    if (hint) return hint;
    if (rung === 0) return tr(locale, "Pick the button that climbs one rung.", "选一个按钮，往上爬一级。");
    if (rung >= goal)
      return mode === "time"
        ? tr(locale, `${fmtV(values[goal], locale)} days: not even two weeks!`, `${fmtV(values[goal], locale)} 天：还不到两周！`)
        : tr(locale, `About ${Math.round(values[goal])} years old.`, `大约 ${Math.round(values[goal])} 岁。`);
    return `${fmtV(values[rung], locale)} ${unitAt(rung)}`;
  })();

  const rows = ladder.steps.length + 1;
  const H = 210;
  const gap = (H - 20) / (rows - 1);
  const yAt = (i: number) => H - 12 - i * gap;

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <svg viewBox={`0 0 230 ${H}`} role="img" aria-label={tr(locale, `Ladder: ${unitAt(shownRung)} reached`, `梯子：已到 ${unitAt(shownRung)}`)} className="h-full min-w-0 flex-1">
          <line x1={30} x2={30} y1={6} y2={H - 6} className="stroke-amber-700/50" strokeWidth={5} strokeLinecap="round" />
          <line x1={70} x2={70} y1={6} y2={H - 6} className="stroke-amber-700/50" strokeWidth={5} strokeLinecap="round" />
          {Array.from({ length: rows }, (_, i) => {
            const reached = i <= shownRung;
            const isGoal = i === goal;
            return (
              <g key={i}>
                <line x1={30} x2={70} y1={yAt(i)} y2={yAt(i)} className={reached ? "stroke-amber-600" : "stroke-amber-700/30"} strokeWidth={4} />
                {i > 0 && reached && (
                  <text x={50} y={yAt(i) + gap / 2} dy="0.35em" textAnchor="middle" className="fill-fun-pink text-[10px] font-bold">
                    {ladder.steps[i - 1].op === "into" ? `${compact(target, locale)}÷` : `${opSign(ladder.steps[i - 1])}${ladder.steps[i - 1].factor}`}
                  </text>
                )}
                <text x={80} y={yAt(i)} dy="0.35em" className={`text-[12px] ${i === shownRung ? "fill-gray-900 font-bold" : reached ? "fill-gray-600" : "fill-gray-400"}`}>
                  {reached ? fmtV(values[i], locale) : "?"} {unitAt(i)}
                  {isGoal && reached && " ✓"}
                </text>
                {i === shownRung && (
                  <text x={8} y={yAt(i)} dy="0.35em" className="text-[16px]" style={reducedMotion ? undefined : { transition: "y 300ms" }}>
                    🧗
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="flex w-[42%] min-w-0 shrink-0 flex-col justify-center gap-1 overflow-hidden text-[11px] sm:text-xs">
          {mode === "time" ? <TimeRefs config={config} start={start} rung={shownRung} unit={unitAt(shownRung)} locale={locale} /> : <AgeLine config={config} years={values[goal]} show={shownRung >= goal} locale={locale} />}
        </div>
      </div>
      <SceneMessage>{message}</SceneMessage>
      {phase === "explore" && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          {ops.map((s) => (
            <SceneButton key={`${s.op}${s.factor}`} onClick={() => press(s)} disabled={rung >= ladder.steps.length}>
              {s.op === "into" ? `${compact(s.factor, locale)} ÷ ?` : `${opSign(s)} ${s.factor}`}
            </SceneButton>
          ))}
          <SceneButton onClick={back} variant="ghost" disabled={rung === 0} ariaLabel={tr(locale, "Down one rung", "下一级")}>
            ↓
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

/** References and the start quantity, sorted, all expressed in the current unit. */
function TimeRefs({ config, start, rung, unit, locale }: { config: ScaleLadderConfig; start: number; rung: number; unit: string; locale: SceneLocale }) {
  const rows = [
    ...(config.references ?? []).map((r) => ({ key: r.label.en, emoji: r.emoji ?? "•", text: bi(locale, r.label), seconds: r.value, mine: false })),
    { key: "__mine", emoji: "⏱️", text: tr(locale, `${formatNumber(start, locale)} s`, `${formatNumber(start, locale)} 秒`), seconds: start, mine: true },
  ].sort((a, b) => a.seconds - b.seconds);
  return (
    <ul aria-label={tr(locale, `Compared in ${unit}`, `换算成${unit}来比较`)} className="space-y-0.5">
      <li className="text-[10px] text-gray-400">{tr(locale, `in ${unit}:`, `换算成${unit}：`)}</li>
      {rows.map((r) => (
        <li key={r.key} className={`flex items-baseline justify-between gap-1 rounded px-1 ${r.mine ? "bg-fun-yellow/30 font-bold text-gray-800" : "text-gray-600"}`}>
          <span className="truncate">
            {r.emoji} {r.text}
          </span>
          <span className="tabular-nums">{fmtV(secondsIn(rung, r.seconds), locale)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Age line 0..N years with reference ages and (once reached) the target heartbeat. */
function AgeLine({ config, years, show, locale }: { config: ScaleLadderConfig; years: number; show: boolean; locale: SceneLocale }) {
  const refs = config.references ?? [];
  const top = Math.max(60, years * 1.4, ...refs.map((r) => r.value * 1.1));
  const y = (v: number) => 190 - (v / top) * 175;
  return (
    <svg viewBox="0 0 140 200" role="img" aria-label={tr(locale, "Age line in years", "年龄线（岁）")} className="h-full w-full">
      <line x1={30} x2={30} y1={12} y2={190} className="stroke-gray-300" strokeWidth={3} strokeLinecap="round" />
      <text x={30} y={199} textAnchor="middle" className="fill-gray-400 text-[9px]">0</text>
      {refs.map((r) => (
        <g key={r.label.en}>
          <line x1={25} x2={35} y1={y(r.value)} y2={y(r.value)} className="stroke-gray-400" strokeWidth={2} />
          <text x={36} y={y(r.value)} dy="0.35em" className="fill-gray-500 text-[8.5px]">
            {r.emoji ?? ""} {bi(locale, r.label)} ({r.value})
          </text>
        </g>
      ))}
      {show ? (
        <g>
          <circle cx={30} cy={y(years)} r={7} className="fill-fun-red" />
          <text x={40} y={y(years)} dy="0.35em" className="fill-fun-red text-[11px] font-bold">
            ❤️ {tr(locale, `${formatNumber(Math.round(years * 10) / 10, locale)} yrs`, `${formatNumber(Math.round(years * 10) / 10, locale)} 岁`)}
          </text>
        </g>
      ) : (
        <text x={40} y={100} className="fill-gray-300 text-[22px] font-bold">❤️ ?</text>
      )}
    </svg>
  );
}

/** A9: two powers of ten as rows of zeros; add zeros to the smaller one until they match. */
function PowersScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<ScaleLadderConfig>) {
  const a = config.start ?? SCALE_DEFAULTS.powers.start;
  const b = config.target ?? SCALE_DEFAULTS.powers.target ?? 100;
  const small = Math.min(a, b);
  const big = Math.max(a, b);
  const diff = scaleAnswer("powers", a, b);
  const nameA = config.labels?.start ? bi(locale, config.labels.start) : tr(locale, "first number", "第一个数");
  const nameB = config.labels?.target ? bi(locale, config.labels.target) : tr(locale, "second number", "第二个数");
  const [smallName, bigName] = a <= b ? [nameA, nameB] : [nameB, nameA];
  const events = useSceneEvents(onEvent);
  const [added, setAdded] = useState(0);
  const done = useRef(false);
  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const shownAdded = phase === "reveal" ? Math.round(segment(progress, 0, 0.8) * diff) : phase === "hook" ? 0 : added;
  const maxAdd = Math.min(200 - small, diff + 10);

  const change = (v: number) => {
    if (phase !== "explore") return;
    events.interact();
    setAdded(v);
    events.state({ added: v, equal: v === diff });
    if (v === diff && !done.current) {
      done.current = true;
      events.emit("completed", { moves: v, times: `10^${diff}` });
    }
  };

  const label = tr(locale, `${smallName}: 1 with ${small} zeros. ${bigName}: 1 with ${big} zeros. How many times bigger?`, `${smallName}：1 后面 ${small} 个 0；${bigName}：1 后面 ${big} 个 0。大多少倍？`);
  const status = shownAdded === diff ? "equal" : shownAdded < diff ? "less" : "more";
  const message = (() => {
    if (phase === "hook") return tr(locale, "Which is bigger, and by how much?", "哪个大？大多少？");
    if (phase === "reveal") return progress > 0.8 ? tr(locale, `${diff} more zeros = 10^${diff} times bigger: ${powerWords(diff, locale)} times!`, `多 ${diff} 个 0 = 大 10^${diff} 倍：${powerWords(diff, locale)} 倍！`) : tr(locale, "Each extra zero is × 10…", "每多一个 0 就是 × 10……");
    if (added === 0) return tr(locale, `Slide to add zeros to ${smallName}. Each zero means × 10.`, `拖动滑块给「${smallName}」加 0，每个 0 就是 × 10。`);
    if (status === "equal") return tr(locale, `Equal! You multiplied by 10 ${diff} times: × 10^${diff}.`, `一样大了！你乘了 ${diff} 次 10：× 10^${diff}。`);
    return status === "less" ? tr(locale, `× 10^${added}: still smaller.`, `× 10^${added}：还是小。`) : tr(locale, `× 10^${added}: now it's bigger!`, `× 10^${added}：反而更大了！`);
  })();

  const cell = 8;
  const perRow = 10;
  const grid = (count: number, extra: number, x0: number) =>
    Array.from({ length: count + extra }, (_, i) => (
      <text key={i} x={x0 + (i % perRow) * cell} y={30 + Math.floor(i / perRow) * (cell + 1)} className={`text-[8px] font-bold ${i >= count ? "fill-fun-pink" : "fill-gray-500"}`}>
        0
      </text>
    ));
  const rowsH = Math.ceil(Math.max(big, small + maxAdd) / perRow) * (cell + 1) + 34;

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 240 ${Math.max(140, rowsH)}`} role="img" aria-label={label} className="h-full w-full">
          <text x={10} y={12} className="fill-gray-700 text-[10px] font-bold">{smallName}</text>
          <text x={10} y={23} className="fill-gray-500 text-[9px]">1 + {small}{shownAdded ? `+${shownAdded}` : ""} × 0</text>
          {grid(small, shownAdded, 10)}
          <text x={135} y={12} className="fill-gray-700 text-[10px] font-bold">{bigName}</text>
          <text x={135} y={23} className="fill-gray-500 text-[9px]">1 + {big} × 0</text>
          {grid(big, 0, 135)}
        </svg>
      </div>
      {(config.references?.length ?? 0) > 0 && (
        <p className="truncate text-center text-[10px] text-gray-500">
          {config.references!.map((r) => `${r.emoji ?? "•"} ${bi(locale, r.label)}: ${r.value} ${tr(locale, "zeros", "个 0")}`).join(" · ")}
        </p>
      )}
      <SceneMessage>{message}</SceneMessage>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        {phase === "explore" && (
          <label className="flex min-h-[44px] items-center gap-2 text-xs text-gray-600">
            {tr(locale, "add zeros", "加 0")}
            <input type="range" min={0} max={maxAdd} value={added} onChange={(e) => change(Number(e.target.value))} aria-label={tr(locale, "Zeros added to the smaller number", "给较小的数加几个 0")} aria-valuetext={`× 10^${added}`} className="h-11 w-36 accent-fun-pink sm:w-48" />
          </label>
        )}
        <Counter label="×" value={`10^${shownAdded}`} tone={status === "equal" && phase !== "hook" ? "green" : "pink"} />
      </div>
    </SceneFrame>
  );
}

/** 10^k written out with separators (k <= 30), otherwise "10^k". */
function powerWords(k: number, locale: SceneLocale): string {
  if (k > 30) return `10^${k}`;
  return `1${"0".repeat(k)}`.replace(/\B(?=(\d{3})+(?!\d))/g, locale === "zh" ? "," : ",");
}

