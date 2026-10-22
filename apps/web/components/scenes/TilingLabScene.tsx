"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  SHAPE_SIDES,
  angleSum,
  floorPatch,
  interiorAngle,
  polygonAtVertex,
  regularPolygon,
  tilesAlone,
  vertexStatus,
  type Pt,
  type SceneProps,
  type TileShape,
  type TilingLabConfig,
} from "@gmq/animation-engine";
import { SceneButton, SceneFrame, SceneMessage, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 200;
const C = { x: 100, y: 100 };
const SIDE = 34;
const FLOOR_SIDE = 22;
const REVEAL_MS = 5000;
const DRAG_PX = 6;
const FILL: Record<number, string> = { 3: "fill-fun-yellow", 4: "fill-fun-cyan", 5: "fill-fun-pink", 6: "fill-fun-orange", 8: "fill-fun-purple" };
const NAMES: Record<TileShape, [string, string]> = {
  triangle: ["triangle", "三角形"],
  square: ["square", "正方形"],
  pentagon: ["pentagon", "五边形"],
  hexagon: ["hexagon", "六边形"],
  octagon: ["octagon", "八边形"],
};
const BY_SIDES = Object.fromEntries(Object.entries(SHAPE_SIDES).map(([k, v]) => [v, k as TileShape])) as Record<number, TileShape>;

/** Maths axes (y up) around the canvas centre -> SVG points string. */
const toPoints = (pts: Pt[], at: Pt = C) => pts.map((p) => `${(at.x + p.x).toFixed(2)},${(at.y - p.y).toFixed(2)}`).join(" ");
const fmtAngle = (a: number) => (Number.isInteger(a) ? String(a) : a.toFixed(1));
const fmtRatio = (x: number) => (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : `${(Math.floor(x * 100) / 100).toFixed(2)}…`);
const shapeName = (locale: SceneLocale, n: number) => {
  const s = BY_SIDES[n];
  return s ? tr(locale, NAMES[s][0], NAMES[s][1]) : `${n}`;
};

/** Wedge (pie slice) from angle a0 to a1 (degrees, maths axes) of radius r. */
function wedge(a0: number, a1: number, r: number): string {
  const p = (a: number) => `${C.x + r * Math.cos((a * Math.PI) / 180)},${C.y - r * Math.sin((a * Math.PI) / 180)}`;
  return `M ${C.x} ${C.y} L ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 0 ${p(a1)} Z`;
}

/** Which floor a closed vertex can grow into, if any. */
function floorKind(placed: readonly number[]): 3 | 4 | 6 | 8 | null {
  const sorted = [...placed].sort((a, b) => a - b).join();
  if (sorted === "4,8,8") return 8;
  const n = placed[0];
  return placed.every((s) => s === n) && (n === 3 || n === 4 || n === 6) ? n : null;
}

function MiniPolygon({ n }: { n: number }) {
  return (
    <svg viewBox="-12 -12 24 24" className="h-5 w-5" aria-hidden>
      <polygon points={toPoints(regularPolygon(n, 22 * Math.sin(Math.PI / n), { x: 0, y: 0 }, 90), { x: 0, y: 0 })} className={`${FILL[n]} stroke-gray-600`} strokeWidth={1} />
    </svg>
  );
}

/** B9: which regular polygons fit around a point with no gap? */
export default function TilingLabScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<TilingLabConfig>) {
  const events = useSceneEvents(onEvent);
  const sides = useMemo(() => config.shapes.map((s) => SHAPE_SIDES[s]), [config.shapes]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [floor, setFloor] = useState(false);
  const [ghost, setGhost] = useState<{ n: number; p: Pt | null } | null>(null);
  const completedRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ n: number; x0: number; y0: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const explore = phase === "explore";

  const shown = phase === "hook" ? [6, 6, 6] : placed;
  const sum = angleSum(shown);
  const status = vertexStatus(shown, sides);
  const canPlace = explore && (status === "open" || status === "stuck");
  const kind = status === "closed" ? floorKind(shown) : null;

  const place = (n: number) => {
    if (!canPlace) return;
    events.interact();
    const next = [...placed, n];
    const m = moves + 1;
    setPlaced(next);
    setMoves(m);
    setFloor(false);
    const s = angleSum(next);
    events.state({ placed: next, sum: s });
    if (vertexStatus(next, sides) === "closed" && !completedRef.current) {
      completedRef.current = true;
      events.emit("completed", { moves: m, sides: next });
    }
  };
  const undo = () => {
    if (!explore || placed.length === 0) return;
    const next = placed.slice(0, -1);
    setPlaced(next);
    setFloor(false);
    events.state({ placed: next, sum: angleSum(next) });
  };
  const clear = () => {
    if (!explore) return;
    setPlaced([]);
    setFloor(false);
    events.state({ placed: [], sum: 0 });
  };

  // Drag from the tray onto the canvas (window listeners only while dragging).
  const svgPoint = (clientX: number, clientY: number): Pt | null => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM?.();
    if (!svg || !m) return null;
    const r = svg.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const q = pt.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  };
  const startDrag = (n: number) => (e: ReactPointerEvent<HTMLElement>) => {
    if (!canPlace || e.button > 0) return;
    dragRef.current = { n, x0: e.clientX, y0: e.clientY, moved: false };
    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved && Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) > DRAG_PX) d.moved = true;
      if (d.moved) setGhost({ n: d.n, p: svgPoint(ev.clientX, ev.clientY) });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const d = dragRef.current;
      dragRef.current = null;
      setGhost(null);
      if (d?.moved) {
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 0);
        if (svgPoint(ev.clientX, ev.clientY)) place(d.n);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const tableSides = useMemo(() => [3, 4, 5, 6, ...(sides.includes(8) ? [8] : [])], [sides]);
  const rowsShown = phase === "reveal" ? Math.ceil(segment(progress, 0, 0.6) * tableSides.length - 1e-9) : 0;
  const showMix = phase === "reveal" && progress >= 0.7;
  const showBees = phase === "reveal" && progress >= 0.82;

  const floorTiles = useMemo(() => (floor && kind ? floorPatch(kind, config.gridSize, FLOOR_SIDE) : showBees ? floorPatch(6, 2, 16) : []), [floor, kind, config.gridSize, showBees]);

  // Polygons around the vertex, each starting where the last one ended.
  const polys = useMemo(() => {
    let start = 0;
    return shown.map((n) => {
      const pts = polygonAtVertex(n, start, SIDE);
      const a = interiorAngle(n);
      const item = { n, pts, start, a, over: start + a > 360 + 1e-6 };
      start += a;
      return item;
    });
  }, [shown]);

  const label = tr(locale, "Tiling lab: fit regular shapes around a point with no gap", "铺地实验：把正多边形围着一个点拼起来，不留缝");
  const sumText = shown.length ? `${shown.map((n) => fmtAngle(interiorAngle(n))).join(" + ")} = ${fmtAngle(sum)}°` : "";
  const msg = (() => {
    if (phase === "hook") return tr(locale, "Three hexagons meet with no gap: 120° + 120° + 120° = 360°. Which other shapes can do it?", "三个六边形拼在一起没有缝：120° + 120° + 120° = 360°。别的形状行吗？");
    if (phase === "reveal") {
      if (showBees) return tr(locale, "Only 60°, 90° and 120° divide 360°. Of the three, hexagons use the least edge for the same area: bees save wax!", "只有 60°、90°、120° 能整除 360°。三者里六边形围同样面积用的边最少：蜜蜂省蜡！");
      if (showMix) return tr(locale, "Mixing works too: 135° + 135° + 90° = 360° (octagons + squares).", "混着用也行：135° + 135° + 90° = 360°（八边形 + 正方形）。");
      return tr(locale, "A shape tiles on its own only if its corner angle divides 360°.", "一个角能整除 360°，这种形状才能单独铺满地面。");
    }
    if (status === "closed") return tr(locale, `No gap! ${sumText}`, `没有缝！${sumText}`);
    if (status === "overlap") return tr(locale, `${sumText}: overlap by ${fmtAngle(sum - 360)}°. Undo and try another shape.`, `${sumText}：重叠了 ${fmtAngle(sum - 360)}°。撤销换一个形状试试。`);
    if (status === "stuck") return tr(locale, `${sumText}: a gap of ${fmtAngle(360 - sum)}°, and nothing fits in it.`, `${sumText}：留下 ${fmtAngle(360 - sum)}° 的缝，什么都放不进去。`);
    if (shown.length) return tr(locale, `${sumText}, ${fmtAngle(360 - sum)}° to go.`, `${sumText}，还差 ${fmtAngle(360 - sum)}°。`);
    return tr(locale, "Tap or drag a shape onto the floor. Can you go all the way round with no gap?", "点或拖一个形状到地板上。能不能围满一圈不留缝？");
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="min-h-0 min-w-0 flex-1">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${W}`} role="group" aria-label={label} className={`h-full w-full ${ghost ? "rounded-xl ring-4 ring-fun-yellow/60" : ""}`}>
            <circle cx={C.x} cy={C.y} r={96} className="fill-white stroke-gray-200" strokeDasharray="3 3" />
            {explore && (
              <text x={2} y={12} className={`text-[11px] font-bold ${status === "closed" ? "fill-green-700" : status === "open" ? "fill-primary-700" : "fill-fun-pink"}`}>
                Σ {fmtAngle(sum)}°
              </text>
            )}
            {floorTiles.length > 0 ? (
              <g aria-label={tr(locale, "Tiled floor", "铺好的地面")}>
                <clipPath id="tiling-floor">
                  <circle cx={C.x} cy={C.y} r={95} />
                </clipPath>
                <g clipPath="url(#tiling-floor)">
                  {floorTiles.map((t, i) => (
                    <polygon key={i} points={toPoints(t.pts)} className={`${FILL[t.sides]} stroke-white`} strokeWidth={1.5} fillOpacity={0.85} />
                  ))}
                </g>
              </g>
            ) : (
              <>
                {polys.map((p, i) => (
                  <g key={i}>
                    <polygon points={toPoints(p.pts)} className={p.over ? "fill-fun-red stroke-red-600" : `${FILL[p.n]} stroke-white`} strokeWidth={2} fillOpacity={p.over ? 0.55 : 0.9} />
                    <text
                      x={C.x + 15 * Math.cos(((p.start + p.a / 2) * Math.PI) / 180)}
                      y={C.y - 15 * Math.sin(((p.start + p.a / 2) * Math.PI) / 180)}
                      textAnchor="middle"
                      dy="0.35em"
                      className="fill-gray-800 text-[7px] font-bold"
                    >
                      {fmtAngle(p.a)}°
                    </text>
                  </g>
                ))}
                {status === "stuck" && <path d={wedge(sum, 360, 40)} className="fill-fun-red/40 stroke-fun-red" strokeWidth={1.5} />}
                {status === "stuck" && (
                  <text x={C.x + 52 * Math.cos((((sum + 360) / 2) * Math.PI) / 180)} y={C.y - 52 * Math.sin((((sum + 360) / 2) * Math.PI) / 180)} textAnchor="middle" className="fill-red-600 text-[9px] font-bold">
                    {tr(locale, `gap ${fmtAngle(360 - sum)}°`, `缝 ${fmtAngle(360 - sum)}°`)}
                  </text>
                )}
                {status === "overlap" && (
                  <text x={C.x} y={12} textAnchor="middle" className="fill-red-600 text-[9px] font-bold">
                    {tr(locale, `overlap ${fmtAngle(sum - 360)}°`, `重叠 ${fmtAngle(sum - 360)}°`)}
                  </text>
                )}
                {status === "closed" && <circle cx={C.x} cy={C.y} r={40} fill="none" className="stroke-fun-green" strokeWidth={2} strokeDasharray="4 3" />}
                {ghost?.p && <polygon points={toPoints(regularPolygon(ghost.n, 20, { x: 0, y: 0 }, 90), { x: ghost.p.x, y: ghost.p.y })} className={`${FILL[ghost.n]} stroke-gray-500`} fillOpacity={0.6} />}
              </>
            )}
            <circle cx={C.x} cy={C.y} r={3} className="fill-gray-800" />
          </svg>
        </div>
        {phase === "reveal" && (
          <table className="self-center text-[10px] tabular-nums sm:text-xs" aria-label={tr(locale, "Corner angles", "内角表")}>
            <thead>
              <tr className="text-gray-500">
                <th className="px-1 text-left">{tr(locale, "shape", "形状")}</th>
                <th className="px-1">{tr(locale, "angle", "内角")}</th>
                <th className="px-1">360 ÷</th>
                <th className="px-1">{tr(locale, "alone?", "单独铺？")}</th>
              </tr>
            </thead>
            <tbody>
              {tableSides.map((n, i) => (
                <tr key={n} className={i < rowsShown ? (tilesAlone(n) ? "text-green-700" : "text-red-600") : "opacity-0"}>
                  <td className="px-1">{shapeName(locale, n)}</td>
                  <td className="px-1 text-center">{fmtAngle(interiorAngle(n))}°</td>
                  <td className="px-1 text-center">{fmtRatio(360 / interiorAngle(n))}</td>
                  <td className="px-1 text-center font-bold">{tilesAlone(n) ? "✓" : "✗"}</td>
                </tr>
              ))}
              <tr className={showMix ? "text-fun-purple" : "opacity-0"}>
                <td colSpan={4} className="px-1 pt-1 font-bold">
                  135 + 135 + 90 = 360 ✓
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
      <SceneMessage>{msg}</SceneMessage>
      {explore && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          {config.shapes.map((s) => {
            const n = SHAPE_SIDES[s];
            return (
              <div key={s} onPointerDown={startDrag(n)} className="touch-none">
                <SceneButton
                  onClick={() => {
                    if (!suppressClick.current) place(n);
                  }}
                  disabled={!canPlace}
                  variant="ghost"
                  ariaLabel={tr(locale, `Place a ${NAMES[s][0]} (${fmtAngle(interiorAngle(n))}°)`, `放一个${NAMES[s][1]}（${fmtAngle(interiorAngle(n))}°）`)}
                  className="inline-flex items-center gap-1"
                >
                  <MiniPolygon n={n} />
                  <span className="tabular-nums">{fmtAngle(interiorAngle(n))}°</span>
                </SceneButton>
              </div>
            );
          })}
          <SceneButton onClick={undo} variant="ghost" disabled={placed.length === 0} ariaLabel={tr(locale, "Undo", "撤销")}>
            ↶
          </SceneButton>
          <SceneButton onClick={clear} variant="ghost" disabled={placed.length === 0} ariaLabel={tr(locale, "Clear", "清空")}>
            ✕
          </SceneButton>
          {kind !== null && (
            <SceneButton onClick={() => setFloor((f) => !f)} variant="accent" ariaPressed={floor}>
              {floor ? tr(locale, "Back to the corner", "回到拼角") : tr(locale, "Tile the floor", "铺满地面")}
            </SceneButton>
          )}
        </div>
      )}
    </SceneFrame>
  );
}
