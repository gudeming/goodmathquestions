"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { centreRule, monthGrid, symmetricPairs, validWindows, windowAround, windowCells, type CalendarGridConfig, type SceneProps } from "@gmq/animation-engine";
import { SceneFrame, SceneMessage, tr } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const CELL = 30;
const X0 = 6;
const Y0 = 46;
const W = X0 * 2 + CELL * 7;
const REVEAL_MS = 5000;
const TRIES_TO_COMPLETE = 3;
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"];
const ARROWS: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

type Pos = [number, number];

/** Client point -> SVG user-space point (viewBox coordinates). */
function toSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const m = svg.getScreenCTM?.();
  if (!m) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const p = pt.matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

const cx = (col: number) => X0 + col * CELL + CELL / 2;
const cy = (row: number) => Y0 + row * CELL + CELL / 2;

/** E7: frame any 3 × 3 block of dates; the nine add up to 9 × the middle one. */
export default function CalendarGridScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<CalendarGridConfig>) {
  const events = useSceneEvents(onEvent);
  const grid = useMemo(() => monthGrid(config.year, config.month), [config.year, config.month]);
  const valid = useMemo(() => validWindows(grid), [grid]);
  const start = useMemo<Pos>(() => (config.centre !== undefined ? windowAround(grid, config.centre) : null) ?? valid[0] ?? [0, 0], [grid, valid, config.centre]);
  const [win, setWin] = useState<Pos>(start);
  const [note, setNote] = useState("");
  const tried = useRef(new Set<number>());
  const completedRef = useRef(false);
  const drag = useRef<{ dr: number; dc: number } | null>(null);
  const explore = phase === "explore";
  const H = Y0 + grid.length * CELL + 6;

  const shown: Pos = phase === "hook" ? start : win;
  const cells = windowCells(grid, shown[0], shown[1]) ?? [];
  const centre = cells[4] ?? 0;
  const sum = cells.reduce((a, b) => a + b, 0);
  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const pairs = symmetricPairs();

  const nearestValid = (r: number, c: number): Pos | null => {
    let best: Pos | null = null;
    let bestD = Infinity;
    for (const [vr, vc] of valid) {
      const d = Math.abs(vr - r) + Math.abs(vc - c);
      if (d < bestD) [best, bestD] = [[vr, vc], d];
    }
    return best;
  };

  const moveTo = (p: Pos) => {
    events.interact();
    if (p[0] === win[0] && p[1] === win[1]) return;
    const cs = windowCells(grid, p[0], p[1]);
    if (!cs) return;
    setWin(p);
    setNote("");
    const s = cs.reduce((a, b) => a + b, 0);
    tried.current.add(cs[4]);
    events.state({ centre: cs[4], sum: s, tried: tried.current.size });
    if (!completedRef.current && tried.current.size >= TRIES_TO_COMPLETE) {
      completedRef.current = true;
      events.emit("completed", { moves: tried.current.size });
    }
  };

  const cellAt = (svg: SVGSVGElement, e: PointerEvent<SVGSVGElement>): Pos | null => {
    const p = toSvg(svg, e.clientX, e.clientY);
    if (!p) return null;
    return [Math.floor((p.y - Y0) / CELL), Math.floor((p.x - X0) / CELL)];
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!explore || e.button > 0) return;
    const at = cellAt(e.currentTarget, e);
    if (!at) return;
    const [r, c] = at;
    if (r >= win[0] && r < win[0] + 3 && c >= win[1] && c < win[1] + 3) {
      events.interact();
      drag.current = { dr: r - win[0], dc: c - win[1] };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }
    const day = grid[r]?.[c];
    if (day === null || day === undefined) return;
    if (windowCells(grid, r - 1, c - 1)) moveTo([r - 1, c - 1]);
    else {
      events.interact();
      setNote(tr(locale, `${day} is on the edge: a 3 × 3 frame around it would fall off the dates.`, `${day} 在边上：围着它的 3 × 3 方框会跑出日期外。`));
    }
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const at = cellAt(e.currentTarget, e);
    if (!at) return;
    const p = nearestValid(at[0] - d.dr, at[1] - d.dc);
    if (p) moveTo(p);
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const onWindowKey = (e: KeyboardEvent<SVGGElement>) => {
    const d = ARROWS[e.key];
    if (!d || !explore) return;
    e.preventDefault();
    for (let k = 1; k < 8; k++) {
      const p: Pos = [win[0] + d[0] * k, win[1] + d[1] * k];
      if (windowCells(grid, p[0], p[1])) return moveTo(p);
    }
  };

  const title =
    config.year !== undefined && config.month !== undefined
      ? tr(locale, `${MONTHS_EN[config.month - 1]} ${config.year}`, `${config.year}年${config.month}月`)
      : tr(locale, "A 31-day month", "一个 31 天的月份");
  const label = tr(locale, `Calendar for ${title}: frame 3 × 3 dates`, `${title}的月历：框住 3 × 3 个日期`);

  const revealPairs = phase === "reveal" ? pairs.filter((_, k) => segment(progress, 0.05 + k * 0.18, 0.2 + k * 0.18) > 0).length : 0;
  const revealFinal = phase === "reveal" && progress >= 0.8;

  const msg = (() => {
    if (phase === "hook") return tr(locale, `The middle date is ${centre}. What do all nine add up to?`, `中间是 ${centre}。九个日期加起来是多少？`);
    if (phase === "reveal")
      return revealFinal
        ? tr(locale, `Opposite dates balance around the middle, so the nine dates are always 9 × the middle.`, `对称的两个日期围着中间数平衡，所以九个数的和总是中间数的 9 倍。`)
        : tr(locale, `Pair up opposite dates: each pair makes 2 × ${centre} = ${2 * centre}.`, `把对称的日期两两配对：每对都是 2 × ${centre} = ${2 * centre}。`);
    return note || tr(locale, "Drag the frame (or tap a date) to move it. Watch both sums.", "拖动方框（或点一个日期）移动它，看看两边的和。");
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 flex-col gap-1 sm:flex-row sm:gap-3">
        <div className="min-h-0 min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            role="group"
            aria-label={label}
            className={`h-full w-full ${explore ? "touch-none" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <text x={W / 2} y={16} textAnchor="middle" className="fill-gray-700 text-[13px] font-bold">
              {title}
            </text>
            {(locale === "zh" ? DAYS_ZH : DAYS_EN).map((d, i) => (
              <text key={d} x={cx(i)} y={Y0 - 8} textAnchor="middle" className={`text-[9px] ${i === 0 || i === 6 ? "fill-fun-pink" : "fill-gray-500"}`}>
                {d}
              </text>
            ))}
            {grid.map((week, r) =>
              week.map((day, c) => {
                const inWin = r >= shown[0] && r < shown[0] + 3 && c >= shown[1] && c < shown[1] + 3;
                return day === null ? null : (
                  <g key={`${r}-${c}`}>
                    <rect x={X0 + c * CELL + 1} y={Y0 + r * CELL + 1} width={CELL - 2} height={CELL - 2} rx={4} className={inWin ? "fill-fun-yellow/30" : "fill-white"} />
                    <text x={cx(c)} y={cy(r)} dy="0.35em" textAnchor="middle" className={`text-[11px] ${inWin ? "fill-gray-800 font-bold" : "fill-gray-500"}`} style={{ pointerEvents: "none" }}>
                      {day}
                    </text>
                  </g>
                );
              }),
            )}
            {phase === "reveal" &&
              pairs.slice(0, revealPairs).map(([i, j]) => (
                <line
                  key={i}
                  x1={cx(shown[1] + (i % 3))}
                  y1={cy(shown[0] + Math.floor(i / 3))}
                  x2={cx(shown[1] + (j % 3))}
                  y2={cy(shown[0] + Math.floor(j / 3))}
                  className="stroke-fun-pink"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  opacity={0.8}
                />
              ))}
            <g
              role={explore ? "slider" : undefined}
              tabIndex={explore ? 0 : -1}
              aria-label={tr(locale, `Frame around ${centre}; arrow keys move it`, `围着 ${centre} 的方框；用方向键移动`)}
              aria-valuenow={explore ? centre : undefined}
              className={`outline-none [&:focus-visible>rect]:stroke-fun-yellow ${explore ? "cursor-grab" : ""}`}
              onKeyDown={onWindowKey}
            >
              <rect
                x={X0 + shown[1] * CELL - 1}
                y={Y0 + shown[0] * CELL - 1}
                width={CELL * 3 + 2}
                height={CELL * 3 + 2}
                rx={8}
                fill="transparent"
                className="stroke-primary-500"
                strokeWidth={3}
                style={{ transition: reducedMotion ? "none" : "x 150ms, y 150ms" }}
              />
            </g>
            {phase === "reveal" && revealPairs > 0 && <circle cx={cx(shown[1] + 1)} cy={cy(shown[0] + 1)} r={11} fill="none" className="stroke-fun-purple" strokeWidth={2} />}
          </svg>
        </div>
        <SumPanel locale={locale} phase={phase} cells={cells} centre={centre} sum={sum} pairs={pairs.slice(0, revealPairs)} final={revealFinal} />
      </div>
      <SceneMessage>{msg}</SceneMessage>
    </SceneFrame>
  );
}

interface PanelProps {
  locale: "en" | "zh";
  phase: SceneProps<CalendarGridConfig>["phase"];
  cells: number[];
  centre: number;
  sum: number;
  pairs: Array<[number, number]>;
  final: boolean;
}

/** The two ways of getting the total, side by side (and, in the reveal, the pairs). */
function SumPanel({ locale, phase, cells, centre, sum, pairs, final }: PanelProps) {
  const hidden = phase === "hook";
  const rule = centreRule(centre);
  const ok = !hidden && rule === sum;
  if (phase === "reveal") {
    return (
      <div className="flex shrink-0 flex-col justify-center gap-0.5 text-center text-[11px] tabular-nums sm:w-40 sm:text-xs" aria-live="polite">
        {pairs.map(([i, j]) => (
          <span key={i} className="text-fun-pink">
            {cells[i]} + {cells[j]} = {cells[i] + cells[j]}
          </span>
        ))}
        {final && (
          <span className="mt-1 rounded-lg bg-fun-green/20 px-2 py-1 font-bold text-green-700">
            4 × {2 * centre} + {centre} = 9 × {centre} = {rule}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="grid shrink-0 grid-cols-2 gap-1 text-center text-[11px] tabular-nums sm:w-40 sm:grid-cols-1 sm:content-center sm:text-xs" aria-live="polite">
      <div className={`rounded-lg px-2 py-1 ${ok ? "bg-fun-green/20 text-green-800" : "bg-white text-gray-700"}`}>
        <div className="text-[10px] text-gray-500">{tr(locale, "add all nine", "九个数相加")}</div>
        <div className="break-words">{hidden ? `${cells.join(" + ")} = ?` : `${cells.join(" + ")} = ${sum}`}</div>
      </div>
      <div className={`rounded-lg px-2 py-1 ${ok ? "bg-fun-green/20 text-green-800" : "bg-white text-gray-700"}`}>
        <div className="text-[10px] text-gray-500">{tr(locale, "middle × 9", "中间数 × 9")}</div>
        <div className="text-base font-bold">{hidden ? `${centre} × 9 = ?` : `${centre} × 9 = ${rule}`}</div>
      </div>
    </div>
  );
}
