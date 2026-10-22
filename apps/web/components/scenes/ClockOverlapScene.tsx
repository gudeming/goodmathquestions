"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { crossedOverlaps, formatClock, handAngles, minutesForDrag, overlapTimes, type ClockOverlapConfig, type SceneProps } from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const C = 100;
const R = 84;
const REVEAL_MS = 5000;
/** On release, a hand within this many minutes of an overlap snaps onto it. */
const SNAP_MIN = 1;

const polar = (deg: number, r: number) => [C + r * Math.sin((deg * Math.PI) / 180), C - r * Math.cos((deg * Math.PI) / 180)] as const;

/** B8: drag the minute hand around the day; the hour hand follows; every overlap dings. */
export default function ClockOverlapScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<ClockOverlapConfig>) {
  const span = config.hours * 60;
  const times = useMemo(() => overlapTimes(config.hours), [config.hours]);
  const events = useSceneEvents(onEvent);
  const [t, setTState] = useState(0);
  // 12:00 midnight is given in the question.
  const [found, setFoundState] = useState<number[]>([0]);
  // Pointer moves can arrive faster than renders: handlers read the latest values from refs.
  const tRef = useRef(0);
  const foundRef = useRef<number[]>([0]);
  const setT = (v: number) => {
    tRef.current = v;
    setTState(v);
  };
  const setFound = (v: number[]) => {
    foundRef.current = v;
    setFoundState(v);
  };
  const [ding, setDing] = useState<{ key: number; at: number } | null>(null);
  const prevAngle = useRef<number | null>(null);
  const done = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const shownT = phase === "reveal" ? segment(progress, 0, 0.85) * (span - 0.01) : phase === "hook" ? 0 : t;
  const { minute, hour } = handAngles(shownT);

  const moveTo = (raw: number) => {
    if (phase !== "explore") return;
    events.interact();
    const next = Math.max(0, Math.min(span - 0.01, raw));
    const hits = crossedOverlaps(tRef.current, next, times).filter((i) => !foundRef.current.includes(i));
    setT(next);
    if (hits.length) {
      const all = [...foundRef.current, ...hits].sort((a, b) => a - b);
      setFound(all);
      setDing({ key: Date.now(), at: hits[hits.length - 1] });
      events.state({ found: all.length, time: Math.round(next) });
      if (all.length === times.length && !done.current) {
        done.current = true;
        events.emit("completed", { moves: all.length });
        onProposeAnswer?.(String(times.length));
      }
    }
  };

  const angleOf = (e: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM?.();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return ((Math.atan2(p.x - C, -(p.y - C)) * 180) / Math.PI + 360) % 360;
  };
  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (phase !== "explore") return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    prevAngle.current = handAngles(tRef.current).minute;
    onPointerMove(e);
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (prevAngle.current === null) return;
    const a = angleOf(e);
    if (a === null) return;
    moveTo(tRef.current + minutesForDrag(prevAngle.current, a));
    prevAngle.current = a;
  };
  const onUp = () => {
    if (prevAngle.current === null) return;
    prevAngle.current = null;
    const near = times.find((x) => Math.abs(x - tRef.current) < SNAP_MIN);
    if (near !== undefined) moveTo(near);
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.shiftKey ? 10 : 1;
    const d: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: 60, PageDown: -60 };
    if (d[e.key] === undefined) return;
    e.preventDefault();
    moveTo(tRef.current + d[e.key]);
  };

  const label = tr(locale, `A clock: how many times do the hands overlap in ${config.hours} hours?`, `钟面：${config.hours} 小时里时针和分针重合几次？`);
  const pm = shownT >= 720;
  const revealFound = phase === "reveal" ? times.filter((x) => x <= shownT + 1e-6 || progress > 0.85) : [];
  const shownFound = phase === "reveal" ? revealFound.map((_, i) => i) : found;

  const message = (() => {
    if (phase === "hook") return tr(locale, "12 o'clock: the hands are together. How many more times today?", "12 点整，两针重合。今天还会重合几次？");
    if (phase === "reveal")
      return progress > 0.85
        ? tr(locale, `The minute hand catches the hour hand every 1 h 5 min 27 s: 11 times in 12 hours (the 11 o'clock catch-up lands exactly on 12). ${config.hours === 24 ? "2 × 11 = 22." : ""}`, `分针每 1 小时 5 分 27 秒追上时针一次：12 小时只有 11 次（11 点那次正好到 12 点才追上）。${config.hours === 24 ? "2 × 11 = 22。" : ""}`)
        : formatClock(shownT, locale, false);
    if (ding && phase === "explore") return `🔔 ${tr(locale, "Ding!", "叮！")} ${formatClock(times[ding.at], locale)}`;
    return tr(locale, "Drag the minute hand round and round. (Keys: arrows, Shift = 10 min.)", "拖着分针一圈圈转。（键盘：方向键，Shift = 10 分钟）");
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <svg
          ref={svgRef}
          viewBox="0 0 200 200"
          role={phase === "explore" ? "slider" : "img"}
          aria-label={label}
          aria-valuetext={formatClock(shownT, locale, false)}
          tabIndex={phase === "explore" ? 0 : -1}
          className={`h-full min-w-0 flex-1 touch-none rounded-full outline-none focus-visible:ring-4 focus-visible:ring-fun-yellow ${phase === "explore" ? "cursor-grab" : ""}`}
          onPointerDown={onDown}
          onPointerMove={onPointerMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <circle cx={C} cy={C} r={R + 8} className={pm ? "fill-indigo-100 stroke-indigo-300" : "fill-white stroke-primary-200"} strokeWidth={4} />
          {Array.from({ length: 60 }, (_, i) => {
            const [x1, y1] = polar(i * 6, R);
            const [x2, y2] = polar(i * 6, i % 5 === 0 ? R - 8 : R - 3);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-gray-400" strokeWidth={i % 5 === 0 ? 2 : 1} />;
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const [x, y] = polar((i + 1) * 30, R - 19);
            return (
              <text key={i} x={x} y={y} dy="0.35em" textAnchor="middle" className="fill-gray-700 text-[13px] font-bold">
                {i + 1}
              </text>
            );
          })}
          <text x={C} y={C + 34} textAnchor="middle" className="fill-gray-500 text-[11px]">
            {pm ? "🌙" : "☀️"} {formatClock(shownT, locale, false)}
          </text>
          <line x1={C} y1={C} x2={polar(hour, R * 0.5)[0]} y2={polar(hour, R * 0.5)[1]} className="stroke-gray-800" strokeWidth={7} strokeLinecap="round" />
          <line x1={C} y1={C} x2={polar(minute, R * 0.82)[0]} y2={polar(minute, R * 0.82)[1]} className="stroke-fun-pink" strokeWidth={4} strokeLinecap="round" />
          <circle cx={polar(minute, R * 0.82)[0]} cy={polar(minute, R * 0.82)[1]} r={7} className="fill-fun-pink" />
          <circle cx={C} cy={C} r={5} className="fill-gray-800" />
          {ding && phase === "explore" && (
            <text key={ding.key} x={C} y={C - 30} textAnchor="middle" className="animate-pop text-[22px]">
              🔔
            </text>
          )}
        </svg>
        <FoundList found={shownFound} times={times} locale={locale} />
      </div>
      <DayStrip times={times} found={shownFound} span={span} now={phase === "hook" ? null : shownT} locale={locale} />
      <SceneMessage>{message}</SceneMessage>
      {phase === "explore" && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <SceneButton onClick={() => moveTo(t - 1)} variant="ghost" ariaLabel={tr(locale, "Back one minute", "后退 1 分钟")}>
            ⟲ 1′
          </SceneButton>
          <SceneButton onClick={() => moveTo(t + 1)} variant="ghost" ariaLabel={tr(locale, "Forward one minute", "前进 1 分钟")}>
            ⟳ 1′
          </SceneButton>
          <Counter label={tr(locale, "found", "找到")} value={found.length} tone={found.length === times.length ? "green" : "pink"} />
        </div>
      )}
    </SceneFrame>
  );
}

function FoundList({ found, times, locale }: { found: number[]; times: number[]; locale: SceneLocale }) {
  return (
    <ol aria-label={tr(locale, "Overlaps found", "找到的重合时刻")} className="w-[34%] shrink-0 overflow-y-auto pr-1 text-[10px] tabular-nums text-gray-600 sm:text-xs">
      {found.map((i) => (
        <li key={i} className="truncate">
          🔔 {formatClock(times[i], locale)}
        </li>
      ))}
    </ol>
  );
}

/** 24-hour strip: a dot for each overlap found (all of them in the reveal). */
function DayStrip({ times, found, span, now, locale }: { times: number[]; found: number[]; span: number; now: number | null; locale: SceneLocale }) {
  const W = 300;
  const x = (m: number) => 8 + (m / span) * (W - 16);
  return (
    <svg viewBox={`0 0 ${W} 30`} role="img" aria-label={tr(locale, `${found.length} overlaps on the day strip`, `时间轴上 ${found.length} 次重合`)} className="h-[24px] w-full shrink-0">
      <rect x={8} y={10} width={(W - 16) / 2} height={6} rx={3} className="fill-fun-yellow/40" />
      <rect x={8 + (W - 16) / 2} y={10} width={(W - 16) / 2} height={6} rx={3} className="fill-indigo-200" />
      {found.map((i) => (
        <circle key={i} cx={x(times[i])} cy={13} r={3.5} className="fill-fun-pink" />
      ))}
      {now !== null && <line x1={x(now)} x2={x(now)} y1={4} y2={22} className="stroke-gray-700" strokeWidth={1.5} />}
      {[0, 6, 12, 18, 24].filter((h) => h * 60 <= span).map((h) => (
        <text key={h} x={x(h * 60)} y={28} textAnchor="middle" className="fill-gray-400 text-[7px]">
          {h}h
        </text>
      ))}
    </svg>
  );
}
