"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collatzPath, collatzPeak, collatzSteps, longestCollatz, type CollatzPathConfig, type SceneProps } from "@gmq/animation-engine";
import { SceneButton, SceneFrame, SceneMessage, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const REVEAL_MS = 3200;
/** Drawing a path takes at most this long, whatever its length. */
const DRAW_MS = 2400;
const HOOK_START = 6;
const HOOK_PATH = collatzPath(HOOK_START);

/** D5: even → halve, odd → 3n + 1. Watch the hailstone fall to 1. */
export default function CollatzPathScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<CollatzPathConfig>) {
  const { maxStart } = config;
  const [lo, hi] = config.highlightRange;
  const events = useSceneEvents(onEvent);
  const [input, setInput] = useState("");
  const [start, setStart] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(0);
  const [tried, setTried] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [runKey, setRunKey] = useState(0);
  const proposed = useRef(false);

  const explorePath = useMemo(() => collatzPath(start ?? HOOK_START), [start]);
  const path = phase === "hook" ? HOOK_PATH : explorePath;

  // Step-by-step drawing.
  useEffect(() => {
    if (start === null) return;
    if (reducedMotion) {
      setDrawn(explorePath.length);
      return;
    }
    setDrawn(1);
    const len = explorePath.length;
    const every = Math.max(12, Math.min(120, DRAW_MS / len));
    const id = setInterval(() => setDrawn((d) => (d >= len ? d : d + 1)), every);
    return () => clearInterval(id);
  }, [start, explorePath, reducedMotion, runKey]);

  const go = (n: number) => {
    if (phase !== "explore") return;
    events.interact();
    if (!Number.isInteger(n) || n < 1 || n > maxStart) {
      setError(tr(locale, `Pick a whole number from 1 to ${maxStart}.`, `请输入 1 到 ${maxStart} 的整数。`));
      return;
    }
    setError("");
    setStart(n);
    setRunKey((k) => k + 1);
    const next = tried.includes(n) ? tried : [...tried, n].sort((a, b) => a - b);
    setTried(next);
    events.state({ start: n, steps: collatzSteps(n), peak: collatzPeak(n), tried: next.length });
    const covered = next.filter((t) => t >= lo && t <= hi).length === hi - lo + 1;
    if (covered && !proposed.current) {
      proposed.current = true;
      const best = longestCollatz(lo, hi);
      events.emit("completed", { moves: next.length, longest: best });
      onProposeAnswer?.(String(best));
    }
  };

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const best = longestCollatz(lo, hi);
  const fmt = (v: number) => formatNumber(v, locale);
  const label = tr(locale, "Even: halve it. Odd: times 3, plus 1. Does every number reach 1?", "偶数除以 2，奇数乘 3 加 1。每个数都会到 1 吗？");
  const shownPath = phase === "explore" && start !== null ? path.slice(0, Math.max(1, drawn)) : path;
  const finished = start !== null && drawn >= path.length;

  const message = (() => {
    if (phase === "hook") return path.join(" → ");
    if (phase === "reveal")
      return progress > 0.7
        ? tr(locale, `${best} takes ${collatzSteps(best)} steps, the most from ${lo} to ${hi}. 27 takes 111 steps and climbs to 9,232! Every number tried so far reaches 1, but nobody has proved they all do.`, `从 ${lo} 到 ${hi}，${best} 要走 ${collatzSteps(best)} 步，最多。27 要走 111 步，还冲到 9,232！试过的数都回到了 1，但没人能证明所有数都会。`)
        : tr(locale, `Steps for every start from ${lo} to ${hi}…`, `${lo} 到 ${hi} 每个起点的步数……`);
    if (error) return error;
    if (start === null) return tr(locale, `Type a start (1–${maxStart}) and press Go.`, `输入一个起点（1–${maxStart}），点「出发」。`);
    if (!finished) return shownPath.slice(-6).map(fmt).join(" → ");
    return tr(locale, `${start} reached 1 in ${collatzSteps(start)} steps, peaking at ${fmt(collatzPeak(start))}.`, `${start} 走了 ${collatzSteps(start)} 步到 1，最高到 ${fmt(collatzPeak(start))}。`);
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="min-h-0 min-w-0 flex-1">{phase === "reveal" ? <StepBars lo={lo} hi={hi} best={best} progress={progress} locale={locale} /> : <Hailstone path={shownPath} full={path} locale={locale} />}</div>
        <TriedTable tried={tried} current={start} locale={locale} />
      </div>
      <SceneMessage>{message}</SceneMessage>
      {phase === "explore" && (
        <form
          className="mt-1 flex flex-wrap items-center justify-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            go(Number(input));
          }}
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={maxStart}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label={tr(locale, "Starting number", "起点")}
            placeholder={`1–${maxStart}`}
            className="h-11 w-20 rounded-full border border-gray-200 bg-white px-3 text-center font-bold tabular-nums focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-yellow"
          />
          <SceneButton onClick={() => go(Number(input))}>{tr(locale, "Go", "出发")}</SceneButton>
          <SceneButton
            onClick={() => {
              const next = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).find((n) => !tried.includes(n));
              if (next !== undefined) {
                setInput(String(next));
                go(next);
              }
            }}
            variant="ghost"
            disabled={tried.filter((t) => t >= lo && t <= hi).length === hi - lo + 1}
          >
            {tr(locale, "Next untried", "下一个没试的")}
          </SceneButton>
        </form>
      )}
    </SceneFrame>
  );
}

/** Line chart of the path so far, scaled to the whole path so the picture doesn't jump. */
function Hailstone({ path, full, locale }: { path: number[]; full: number[]; locale: SceneLocale }) {
  const W = 240;
  const H = 150;
  const peak = Math.max(...full);
  const x = (i: number) => 32 + (i / Math.max(1, full.length - 1)) * (W - 40);
  const y = (v: number) => H - 14 - (v / peak) * (H - 30);
  const pts = path.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const head = path.length - 1;
  const peakIdx = full.indexOf(peak);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr(locale, `Path from ${full[0]}: ${full.length - 1} steps`, `从 ${full[0]} 出发：${full.length - 1} 步`)} className="h-full w-full">
      <line x1={32} x2={W - 8} y1={H - 14} y2={H - 14} className="stroke-gray-300" strokeWidth={1.5} />
      <line x1={32} x2={32} y1={10} y2={H - 14} className="stroke-gray-300" strokeWidth={1.5} />
      <text x={29} y={y(peak)} dy="0.35em" textAnchor="end" className="fill-gray-400 text-[8px]">{peak.toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</text>
      <text x={W - 8} y={H - 3} textAnchor="end" className="fill-gray-400 text-[8px]">{tr(locale, "steps →", "步数 →")}</text>
      <polyline points={pts} fill="none" className="stroke-primary-500" strokeWidth={2} strokeLinejoin="round" />
      {head >= peakIdx && <circle cx={x(peakIdx)} cy={y(peak)} r={3.5} className="fill-fun-orange" />}
      <circle cx={x(head)} cy={y(path[head])} r={4.5} className={path[head] === 1 ? "fill-fun-green" : "fill-fun-pink"} />
      <text x={Math.min(W - 30, x(head) + 6)} y={Math.max(14, y(path[head]) - 6)} className="fill-gray-700 text-[10px] font-bold">{path[head]}</text>
    </svg>
  );
}

function TriedTable({ tried, current, locale }: { tried: number[]; current: number | null; locale: SceneLocale }) {
  return (
    <div className="w-[34%] shrink-0 overflow-y-auto text-[10px] sm:text-xs">
      <table className="w-full text-center tabular-nums" aria-label={tr(locale, "Starts tried", "试过的起点")}>
        <thead className="sticky top-0 bg-primary-50 text-gray-500">
          <tr>
            <th className="font-normal">{tr(locale, "start", "起点")}</th>
            <th className="font-normal">{tr(locale, "steps", "步数")}</th>
            <th className="font-normal">{tr(locale, "peak", "最高")}</th>
          </tr>
        </thead>
        <tbody>
          {tried.map((n) => (
            <tr key={n} className={n === current ? "bg-fun-yellow/30 font-bold text-gray-800" : "text-gray-600"}>
              <td>{n}</td>
              <td>{collatzSteps(n)}</td>
              <td>{collatzPeak(n).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Reveal: steps for each start in [lo, hi]; the longest lit. */
function StepBars({ lo, hi, best, progress, locale }: { lo: number; hi: number; best: number; progress: number; locale: SceneLocale }) {
  const starts = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  const steps = starts.map(collatzSteps);
  const top = Math.max(1, ...steps);
  const W = 240;
  const H = 150;
  const slot = (W - 20) / starts.length;
  const grow = segment(progress, 0, 0.7);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr(locale, `${best} takes the most steps`, `${best} 步数最多`)} className="h-full w-full">
      <line x1={10} x2={W - 10} y1={H - 16} y2={H - 16} className="stroke-gray-300" strokeWidth={1.5} />
      {starts.map((n, i) => {
        const h = (steps[i] / top) * (H - 40) * grow;
        return (
          <g key={n}>
            <rect x={10 + i * slot + slot * 0.15} y={H - 16 - h} width={slot * 0.7} height={h} rx={3} className={n === best ? "fill-fun-pink" : "fill-primary-300"} />
            <text x={10 + (i + 0.5) * slot} y={H - 4} textAnchor="middle" className="fill-gray-500 text-[9px]">{n}</text>
            {grow > 0.95 && (
              <text x={10 + (i + 0.5) * slot} y={H - 20 - h} textAnchor="middle" className="fill-gray-700 text-[8px] font-bold">{steps[i]}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
