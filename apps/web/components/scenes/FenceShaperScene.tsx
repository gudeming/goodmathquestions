"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import { areaFor, bestWidth, lengthFor, maxArea, widthRange, type FenceShaperConfig, type SceneProps } from "@gmq/animation-engine";
import { Counter, SceneFrame, SceneMessage, SceneSvg, formatNumber, tr } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 400;
const H = 230;
const FIELD = { x: 10, y: 22, w: 200, h: 180 };
const CHART = { x: 248, y: 22, w: 140, h: 160 };
const REVEAL_MS = 3200;
const CURVE_SAMPLES = 60;

const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** B4: a fixed fence; slide the width and watch the area rise and fall. */
export default function FenceShaperScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<FenceShaperConfig>) {
  const { perimeter, wallSide } = config;
  const range = useMemo(() => widthRange(config), [config]);
  const best = bestWidth(config);
  const top = maxArea(config);
  const events = useSceneEvents(onEvent);
  const [width, setWidth] = useState(range.min);
  const [tried, setTried] = useState<number[]>([]);
  const proposedRef = useRef(false);
  const dragging = useRef(false);

  const snap = (w: number) => Math.max(range.min, Math.min(range.max, Math.round(w / range.step) * range.step));

  const choose = (raw: number) => {
    if (phase !== "explore") return;
    const w = snap(raw);
    events.interact();
    if (same(w, width) && tried.length > 0) return;
    setWidth(w);
    setTried((prev) => (prev.some((t) => same(t, w)) ? prev : [...prev, w]));
    const area = areaFor(w, config);
    events.state({ width: w, length: lengthFor(w, config), area });
    if (same(area, top) && !proposedRef.current) {
      proposedRef.current = true;
      onProposeAnswer?.(String(top));
      events.emit("completed", { moves: tried.length + 1, area });
    }
  };

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const shownW = phase === "hook" ? snap(range.min + (range.max - range.min) * 0.2) : phase === "reveal" ? best : width;
  const shownL = lengthFor(shownW, config);
  const area = areaFor(shownW, config);

  // Field drawing: length runs across, width down; one scale for every slider position.
  const maxL = wallSide ? perimeter - 2 * range.min : perimeter / 2 - range.min;
  const maxW = range.max;
  const scale = Math.min(FIELD.w / maxL, FIELD.h / maxW);
  const fw = shownL * scale;
  const fh = shownW * scale;
  const fx = FIELD.x + (FIELD.w - fw) / 2;
  const fy = FIELD.y + (wallSide ? 0 : (FIELD.h - fh) / 2);

  // Pointer drag on the field: the bottom edge follows the pointer.
  const toWidth = (e: PointerEvent<SVGGElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return width;
    const rect = svg.getBoundingClientRect();
    const k = Math.min(rect.width / W, rect.height / H);
    const oy = rect.top + (rect.height - H * k) / 2;
    const y = (e.clientY - oy) / k;
    return (y - fy) / scale;
  };
  const onDown = (e: PointerEvent<SVGGElement>) => {
    if (phase !== "explore") return;
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    choose(toWidth(e));
  };
  const onMove = (e: PointerEvent<SVGGElement>) => {
    if (dragging.current) choose(toWidth(e));
  };
  const onUp = () => {
    dragging.current = false;
  };

  // Area chart.
  const cx = (w: number) => CHART.x + ((w - range.min) / (range.max - range.min || 1)) * CHART.w;
  const cy = (a: number) => CHART.y + CHART.h - (a / (top || 1)) * CHART.h;
  const drawCurve = phase === "reveal" ? segment(progress, 0, 0.7) : 0;
  const curve = (() => {
    const upTo = Math.ceil(drawCurve * CURVE_SAMPLES);
    const pts: string[] = [];
    for (let i = 0; i <= upTo; i++) {
      const w = range.min + ((range.max - range.min) * i) / CURVE_SAMPLES;
      pts.push(`${i === 0 ? "M" : "L"} ${cx(w).toFixed(1)} ${cy(areaFor(w, config)).toFixed(1)}`);
    }
    return pts.join(" ");
  })();
  const showMax = phase === "reveal" && progress > 0.7;

  const fmt = (v: number) => formatNumber(v, locale);
  const label = tr(locale, `${perimeter} m of fence${wallSide ? " against a wall" : ""}: which rectangle holds the most?`, `${perimeter} 米围栏${wallSide ? "（一边靠墙）" : ""}：怎么围面积最大？`);
  const isBest = same(area, top);

  const message = (() => {
    if (phase === "hook") return tr(locale, `${perimeter} m of fence. Which rectangle is biggest?`, `${perimeter} 米围栏，哪种长方形最大？`);
    if (phase === "reveal")
      return tr(
        locale,
        `${fmt(best)} × ${fmt(lengthFor(best, config))} = ${fmt(top)} m². ${wallSide ? "With the wall, the best field is twice as long as it is wide." : "Same fence: the closer to a square, the bigger the field."}`,
        `${fmt(best)} × ${fmt(lengthFor(best, config))} = ${fmt(top)} 平方米。${wallSide ? "靠墙时，最好的地长是宽的两倍。" : "围栏一样长，越接近正方形面积越大。"}`,
      );
    if (tried.length === 0) return tr(locale, "Slide (or drag the field) to change the width.", "拖动滑块（或拖地块的边）改变宽度。");
    if (isBest) return tr(locale, `${fmt(top)} m²: you can't beat that!`, `${fmt(top)} 平方米：没法更大了！`);
    return tr(locale, `${fmt(shownW)} × ${fmt(shownL)} = ${fmt(area)} m²`, `${fmt(shownW)} × ${fmt(shownL)} = ${fmt(area)} 平方米`);
  })();

  const interactive = phase === "explore";
  const fencePath = wallSide ? `M ${fx} ${fy} V ${fy + fh} H ${fx + fw} V ${fy}` : `M ${fx} ${fy} H ${fx + fw} V ${fy + fh} H ${fx} Z`;
  const ease = reducedMotion ? undefined : { transition: "all 200ms ease-out" };

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <SceneSvg viewBox={`0 0 ${W} ${H}`} label={label} className={interactive ? "touch-none" : ""}>
          {wallSide && (
            <g>
              <rect x={FIELD.x} y={FIELD.y - 8} width={FIELD.w} height={8} rx={2} className="fill-gray-400" />
              <text x={FIELD.x + FIELD.w / 2} y={FIELD.y - 11} textAnchor="middle" className="fill-gray-500 text-[9px]">
                {tr(locale, "wall (no fence needed)", "墙（不用围）")}
              </text>
            </g>
          )}
          <g onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} className={interactive ? "cursor-ns-resize" : ""}>
            <rect x={FIELD.x} y={FIELD.y} width={FIELD.w} height={FIELD.h} fill="transparent" />
            <rect x={fx} y={fy} width={Math.max(1, fw)} height={Math.max(1, fh)} className={isBest ? "fill-fun-green/40" : "fill-fun-yellow/40"} style={ease} />
            <path d={fencePath} fill="none" stroke="#c084fc" strokeWidth={4} strokeDasharray="8 4" strokeLinejoin="round" />
          </g>
          <text x={fx + fw / 2} y={fy + fh / 2} textAnchor="middle" dy="0.35em" className="fill-gray-800 text-[16px] font-bold" style={{ pointerEvents: "none" }}>
            {fmt(area)} m²
          </text>
          <text x={fx + fw / 2} y={Math.min(H - 4, fy + fh + 14)} textAnchor="middle" className="fill-gray-600 text-[11px]" style={{ pointerEvents: "none" }}>
            {fmt(shownL)} m
          </text>
          <text x={Math.max(10, fx - 4)} y={fy + fh / 2} textAnchor="end" dy="0.35em" className="fill-gray-600 text-[11px]" style={{ pointerEvents: "none" }}>
            {fmt(shownW)}
          </text>

          {/* Area vs width chart */}
          <line x1={CHART.x} x2={CHART.x + CHART.w} y1={CHART.y + CHART.h} y2={CHART.y + CHART.h} className="stroke-gray-300" strokeWidth={1.5} />
          <line x1={CHART.x} x2={CHART.x} y1={CHART.y} y2={CHART.y + CHART.h} className="stroke-gray-300" strokeWidth={1.5} />
          <text x={CHART.x + CHART.w / 2} y={CHART.y + CHART.h + 14} textAnchor="middle" className="fill-gray-500 text-[9px]">
            {tr(locale, "width (m)", "宽（米）")}
          </text>
          <text x={CHART.x} y={CHART.y - 6} className="fill-gray-500 text-[9px]">
            {tr(locale, "area (m²)", "面积（平方米）")}
          </text>
          {phase === "reveal" && <path d={curve} fill="none" className="stroke-fun-purple" strokeWidth={2.5} />}
          {tried.map((t) => (
            <circle key={t} cx={cx(t)} cy={cy(areaFor(t, config))} r={3.5} className={same(areaFor(t, config), top) ? "fill-fun-green" : "fill-primary-400"} />
          ))}
          {phase !== "hook" && <circle cx={cx(shownW)} cy={cy(area)} r={6} className="fill-none stroke-fun-pink" strokeWidth={2.5} />}
          {showMax && (
            <g>
              <circle cx={cx(best)} cy={cy(top)} r={8} className="fill-fun-green" />
              <text x={cx(best)} y={cy(top) - 12} textAnchor="middle" className="fill-green-700 text-[11px] font-bold">
                ({fmt(best)}, {fmt(top)})
              </text>
            </g>
          )}
        </SceneSvg>
      </div>
      <SceneMessage>{message}</SceneMessage>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        {interactive && (
          <label className="flex min-h-[44px] items-center gap-2 text-xs text-gray-600">
            {tr(locale, "width", "宽")}
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={range.step}
              value={width}
              onChange={(e) => choose(Number(e.target.value))}
              aria-label={tr(locale, "Width of the field in metres", "地块的宽（米）")}
              aria-valuetext={tr(locale, `${fmt(width)} by ${fmt(lengthFor(width, config))}, area ${fmt(areaFor(width, config))}`, `${fmt(width)} × ${fmt(lengthFor(width, config))}，面积 ${fmt(areaFor(width, config))}`)}
              className="h-11 w-36 accent-fun-purple sm:w-48"
            />
          </label>
        )}
        <Counter label={tr(locale, "area", "面积")} value={`${fmt(area)} m²`} tone={isBest && phase !== "hook" ? "green" : "primary"} />
        <Counter label={tr(locale, "fence", "围栏")} value={`${perimeter} m`} tone="pink" />
      </div>
    </SceneFrame>
  );
}
