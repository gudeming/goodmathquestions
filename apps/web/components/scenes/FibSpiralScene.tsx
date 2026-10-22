"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GOLDEN_RATIO, fibBounds, fibRatios, fibSquares, sunflowerSeeds, type FibSpiralConfig, type SceneProps } from "@gmq/animation-engine";
import { SceneButton, SceneFrame, SceneMessage, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const VW = 240;
const VH = 160;
const START = 2;
/** The new square shows "?" this long before its number appears. */
const ASK_MS = 700;
const REVEAL_MS = 3800;
const SEEDS = 233;
const FILLS = ["fill-fun-yellow", "fill-fun-orange", "fill-fun-pink", "fill-fun-purple", "fill-primary-300", "fill-fun-cyan", "fill-fun-green"];

/** D8: each new square spans the two before it; the quarter-arcs make a spiral. */
export default function FibSpiralScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<FibSpiralConfig>) {
  const { terms } = config;
  const events = useSceneEvents(onEvent);
  const squares = useMemo(() => fibSquares(terms), [terms]);
  const [count, setCount] = useState(START);
  const [asking, setAsking] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (!asking) return;
    const id = setTimeout(() => setAsking(false), reducedMotion ? 0 : ASK_MS);
    return () => clearTimeout(id);
  }, [asking, reducedMotion]);

  const next = () => {
    if (phase !== "explore" || count >= terms) return;
    events.interact();
    const c = count + 1;
    setCount(c);
    setAsking(true);
    events.state({ squares: c, newest: squares[c - 1].size });
    if (c === terms && !done.current) {
      done.current = true;
      events.emit("completed", { moves: c - START, last: squares[c - 1].size });
    }
  };

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const shownCount = phase === "reveal" ? Math.max(count, Math.round(START + segment(progress, 0, 0.4) * (terms - START))) : phase === "hook" ? 6 : count;
  const shown = squares.slice(0, shownCount);
  const [x0, y0, x1, y1] = fibBounds(shown);
  const panelW = phase === "reveal" ? VW * 0.55 : VW;
  const s = Math.min((panelW - 16) / (x1 - x0), (VH - 16) / (y1 - y0));
  const tx = (panelW - (x1 - x0) * s) / 2 - x0 * s;
  const ty = (VH - (y1 - y0) * s) / 2 - y0 * s;
  const spiral = shown.map((q, i) => `${i === 0 ? `M ${q.arc.start[0]} ${q.arc.start[1]} ` : ""}A ${q.size} ${q.size} 0 0 ${q.arc.sweep} ${q.arc.end[0]} ${q.arc.end[1]}`).join(" ");
  const ratios = fibRatios(shownCount);
  const newest = shown[shown.length - 1];
  const prev = shown.slice(-3, -1).map((q) => q.size);

  const label = tr(locale, "Fibonacci squares and the spiral they make", "斐波那契正方形和它们卷出的螺旋");
  const message = (() => {
    if (phase === "hook") return tr(locale, "1, 1, 2, 3, 5, 8, … ?", "1、1、2、3、5、8……？");
    if (phase === "reveal")
      return progress > 0.5
        ? tr(locale, `Each ratio gets closer to ${GOLDEN_RATIO.toFixed(3)}, the golden ratio. Sunflowers pack their seeds with the same turn: count the spirals and you get Fibonacci numbers.`, `相邻两数的比越来越接近 ${GOLDEN_RATIO.toFixed(3)}（黄金比）。向日葵用同样的角度排种子：数一数螺旋，又是斐波那契数。`)
        : tr(locale, "Square after square…", "一个接一个的正方形……");
    if (count === START) return tr(locale, "Press “Next square”: the new square sits along the long side.", "点「下一个」：新正方形贴着长边放。");
    if (asking && prev.length === 2) return tr(locale, `How big is the new square? It spans ${prev[0]} + ${prev[1]}…`, `新正方形有多大？它横跨 ${prev[0]} + ${prev[1]}……`);
    return prev.length === 2 ? `${prev[0]} + ${prev[1]} = ${newest.size}` : "";
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <svg viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={tr(locale, `${shownCount} squares: ${shown.map((q) => q.size).join(", ")}`, `${shownCount} 个正方形：${shown.map((q) => q.size).join("、")}`)} className="h-full min-w-0 flex-1">
          <g style={{ transform: `translate(${tx}px, ${ty}px) scale(${s})`, transition: reducedMotion ? undefined : "transform 450ms ease-out" }}>
            {shown.map((q, i) => {
              const hidden = asking && i === shown.length - 1 && phase === "explore";
              return (
                <g key={i}>
                  <rect x={q.x} y={q.y} width={q.size} height={q.size} className={`${FILLS[i % FILLS.length]} stroke-white`} fillOpacity={0.55} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                  {q.size * s >= 12 && (
                    <text x={q.x + q.size / 2} y={q.y + q.size / 2} dy="0.35em" textAnchor="middle" fontSize={q.size * 0.38} className="fill-gray-800 font-bold">
                      {hidden ? "?" : q.size}
                    </text>
                  )}
                </g>
              );
            })}
            <path d={spiral} fill="none" className="stroke-fun-red" strokeWidth={2} vectorEffect="non-scaling-stroke" opacity={phase === "reveal" ? 1 : 0.85} />
          </g>
          {phase === "reveal" && <Sunflower x={VW * 0.55} progress={progress} />}
        </svg>
        {phase !== "reveal" && <RatioTable sizes={shown.map((q) => q.size)} ratios={ratios} locale={locale} />}
      </div>
      {phase === "reveal" && <RatioLine ratios={fibRatios(terms)} progress={progress} locale={locale} />}
      <SceneMessage>{message}</SceneMessage>
      {phase === "explore" && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <SceneButton onClick={next} disabled={count >= terms}>
            {tr(locale, "Next square", "下一个")}
          </SceneButton>
          <SceneButton
            onClick={() => {
              setCount(START);
              setAsking(false);
            }}
            variant="ghost"
            disabled={count === START}
          >
            {tr(locale, "Start over", "重来")}
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

/** Vogel's sunflower: seed k at k × 137.5°, coloured by k mod 13 so the 13 spiral arms show. */
function Sunflower({ x, progress }: { x: number; progress: number }) {
  const seeds = useMemo(() => sunflowerSeeds(SEEDS), []);
  const r = Math.min(52, (VW - x) / 2 - 4);
  const cx = x + (VW - x) / 2;
  const cy = VH / 2;
  const visible = Math.round(segment(progress, 0.35, 0.8) * SEEDS);
  return (
    <g aria-hidden>
      <circle cx={cx} cy={cy} r={r + 6} className="fill-fun-yellow/60" opacity={segment(progress, 0.3, 0.4)} />
      {seeds.slice(0, visible).map(([sx, sy], k) => (
        <circle key={k} cx={cx + sx * r} cy={cy + sy * r} r={1.7} className={k % 13 === 0 ? "fill-fun-red" : k % 2 ? "fill-amber-800" : "fill-amber-900"} />
      ))}
    </g>
  );
}

function RatioTable({ sizes, ratios, locale }: { sizes: number[]; ratios: number[]; locale: SceneLocale }) {
  const rows = sizes.map((v, i) => ({ v, r: i > 0 ? ratios[i - 1] : null })).slice(-7);
  return (
    <table className="w-[30%] shrink-0 self-center text-center text-[10px] tabular-nums sm:text-xs" aria-label={tr(locale, "Each number divided by the one before", "每个数除以前一个数")}>
      <thead className="text-gray-500">
        <tr>
          <th className="font-normal">n</th>
          <th className="font-normal">÷ {tr(locale, "prev", "前一个")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ v, r }, i) => (
          <tr key={`${v}-${i}`} className={i === rows.length - 1 ? "font-bold text-gray-800" : "text-gray-600"}>
            <td>{v}</td>
            <td>{r === null ? "—" : r.toFixed(3)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RatioLine({ ratios, progress, locale }: { ratios: number[]; progress: number; locale: SceneLocale }) {
  const W = 300;
  const H = 34;
  const x = (i: number) => 10 + (i / Math.max(1, ratios.length - 1)) * (W - 40);
  const y = (v: number) => 4 + ((2.05 - Math.min(2.05, v)) / 1.1) * (H - 8);
  const upto = Math.max(1, Math.round(segment(progress, 0.4, 0.9) * ratios.length));
  const d = ratios.slice(0, upto).map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr(locale, "Ratios approach 1.618", "比值接近 1.618")} className="h-[34px] w-full shrink-0">
      <line x1={10} x2={W - 30} y1={y(GOLDEN_RATIO)} y2={y(GOLDEN_RATIO)} className="stroke-fun-pink" strokeWidth={1} strokeDasharray="4 3" />
      <text x={W - 28} y={y(GOLDEN_RATIO)} dy="0.35em" className="fill-fun-pink text-[9px] font-bold">1.618</text>
      <path d={d} fill="none" className="stroke-fun-purple" strokeWidth={2} />
    </svg>
  );
}
