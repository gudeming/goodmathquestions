"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { integerHypotenuse, squareOnSide, squaresBounds, tileMoves, triangleSquares, type PythagorasSquaresConfig, type RightTriangle, type SceneProps, type Vec } from "@gmq/animation-engine";
import { SceneButton, SceneFrame, SceneMessage, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { easeInOut, segment, useRevealProgress } from "./useRevealProgress";

const REVEAL_MS = 4200;
const LEG_MAX = 12;
const X_MIN = -8;
const isInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-9;
const pts = (ps: readonly Vec[]) => ps.map(([x, y]) => `${x},${-y}`).join(" ");
const lerp = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function viewFor(t: RightTriangle): string {
  const [x0, y0, x1, y1] = squaresBounds(t);
  const pad = 1.2;
  return `${x0 - pad} ${-y1 - pad} ${x1 - x0 + 2 * pad} ${y1 - y0 + 2 * pad}`;
}

/** Unit grid lines inside an integer square standing on u→v. */
function SquareGrid({ u, along, out, side }: { u: Vec; along: Vec; out: Vec; side: number }) {
  if (!isInt(side) || side > 20) return null;
  const lines: JSX.Element[] = [];
  for (let k = 1; k < side; k++) {
    const p1: Vec = [u[0] + along[0] * k, u[1] + along[1] * k];
    const p2: Vec = [p1[0] + out[0] * side, p1[1] + out[1] * side];
    const q1: Vec = [u[0] + out[0] * k, u[1] + out[1] * k];
    const q2: Vec = [q1[0] + along[0] * side, q1[1] + along[1] * side];
    lines.push(<line key={`a${k}`} x1={p1[0]} y1={-p1[1]} x2={p2[0]} y2={-p2[1]} />, <line key={`b${k}`} x1={q1[0]} y1={-q1[1]} x2={q2[0]} y2={-q2[1]} />);
  }
  return <g className="stroke-white/70" strokeWidth={0.05}>{lines}</g>;
}

/** B6: squares on the three sides; drag the corners; with a right angle, the two small areas add up to the big one. */
export default function PythagorasSquaresScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<PythagorasSquaresConfig>) {
  const events = useSceneEvents(onEvent);
  const [locked, setLocked] = useState(config.lockRightAngle);
  const [pb, setPb] = useState<Vec>([config.b, 0]);
  const [pa, setPa] = useState<Vec>([0, config.a]);
  const [view, setView] = useState(() => viewFor({ o: [0, 0], pb: [config.b, 0], pa: [0, config.a] }));
  const drag = useRef<"a" | "b" | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const reveal = phase === "reveal";
  const tri: RightTriangle = reveal || phase === "hook" ? { o: [0, 0], pb: [config.b, 0], pa: [0, config.a] } : { o: [0, 0], pb, pa };
  const sq = triangleSquares(tri);
  const right = Math.abs(sq.angle - 90) < 1e-6;
  const sqA = squareOnSide(tri.o, tri.pa, tri.pb);
  const sqB = squareOnSide(tri.o, tri.pb, tri.pa);
  const sqC = squareOnSide(tri.pb, tri.pa, tri.o);
  const c = integerHypotenuse(config.a, config.b) ?? Math.hypot(config.a, config.b);
  const moves = useMemo(() => (reveal ? tileMoves(config.a, config.b) : []), [reveal, config.a, config.b]);
  const shownView = reveal || phase === "hook" ? viewFor(tri) : view;
  const span = Number(shownView.split(" ")[3]);
  const fs = span / 16;

  const place = (which: "a" | "b", raw: Vec, refit: boolean) => {
    if (phase !== "explore") return;
    events.interact();
    let nextA = pa;
    let nextB = pb;
    if (which === "b") nextB = [Math.max(1, Math.min(LEG_MAX, Math.round(raw[0]))), 0];
    else if (locked) nextA = [0, Math.max(1, Math.min(LEG_MAX, Math.round(raw[1])))];
    else nextA = [Math.max(X_MIN, Math.min(LEG_MAX, Math.round(raw[0]))), Math.max(1, Math.min(LEG_MAX, Math.round(raw[1])))];
    if (nextA[0] === nextB[0] && nextA[1] === nextB[1]) return;
    setPa(nextA);
    setPb(nextB);
    const t = { o: [0, 0] as Vec, pb: nextB, pa: nextA };
    if (refit) setView(viewFor(t));
    const s = triangleSquares(t);
    events.state({ a2: Math.round(s.areaA * 100) / 100, b2: Math.round(s.areaB * 100) / 100, c2: Math.round(s.areaC * 100) / 100, angle: Math.round(s.angle * 10) / 10 });
  };

  const toMaths = (e: PointerEvent<SVGElement>): Vec | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM?.();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return [p.x, -p.y];
  };
  const onDown = (which: "a" | "b") => (e: PointerEvent<SVGGElement>) => {
    if (phase !== "explore") return;
    drag.current = which;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent<SVGGElement>) => {
    const p = drag.current && toMaths(e);
    if (drag.current && p) place(drag.current, p, false);
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    setView(viewFor({ o: [0, 0], pb, pa }));
  };
  const onKey = (which: "a" | "b") => (e: KeyboardEvent<SVGGElement>) => {
    const d: Record<string, Vec> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const delta = d[e.key];
    if (!delta) return;
    e.preventDefault();
    const from = which === "a" ? pa : pb;
    place(which, [from[0] + delta[0], from[1] + delta[1]], true);
  };

  const toggleLock = () => {
    events.interact();
    const next = !locked;
    setLocked(next);
    if (next && pa[0] !== 0) {
      const a: Vec = [0, Math.max(1, Math.round(Math.hypot(pa[0], pa[1])))];
      setPa(a);
      setView(viewFor({ o: [0, 0], pb, pa: a }));
    }
  };

  const f = (v: number) => formatNumber(isInt(v) ? Math.round(v) : Math.round(v * 10) / 10, locale);
  const sum = sq.areaA + sq.areaB;
  const equal = Math.abs(sum - sq.areaC) < 1e-6;
  const label = tr(locale, "A triangle with a square on each side", "三角形每条边上搭一个正方形");

  const message = (() => {
    if (phase === "hook") return tr(locale, "Two small squares or one big one: which has more?", "两个小正方形和一个大正方形，谁大？");
    if (reveal)
      return progress > 0.85
        ? tr(locale, `${config.a * config.a} + ${config.b * config.b} = ${c * c} tiles: the small squares fill the big one exactly. c = √${c * c} = ${c}.`, `${config.a * config.a} + ${config.b * config.b} = ${c * c} 块：两个小正方形正好铺满大正方形。c = √${c * c} = ${c}。`)
        : tr(locale, "Cut the small squares into unit tiles…", "把小正方形切成一个个小格……");
    if (right) return tr(locale, `Right angle: ${f(sq.areaA)} + ${f(sq.areaB)} = ${f(sum)}, and the big square is ${f(sq.areaC)}.`, `直角：${f(sq.areaA)} + ${f(sq.areaB)} = ${f(sum)}，大正方形是 ${f(sq.areaC)}。`);
    return sq.angle > 90
      ? tr(locale, `Angle ${f(sq.angle)}°: the big square wins (${f(sq.areaC)} > ${f(sum)}).`, `角是 ${f(sq.angle)}°：大正方形更大（${f(sq.areaC)} > ${f(sum)}）。`)
      : tr(locale, `Angle ${f(sq.angle)}°: the small ones win (${f(sum)} > ${f(sq.areaC)}).`, `角是 ${f(sq.angle)}°：小的加起来更大（${f(sum)} > ${f(sq.areaC)}）。`);
  })();

  const centre = (cs: readonly Vec[]): Vec => [(cs[0][0] + cs[2][0]) / 2, (cs[0][1] + cs[2][1]) / 2];
  const areaText = (cs: readonly Vec[], text: string) => {
    const [x, y] = centre(cs);
    return (
      <text x={x} y={-y} dy="0.35em" textAnchor="middle" fontSize={fs} className="fill-gray-800 font-bold" style={{ pointerEvents: "none" }}>
        {text}
      </text>
    );
  };
  const handle = (which: "a" | "b", p: Vec) => (
    <g
      role="slider"
      tabIndex={phase === "explore" ? 0 : -1}
      aria-label={which === "a" ? tr(locale, "Top corner", "上面的顶点") : tr(locale, "Right corner", "右边的顶点")}
      aria-valuetext={which === "a" ? `${f(sq.sideA)}` : `${f(sq.sideB)}`}
      className="cursor-grab outline-none [&:focus-visible>circle.ring]:stroke-fun-yellow"
      onPointerDown={onDown(which)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={onKey(which)}
    >
      <circle cx={p[0]} cy={-p[1]} r={fs * 1.6} fill="transparent" />
      <circle className="ring" cx={p[0]} cy={-p[1]} r={fs * 0.9} fill="none" stroke="transparent" strokeWidth={fs * 0.25} />
      <circle cx={p[0]} cy={-p[1]} r={fs * 0.55} className="fill-fun-pink stroke-white" strokeWidth={fs * 0.12} />
    </g>
  );

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <svg ref={svgRef} viewBox={shownView} role={phase === "explore" ? "group" : "img"} aria-label={`${label}: ${f(sq.areaA)}, ${f(sq.areaB)}, ${f(sq.areaC)}`} className="h-full min-w-0 flex-1 touch-none overflow-visible">
          <polygon points={pts(sqA.corners)} className="fill-fun-pink/60" opacity={reveal ? 1 - segment(progress, 0.1, 0.2) * 0.75 : 1} />
          <polygon points={pts(sqB.corners)} className="fill-primary-400/60" opacity={reveal ? 1 - segment(progress, 0.1, 0.2) * 0.75 : 1} />
          <polygon points={pts(sqC.corners)} className={reveal ? "fill-white stroke-fun-purple" : "fill-fun-purple/50"} strokeWidth={0.08} />
          {!reveal && <SquareGrid {...sqA} u={sqA.corners[0]} />}
          {!reveal && <SquareGrid {...sqB} u={sqB.corners[0]} />}
          {!reveal && <SquareGrid {...sqC} u={sqC.corners[0]} />}
          {reveal &&
            moves.map((m, k) => {
              const start = 0.15 + (k / moves.length) * 0.55;
              const t = easeInOut(segment(progress, start, start + 0.15));
              const corners = m.from.map((p, i) => lerp(p, m.to[i], t));
              return <polygon key={k} points={pts(corners)} className={`${m.source === "a" ? "fill-fun-pink" : "fill-primary-400"} stroke-white`} strokeWidth={0.06} />;
            })}
          <polygon points={pts([tri.o, tri.pb, tri.pa])} className="fill-fun-yellow stroke-gray-700" strokeWidth={0.1} strokeLinejoin="round" />
          {right && <polyline points={pts([[0.8, 0], [0.8, 0.8], [0, 0.8]])} fill="none" className="stroke-gray-700" strokeWidth={0.08} />}
          {!reveal && areaText(sqA.corners, `${f(sq.areaA)}`)}
          {!reveal && areaText(sqB.corners, `${f(sq.areaB)}`)}
          {areaText(sqC.corners, reveal && progress > 0.85 ? `${c}² = ${c * c}` : `${f(sq.areaC)}`)}
          {phase === "explore" && handle("b", tri.pb)}
          {phase === "explore" && handle("a", tri.pa)}
        </svg>
        <AreaBars a2={reveal ? config.a ** 2 : sq.areaA} b2={reveal ? config.b ** 2 : sq.areaB} c2={reveal ? c * c : sq.areaC} equal={reveal || equal} angle={reveal ? 90 : sq.angle} locale={locale} format={f} />
      </div>
      <SceneMessage>{message}</SceneMessage>
      {phase === "explore" && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <SceneButton onClick={toggleLock} variant={locked ? "primary" : "ghost"} ariaPressed={locked}>
            {locked ? tr(locale, "🔒 Right angle", "🔒 锁定直角") : tr(locale, "🔓 Free corner", "🔓 自由顶点")}
          </SceneButton>
          <SceneButton
            onClick={() => {
              setPa([0, config.a]);
              setPb([config.b, 0]);
              setLocked(true);
              setView(viewFor({ o: [0, 0], pb: [config.b, 0], pa: [0, config.a] }));
            }}
            variant="ghost"
          >
            {tr(locale, `Back to ${config.a}-${config.b}`, `回到 ${config.a} 和 ${config.b}`)}
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

/** a² + b² (stacked) next to c², with the corner angle. */
function AreaBars({ a2, b2, c2, equal, angle, locale, format }: { a2: number; b2: number; c2: number; equal: boolean; angle: number; locale: SceneLocale; format: (v: number) => string }) {
  const top = Math.max(a2 + b2, c2, 1);
  const H = 150;
  const h = (v: number) => (v / top) * H;
  const base = 170;
  return (
    <svg viewBox="0 0 110 200" role="img" aria-label={tr(locale, `a² + b² = ${format(a2 + b2)}, c² = ${format(c2)}`, `a² + b² = ${format(a2 + b2)}，c² = ${format(c2)}`)} className="h-full w-[28%] shrink-0">
      <rect x={14} y={base - h(b2)} width={30} height={h(b2)} rx={3} className="fill-primary-400" />
      <rect x={14} y={base - h(b2) - h(a2)} width={30} height={h(a2)} rx={3} className="fill-fun-pink" />
      <rect x={64} y={base - h(c2)} width={30} height={h(c2)} rx={3} className="fill-fun-purple" />
      <text x={29} y={base + 12} textAnchor="middle" className="fill-gray-600 text-[10px]">a² + b²</text>
      <text x={79} y={base + 12} textAnchor="middle" className="fill-gray-600 text-[10px]">c²</text>
      <text x={29} y={base - h(a2 + b2) - 4} textAnchor="middle" className="fill-gray-800 text-[10px] font-bold">{format(a2 + b2)}</text>
      <text x={79} y={base - h(c2) - 4} textAnchor="middle" className="fill-gray-800 text-[10px] font-bold">{format(c2)}</text>
      <text x={54} y={base - Math.max(h(a2 + b2), h(c2)) / 2} textAnchor="middle" className={`text-[14px] font-bold ${equal ? "fill-green-600" : "fill-fun-red"}`}>
        {equal ? "=" : a2 + b2 > c2 ? ">" : "<"}
      </text>
      <text x={54} y={196} textAnchor="middle" className="fill-gray-500 text-[10px]">∠ {format(angle)}°</text>
    </svg>
  );
}
