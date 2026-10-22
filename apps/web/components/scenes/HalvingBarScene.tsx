"use client";

import { useRef, useState } from "react";
import {
  partialSum,
  partialSumFraction,
  ratioDenominator,
  remainingAfter,
  seriesLimit,
  smallerThan,
  stepsToShrinkBelow,
  type HalvingBarConfig,
  type HalvingDenominator,
  type SceneProps,
} from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 360;
const BAR = { x: 20, y: 52, w: 316, h: 30 };
const ZOOM = { x: 20, y: 122, w: 316, h: 22 };
const REVEAL_MS = 3400;
const FILLS = ["fill-primary-500", "fill-fun-cyan", "fill-fun-purple", "fill-primary-300"];

/** Tiny lengths in human units: 3 significant digits. */
function formatTiny(m: number): string {
  const units: Array<[number, string]> = [[1, "m"], [1e-2, "cm"], [1e-3, "mm"], [1e-6, "µm"], [1e-9, "nm"]];
  for (const [u, name] of units) if (m >= u) return `${Number((m / u).toPrecision(3))} ${name}`;
  return `${(m / 1e-12).toPrecision(3)} pm`;
}

const fracText = (n: number, d: HalvingDenominator, locale: SceneLocale) => {
  const [p, q] = partialSumFraction(n, d);
  return n === 0 ? "0" : `${formatNumber(p, locale)}/${formatNumber(q, locale)}`;
};

/** A10: walk half of what's left, again and again. The pieces add up to exactly 1 (or 1/2 for thirds). */
export default function HalvingBarScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<HalvingBarConfig>) {
  const d: HalvingDenominator = ratioDenominator(config.ratio) ?? 2;
  const { maxSteps } = config;
  const halves = d === 2;
  const limit = seriesLimit(d);
  const events = useSceneEvents(onEvent);
  const [steps, setSteps] = useState(0);
  const done = useRef(false);

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const revealSteps = Math.max(steps, Math.round(segment(progress, 0, 0.6) * maxSteps));
  const full = phase === "reveal" && progress > 0.75;
  const n = phase === "reveal" ? revealSteps : phase === "hook" ? 3 : steps;

  const walk = (k: number) => {
    if (phase !== "explore") return;
    events.interact();
    const next = Math.min(maxSteps, steps + k);
    setSteps(next);
    events.state({ steps: next, sum: partialSum(next, d) });
    if (next === maxSteps && !done.current) {
      done.current = true;
      events.emit("completed", { moves: next, sum: partialSum(next, d) });
    }
  };

  const sum = partialSum(n, d);
  // For thirds, every blue piece has a grey twin of the same size; pieces plus twins leave (1/3)^n.
  const left = halves ? remainingAfter(n, d) : 1 / 3 ** n;
  const tiny = smallerThan(left);
  const xOf = (v: number) => BAR.x + v * BAR.w;

  const pieces: Array<{ x0: number; x1: number; twin: boolean; k: number }> = [];
  let at = 0;
  for (let k = 1; k <= n; k++) {
    const t = 1 / d ** k;
    pieces.push({ x0: at, x1: at + t, twin: false, k });
    at += t;
    if (!halves) {
      pieces.push({ x0: at, x1: at + t, twin: true, k });
      at += t;
    }
  }

  const label = halves ? tr(locale, "1 metre from the wall: walk half of what's left, again and again", "离墙 1 米：每次走剩下的一半") : tr(locale, "1/3 + 1/9 + 1/27 + … : where does it end?", "1/3 + 1/9 + 1/27 + …… 最后是多少？");
  const sumText = full ? (halves ? "1" : "1/2") : `${fracText(n, d, locale)} ≈ ${sum.toFixed(Math.min(8, Math.max(3, n > 10 ? 7 : 3)))}`;
  const terms = n === 0 ? "0" : n <= 4 ? Array.from({ length: n }, (_, i) => `1/${d ** (i + 1)}`).join(" + ") : `1/${d} + 1/${d * d} + … + 1/${formatNumber(d ** n, locale)}`;

  const message = (() => {
    if (phase === "hook") return halves ? tr(locale, "Will you ever reach the wall?", "你能走到墙吗？") : tr(locale, "Keep adding thirds of thirds…", "一直加下去……");
    if (phase === "reveal")
      return full
        ? halves
          ? tr(locale, "1/2 + 1/4 + 1/8 + … = 1 exactly. Every gap gets covered, and nothing sticks out past the wall.", "1/2 + 1/4 + 1/8 + …… 正好等于 1。每一段空隙都被填上，又一点也不会超出墙。")
          : tr(locale, "Each blue piece has a grey twin. Together they fill the bar, so the blue is exactly half: 1/2.", "每块蓝色都有一块一样大的灰色双胞胎，它们一起填满整条，所以蓝色正好是一半：1/2。")
        : tr(locale, "Fast-forward…", "快进……");
    if (steps === 0) return halves ? tr(locale, "Press “Walk half” to walk half of the distance left.", "点「走一半」，走完剩下距离的一半。") : tr(locale, "Each step adds the next third (blue) and its twin (grey).", "每一步加下一块三分之一（蓝），旁边放一块一样大的（灰）。");
    if (!halves) {
      const uncovered = `1/${formatNumber(3 ** steps, locale)}`;
      return tr(locale, `Blue so far: ${fracText(steps, d, locale)}. Each grey twin matches its blue piece; only ${uncovered} of the bar is still empty.`, `蓝色目前：${fracText(steps, d, locale)}。每块灰色都和它的蓝色一样大；整条只剩 ${uncovered} 是空的。`);
    }
    if (steps >= maxSteps) {
      const atom = stepsToShrinkBelow(1e-10, d);
      return tr(
        locale,
        `${maxSteps} steps: ${formatTiny(left)} left${tiny ? `, smaller than ${tiny.en}` : ""}. Below an atom after ${atom} steps. It never runs out!`,
        `${maxSteps} 步：只剩 ${formatTiny(left)}${tiny ? `，比${tiny.zh}还小` : ""}。走 ${atom} 步就比一个原子还小。可它永远不会是 0！`,
      );
    }
    return tr(locale, `Left: ${formatTiny(left)}${tiny ? ` (smaller than ${tiny.en} ${tiny.emoji})` : ""}`, `还剩 ${formatTiny(left)}${tiny ? `（比${tiny.zh}还小 ${tiny.emoji}）` : ""}`);
  })();

  // Zoomed view of what's left: the next piece takes 1/d of it.
  const zoomExp = n;
  const nextShare = 1 / d;

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} 160`} role="img" aria-label={`${label}. ${terms} = ${sumText}`} className="h-full w-full">
          <text x={BAR.x} y={18} className="fill-gray-700 text-[12px] font-bold">
            {terms} = {sumText}
          </text>
          {halves && (
            <g>
              <rect x={BAR.x + BAR.w + 2} y={BAR.y - 26} width={14} height={BAR.h + 32} rx={2} className="fill-amber-700/70" />
              <text x={Math.min(xOf(full ? 1 : sum), BAR.x + BAR.w - 6)} y={BAR.y - 6} textAnchor="middle" className="text-[18px]" style={reducedMotion ? undefined : { transition: "x 300ms" }}>
                🚶
              </text>
            </g>
          )}
          <rect x={BAR.x} y={BAR.y} width={BAR.w} height={BAR.h} rx={4} className="fill-white stroke-gray-300" strokeWidth={1.5} />
          {full ? (
            <g>
              <rect x={BAR.x} y={BAR.y} width={BAR.w * (halves ? 1 : 0.5)} height={BAR.h} rx={4} className="fill-primary-500" />
              {!halves && <rect x={BAR.x + BAR.w / 2} y={BAR.y} width={BAR.w / 2} height={BAR.h} rx={4} className="fill-gray-300" />}
            </g>
          ) : (
            pieces.map((p) => (
              <rect key={`${p.k}${p.twin}`} x={xOf(p.x0)} y={BAR.y} width={Math.max(0.3, (p.x1 - p.x0) * BAR.w)} height={BAR.h} className={p.twin ? "fill-gray-300 stroke-white" : `${FILLS[(p.k - 1) % FILLS.length]} stroke-white`} strokeWidth={0.5} />
            ))
          )}
          {(halves || !full ? pieces.slice(0, halves ? 3 : 4) : []).filter((p) => !p.twin).map((p) => (
            <text key={`l${p.k}`} x={xOf((p.x0 + p.x1) / 2)} y={BAR.y + BAR.h / 2} dy="0.35em" textAnchor="middle" className="fill-white text-[11px] font-bold" style={{ pointerEvents: "none" }}>
              1/{d ** p.k}
            </text>
          ))}
          <text x={BAR.x} y={BAR.y + BAR.h + 22} className="fill-gray-400 text-[9px]">0</text>
          {!halves && (
            // Blue so far, end to end, against the 1/2 mark.
            <g>
              <rect x={BAR.x} y={BAR.y + BAR.h + 4} width={BAR.w} height={6} rx={3} className="fill-gray-100" />
              <rect x={BAR.x} y={BAR.y + BAR.h + 4} width={BAR.w * (full ? limit : sum)} height={6} rx={3} className="fill-primary-500" />
              <line x1={xOf(limit)} x2={xOf(limit)} y1={BAR.y + BAR.h + 1} y2={BAR.y + BAR.h + 13} className="stroke-fun-pink" strokeWidth={1.5} />
              <text x={xOf(limit)} y={BAR.y + BAR.h + 22} textAnchor="middle" className="fill-fun-pink text-[9px] font-bold">1/2</text>
            </g>
          )}
          <text x={BAR.x + BAR.w} y={BAR.y + BAR.h + 22} textAnchor="end" className="fill-gray-400 text-[9px]">{halves ? "1 m" : "1"}</text>

          {!full && phase !== "hook" && (
            <g>
              <text x={ZOOM.x} y={ZOOM.y - 6} className="fill-gray-500 text-[9px]">
                🔍 {tr(locale, `what's left, zoomed × ${formatNumber(d ** zoomExp, locale)}`, `剩下的部分，放大 ${formatNumber(d ** zoomExp, locale)} 倍`)}
              </text>
              <rect x={ZOOM.x} y={ZOOM.y} width={ZOOM.w} height={ZOOM.h} rx={4} className="fill-white stroke-gray-300" strokeDasharray="4 3" strokeWidth={1.5} />
              <rect x={ZOOM.x} y={ZOOM.y} width={ZOOM.w * nextShare} height={ZOOM.h} rx={4} className="fill-primary-200" />
              {!halves && <rect x={ZOOM.x + ZOOM.w * nextShare} y={ZOOM.y} width={ZOOM.w * nextShare} height={ZOOM.h} className="fill-gray-200" />}
              <text x={ZOOM.x + (ZOOM.w * nextShare) / 2} y={ZOOM.y + ZOOM.h / 2} dy="0.35em" textAnchor="middle" className="fill-primary-700 text-[10px] font-bold">
                {tr(locale, "next step", "下一步")}
              </text>
              <text x={ZOOM.x + ZOOM.w - 6} y={ZOOM.y + ZOOM.h / 2} dy="0.35em" textAnchor="end" className="fill-gray-500 text-[10px]">
                {tr(locale, "still left", "还剩")}
              </text>
            </g>
          )}
        </svg>
      </div>
      <SceneMessage>{message}</SceneMessage>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Counter label={tr(locale, "steps", "步数")} value={`${n}/${maxSteps}`} />
        {phase === "explore" && (
          <>
            <SceneButton onClick={() => walk(1)} disabled={steps >= maxSteps}>
              {halves ? tr(locale, "Walk half", "走一半") : tr(locale, "Next third", "下一块")}
            </SceneButton>
            <SceneButton onClick={() => walk(5)} disabled={steps >= maxSteps} variant="accent">
              {tr(locale, "5 more", "再 5 步")}
            </SceneButton>
            <SceneButton
              onClick={() => {
                setSteps(0);
                done.current = false;
              }}
              variant="ghost"
              disabled={steps === 0}
            >
              {tr(locale, "Back to start", "回到起点")}
            </SceneButton>
          </>
        )}
      </div>
    </SceneFrame>
  );
}
