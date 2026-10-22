"use client";

import { motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState, type PointerEvent } from "react";
import type { GaussPairingConfig, SceneProps } from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, SceneSvg, focusSibling, formatNumber, tr } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { easeInOut, segment, useRevealProgress } from "./useRevealProgress";

type Pair = { a: number; b: number };

/** Cap for the expanded number list and the reveal grid (n can be up to 1000). */
const EXPANDED_CAP = 100;
const REVEAL_CAP = 50;
const REVEAL_COLS = 10;
const REVEAL_MS = 4200;

/** A1: pair 1..n from both ends; every end-pair makes n + 1. */
export default function GaussPairingScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<GaussPairingConfig>) {
  const { n, visibleHead, visibleTail, pairSum, pairCount } = config;
  const events = useSceneEvents(onEvent);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const completedRef = useRef(false);
  const dragFrom = useRef<number | null>(null);
  const suppressClick = useRef(false);

  const remaining = useMemo(() => {
    const used = new Set<number>();
    for (const p of pairs) used.add(p.a).add(p.b);
    const out: number[] = [];
    for (let i = 1; i <= n; i++) if (!used.has(i)) out.push(i);
    return out;
  }, [pairs, n]);

  const visible = useMemo(() => {
    const cap = expanded ? EXPANDED_CAP / 2 : 0;
    const head = expanded ? cap : visibleHead;
    const tail = expanded ? cap : visibleTail;
    if (remaining.length <= head + tail) return { head: remaining, hidden: 0, tail: [] as number[] };
    return { head: remaining.slice(0, head), hidden: remaining.length - head - tail, tail: remaining.slice(-tail) };
  }, [remaining, expanded, visibleHead, visibleTail]);

  const interactive = phase === "explore";

  const commit = useCallback(
    (next: Pair[]) => {
      setPairs(next);
      const uniformSum = next.every((p) => p.a + p.b === pairSum);
      events.state({ pairs: next.length, uniformSum });
      if (next.length === pairCount) {
        if (uniformSum && !completedRef.current) {
          completedRef.current = true;
          events.emit("completed", { moves: next.length });
          onProposeAnswer?.(String(pairSum * pairCount));
          setMessage(tr(locale, `${pairCount} pairs, all ${pairSum}!`, `${pairCount} 对，每对都是 ${pairSum}！`));
        } else if (!uniformSum) {
          setMessage(tr(locale, "All paired, but the pairs aren't all the same. Try pairing from the ends.", "都配完了，但每对不一样大。试试从两头配？"));
        }
      }
    },
    [events, locale, onProposeAnswer, pairCount, pairSum],
  );

  const pairUp = useCallback(
    (a: number, b: number) => {
      if (a === b) return;
      events.interact();
      setSelected(null);
      const sum = a + b;
      setMessage(sum === pairSum ? tr(locale, `${a} + ${b} = ${sum}`, `${a} + ${b} = ${sum}`) : tr(locale, `${a} + ${b} = ${sum}. Hmm, different from the others?`, `${a} + ${b} = ${sum}。和别的对一样吗？`));
      commit([...pairs, { a: Math.min(a, b), b: Math.max(a, b) }]);
    },
    [commit, events, locale, pairSum, pairs],
  );

  const tap = (v: number) => {
    if (!interactive) return;
    if (selected === null) {
      events.interact();
      setSelected(v);
    } else if (selected === v) setSelected(null);
    else pairUp(selected, v);
  };

  const autoPairOne = () => {
    if (remaining.length < 2) return;
    pairUp(remaining[0], remaining[remaining.length - 1]);
  };

  const pairRest = () => {
    events.interact();
    const next = [...pairs];
    for (let i = 0, j = remaining.length - 1; i < j; i++, j--) next.push({ a: remaining[i], b: remaining[j] });
    setSelected(null);
    commit(next);
  };

  const reset = () => {
    setPairs([]);
    setSelected(null);
    setMessage("");
    completedRef.current = false;
  };

  // Drag a number onto another: pointer capture keeps the gesture on the source token.
  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, v: number) => {
    if (!interactive) return;
    dragFrom.current = v;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from === null) return;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-gauss]");
    const to = target ? Number(target.dataset.gauss) : NaN;
    if (Number.isFinite(to) && to !== from) {
      e.preventDefault();
      suppressClick.current = true;
      pairUp(from, to);
    }
  };

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const label = tr(locale, `Numbers 1 to ${n}: pair them up`, `1 到 ${n}：两两配对`);

  if (phase === "hook") return <GaussPoster n={n} pairSum={pairSum} label={label} />;
  if (phase === "reveal") return <GaussReveal n={n} pairSum={pairSum} pairCount={pairCount} progress={progress} reducedMotion={reducedMotion} label={label} locale={locale} />;

  const lastPairs = pairs.slice(-12);
  const uniform = pairs.length > 0 && pairs.every((p) => p.a + p.b === pairSum);
  const token = (v: number) => (
    <button
      key={v}
      type="button"
      data-gauss={v}
      aria-pressed={selected === v}
      aria-label={tr(locale, `Number ${v}`, `数字 ${v}`)}
      onPointerDown={(e) => onPointerDown(e, v)}
      onPointerUp={onPointerUp}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        tap(v);
      }}
      className={`gauss-token h-11 min-w-[44px] touch-none rounded-xl border-2 px-1 text-sm font-bold tabular-nums transition focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-yellow ${selected === v ? "border-fun-purple bg-fun-purple text-white" : "border-primary-200 bg-white text-primary-700 hover:border-fun-purple"}`}
    >
      {v}
    </button>
  );

  return (
    <SceneFrame label={label}>
      <div className={`flex flex-wrap content-start justify-center gap-1 ${expanded ? "max-h-[45%] overflow-y-auto" : ""}`} onKeyDown={(e) => focusSibling(e, ".gauss-token")}>
        {visible.head.map(token)}
        {visible.hidden > 0 && (
          <button type="button" onClick={() => setExpanded((x) => !x)} className="h-11 min-w-[44px] rounded-xl px-2 text-xs text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-yellow" aria-expanded={expanded}>
            … {tr(locale, `${visible.hidden} more`, `还有 ${visible.hidden} 个`)} …
          </button>
        )}
        {visible.tail.map(token)}
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-wrap content-start justify-center gap-1 overflow-hidden" aria-label={tr(locale, "Pairs made", "已配好的对")}>
        {lastPairs.map((p) => (
          <motion.span
            key={`${p.a}-${p.b}`}
            initial={reducedMotion ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: reducedMotion ? 0.2 : 0.3 }}
            className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-bold ${p.a + p.b === pairSum ? "bg-fun-green/25 text-green-700" : "bg-fun-yellow/30 text-amber-700"}`}
          >
            <span className="font-normal opacity-70">
              {p.a}+{p.b}
            </span>
            {p.a + p.b}
          </motion.span>
        ))}
      </div>

      <SceneMessage>{message || tr(locale, "Tap two numbers (or drag one onto another) to pair them.", "点两个数（或把一个拖到另一个上）把它们配成一对。")}</SceneMessage>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Counter label={tr(locale, "pairs", "对数")} value={`${pairs.length}/${pairCount}`} tone={uniform ? "green" : "primary"} />
        {remaining.length >= 2 && (
          <SceneButton onClick={autoPairOne}>
            {tr(locale, `Pair ${remaining[0]} + ${remaining[remaining.length - 1]}`, `配 ${remaining[0]} + ${remaining[remaining.length - 1]}`)}
          </SceneButton>
        )}
        {pairs.length >= 3 && remaining.length >= 2 && (
          <SceneButton onClick={pairRest} variant="accent">
            {tr(locale, "Pair the rest from the ends", "剩下的从两头配完")}
          </SceneButton>
        )}
        <SceneButton onClick={reset} variant="ghost" disabled={pairs.length === 0}>
          {tr(locale, "Reset", "重来")}
        </SceneButton>
      </div>
    </SceneFrame>
  );
}

function GaussPoster({ n, pairSum, label }: { n: number; pairSum: number; label: string }) {
  const nums = [1, 2, 3, n - 2, n - 1, n];
  const x = (i: number) => 40 + i * 64 + (i >= 3 ? 40 : 0);
  return (
    <SceneFrame label={label} inert>
      <SceneSvg viewBox="0 0 440 220" label={label}>
        <path d={`M ${x(0)} 120 Q ${(x(0) + x(5)) / 2} 10 ${x(5)} 120`} fill="none" className="stroke-fun-pink" strokeWidth={4} />
        <path d={`M ${x(1)} 120 Q ${(x(1) + x(4)) / 2} 50 ${x(4)} 120`} fill="none" className="stroke-fun-purple" strokeWidth={3} strokeDasharray="6 5" />
        <text x={(x(0) + x(5)) / 2} y={58} textAnchor="middle" className="fill-fun-pink text-[22px] font-bold">
          {pairSum}
        </text>
        <text x={(x(1) + x(4)) / 2} y={92} textAnchor="middle" className="fill-fun-purple text-[18px] font-bold">
          ?
        </text>
        {nums.map((v, i) => (
          <g key={v} transform={`translate(${x(i)},140)`}>
            <rect x={-24} y={-20} width={48} height={40} rx={12} className="fill-white stroke-primary-300" strokeWidth={2} />
            <text textAnchor="middle" dy="0.35em" className="fill-primary-700 text-[16px] font-bold">
              {v}
            </text>
          </g>
        ))}
        <text x={(x(2) + x(3)) / 2} y={146} textAnchor="middle" className="fill-gray-400 text-[20px]">
          …
        </text>
      </SceneSvg>
    </SceneFrame>
  );
}

function GaussReveal({ n, pairSum, pairCount, progress, reducedMotion, label, locale }: { n: number; pairSum: number; pairCount: number; progress: number; reducedMotion: boolean; label: string; locale: "en" | "zh" }) {
  const shown = Math.min(pairCount, REVEAL_CAP);
  const rows = Math.ceil(shown / REVEAL_COLS);
  const W = 600;
  const slotW = 54;
  const slotH = Math.min(34, 200 / rows);
  const gridX = (W - REVEAL_COLS * slotW) / 2;
  const gridY = 60;
  const final = segment(progress, 0.85, 1);
  return (
    <SceneFrame label={label}>
      <motion.div className="min-h-0 flex-1" initial={reducedMotion ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        <SceneSvg viewBox={`0 0 ${W} ${gridY + rows * slotH + 20}`} label={label}>
          {Array.from({ length: shown }, (_, i) => {
            const t = easeInOut(segment(progress, (i / shown) * 0.7, (i / shown) * 0.7 + 0.15));
            const cx = gridX + (i % REVEAL_COLS) * slotW + slotW / 2;
            const cy = gridY + Math.floor(i / REVEAL_COLS) * slotH + slotH / 2;
            const lx = 12 + (cx - slotW / 4 - 12) * t;
            const rx = W - 12 - (W - 12 - (cx + slotW / 4)) * t;
            const merged = t >= 1;
            return (
              <g key={i}>
                {merged ? (
                  <>
                    <rect x={cx - slotW / 2 + 3} y={cy - slotH / 2 + 3} width={slotW - 6} height={slotH - 6} rx={(slotH - 6) / 2} className="fill-fun-green/80" />
                    <text x={cx} y={cy} textAnchor="middle" dy="0.35em" className="fill-white text-[12px] font-bold">
                      {pairSum}
                    </text>
                  </>
                ) : (
                  t > 0 && (
                    <>
                      <text x={lx} y={cy} textAnchor="middle" dy="0.35em" className="fill-primary-600 text-[11px] font-bold">
                        {i + 1}
                      </text>
                      <text x={rx} y={cy} textAnchor="middle" dy="0.35em" className="fill-fun-pink text-[11px] font-bold">
                        {n - i}
                      </text>
                    </>
                  )
                )}
              </g>
            );
          })}
          <text x={W / 2} y={34} textAnchor="middle" className="fill-gray-800 text-[26px] font-bold" opacity={final}>
            {pairCount} × {pairSum} = {formatNumber(pairCount * pairSum, locale)}
          </text>
        </SceneSvg>
      </motion.div>
      <SceneMessage>
        {pairCount > REVEAL_CAP
          ? tr(locale, `Showing ${REVEAL_CAP} of ${pairCount} pairs. Every one is ${pairSum}.`, `显示 ${pairCount} 对中的 ${REVEAL_CAP} 对，每一对都是 ${pairSum}。`)
          : tr(locale, `Every end-pair adds up to ${pairSum}.`, `两头配的每一对都是 ${pairSum}。`)}
      </SceneMessage>
    </SceneFrame>
  );
}
