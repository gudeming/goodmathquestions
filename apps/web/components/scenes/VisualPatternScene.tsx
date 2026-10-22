"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  bounds,
  cellKey,
  colorGroup,
  countAtStep,
  extrapolateCells,
  formatRule,
  formatRuleAt,
  patternCentre,
  sameShape,
  type Cell,
  type SceneProps,
  type VisualPatternConfig,
} from "@gmq/animation-engine";
import { SceneButton, SceneFrame, SceneMessage, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

type ColorMode = "arm" | "ring" | "none";
type View = "steps" | "build";

const GROUP_FILLS = ["fill-fun-pink", "fill-primary-500", "fill-fun-green", "fill-fun-orange", "fill-fun-purple", "fill-fun-cyan", "fill-fun-yellow", "fill-fun-red", "fill-primary-300"];
const REVEAL_MS = 5200;
const GAP = 1.6;

const fillFor = (group: number, mode: ColorMode) => (mode === "none" ? "fill-primary-500" : GROUP_FILLS[group % GROUP_FILLS.length]);

/** A compact near-square block of `count` dots, for rules the given steps can't extend by translation. */
function compactBlock(count: number): Cell[] {
  const cols = Math.ceil(Math.sqrt(count));
  return Array.from({ length: count }, (_, i) => [i % cols, Math.floor(i / cols)] as const);
}

/** Cells for step n: given, extended geometrically, or a compact block of the right size. */
function cellsAt(steps: ReadonlyArray<readonly Cell[]>, rule: VisualPatternConfig["rule"], n: number): { cells: Cell[]; exact: boolean } {
  const ext = extrapolateCells(steps, n);
  return ext ? { cells: ext, exact: true } : { cells: compactBlock(countAtStep(rule, n)), exact: false };
}

/** Dots of one step, scaled into the box (x, y, w, h). */
function Dots({ cells, box, centre, mode, label, reducedMotion }: { cells: readonly Cell[]; box: [number, number, number, number]; centre: Cell; mode: ColorMode; label?: string; reducedMotion: boolean }) {
  const b = bounds(cells);
  const cols = b.maxX - b.minX + 1;
  const rows = b.maxY - b.minY + 1;
  const [x, y, w, h] = box;
  const top = label ? 16 : 0;
  const s = Math.min(w / cols, (h - top) / rows, 22);
  const ox = x + (w - s * cols) / 2;
  const oy = y + top + (h - top - s * rows) / 2;
  return (
    <g>
      {label && (
        <text x={x + w / 2} y={y + 11} textAnchor="middle" className="fill-gray-500 text-[11px] font-bold">
          {label}
        </text>
      )}
      {cells.map((c) => (
        <motion.rect
          key={cellKey(c)}
          x={ox + (c[0] - b.minX) * s + GAP / 2}
          y={oy + (c[1] - b.minY) * s + GAP / 2}
          width={Math.max(1, s - GAP)}
          height={Math.max(1, s - GAP)}
          rx={s / 3}
          className={fillFor(colorGroup(c, centre, mode), mode)}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      ))}
    </g>
  );
}

/** E3 (and any "find the rule" picture): look at the given steps, build the next one, then watch it grow to step N. */
export default function VisualPatternScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<VisualPatternConfig>) {
  const { rule, askStep } = config;
  const steps = useMemo(() => config.steps.map((s) => s.cells as readonly Cell[]), [config.steps]);
  const buildStep = steps.length + 1;
  const events = useSceneEvents(onEvent);
  const [view, setView] = useState<View>("steps");
  const [mode, setMode] = useState<ColorMode>(config.colorRule ?? "none");
  const [lit, setLit] = useState<Set<string>>(() => new Set());
  const [checked, setChecked] = useState<null | "right" | "count" | "wrong">(null);
  const [focus, setFocus] = useState(0);
  const [message, setMessage] = useState("");
  const paint = useRef<boolean | null>(null);
  const checks = useRef(0);
  const completed = useRef(false);

  const centre = useMemo(() => patternCentre(steps[0]), [steps]);
  const target = useMemo(() => cellsAt(steps, rule, buildStep), [steps, rule, buildStep]);
  // Build grid: the next step's footprint when we can extend the shape, else the last step plus a margin.
  const grid = useMemo(() => {
    const b = target.exact ? bounds(target.cells) : bounds(steps[steps.length - 1]);
    const m = target.exact ? 0 : 1;
    return { minX: b.minX - m, minY: b.minY - m, cols: b.maxX - b.minX + 1 + 2 * m, rows: b.maxY - b.minY + 1 + 2 * m };
  }, [target, steps]);

  const interactive = phase === "explore";
  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const label = tr(locale, `A growing dot pattern: what is step ${askStep}?`, `越长越大的点阵：第 ${askStep} 步是多少？`);

  const toggleCell = (key: string, on?: boolean) => {
    if (!interactive) return;
    events.interact();
    setChecked(null);
    setLit((prev) => {
      const next = new Set(prev);
      const want = on ?? !next.has(key);
      if (want) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const check = () => {
    events.interact();
    checks.current++;
    const want = countAtStep(rule, buildStep);
    const mine = [...lit].map((k) => k.split(",").map(Number) as unknown as Cell);
    const shapeOk = !target.exact || sameShape(mine, target.cells);
    const result = mine.length === want ? (shapeOk ? "right" : "count") : "wrong";
    setChecked(result);
    events.state({ step: buildStep, dots: mine.length, expected: want, result });
    if (result === "right") {
      setMessage(tr(locale, `Yes! Step ${buildStep} has ${want} dots.`, `对了！第 ${buildStep} 步有 ${want} 个点。`));
      if (!completed.current) {
        completed.current = true;
        events.emit("completed", { moves: checks.current });
      }
    } else if (result === "count") {
      setMessage(tr(locale, `Right number (${want})! The shape is a little different from the pattern, though.`, `点数对了（${want}）！不过形状和规律有点不一样。`));
    } else {
      setMessage(tr(locale, `You lit ${mine.length}. Look at how each step grows from the one before.`, `你点亮了 ${mine.length} 个。看看每一步比上一步多了哪些点？`));
    }
  };

  // Pointer painting: press on a cell sets the paint value, dragging paints the same value.
  const cellFromEvent = (e: PointerEvent<SVGSVGElement>) => (document.elementFromPoint(e.clientX, e.clientY) as Element | null)?.closest<SVGElement>("[data-cell]")?.dataset.cell;
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    const key = cellFromEvent(e);
    if (!interactive || !key) return;
    paint.current = !lit.has(key);
    toggleCell(key, paint.current);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (paint.current === null) return;
    const key = cellFromEvent(e);
    if (key && lit.has(key) !== paint.current) toggleCell(key, paint.current);
  };
  const endPaint = () => {
    paint.current = null;
  };

  // Roving focus over the grid: one tab stop, arrows move, Enter/Space toggle.
  const onGridKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const d: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: grid.cols, ArrowUp: -grid.cols };
    const total = grid.cols * grid.rows;
    if (d[e.key] !== undefined) {
      e.preventDefault();
      const next = Math.max(0, Math.min(total - 1, focus + d[e.key]));
      setFocus(next);
      e.currentTarget.querySelector<SVGElement>(`[data-index="${next}"]`)?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleCell(`${grid.minX + (focus % grid.cols)},${grid.minY + Math.floor(focus / grid.cols)}`);
    }
  };

  const W = 360;
  const H = 220;

  // ----- hook / reveal / explore pictures -----
  const givenStrip = (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr(locale, `Steps 1 to ${steps.length}`, `第 1 到 ${steps.length} 步`)} className="h-full w-full">
      {steps.map((cells, i) => (
        <Dots key={i} cells={cells} box={[(i * W) / (steps.length + 1) + 4, 8, W / (steps.length + 1) - 8, H - 16]} centre={centre} mode={mode} label={tr(locale, `step ${i + 1}`, `第 ${i + 1} 步`)} reducedMotion={reducedMotion} />
      ))}
      <text x={(steps.length * W) / (steps.length + 1) + W / (steps.length + 1) / 2} y={H / 2} textAnchor="middle" dy="0.35em" className="fill-fun-purple text-[32px] font-bold">
        ?
      </text>
    </svg>
  );

  let picture = givenStrip;
  let status = message;
  if (phase === "hook") {
    status = tr(locale, `Step ${askStep}: how many dots?`, `第 ${askStep} 步有几个点？`);
  } else if (phase === "reveal") {
    const n = Math.max(1, Math.min(askStep, 1 + Math.floor(segment(progress, 0, 0.8) * askStep)));
    const shown = cellsAt(steps, rule, n);
    const count = countAtStep(rule, n);
    const final = segment(progress, 0.85, 1);
    picture = (
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr(locale, `Step ${n}: ${count} dots`, `第 ${n} 步：${count} 个点`)} className="h-full w-full">
        <Dots cells={shown.cells} box={[4, final > 0 ? 30 : 4, W - 8, final > 0 ? H - 56 : H - 30]} centre={shown.exact ? centre : [0, 0]} mode={shown.exact ? mode : "none"} reducedMotion />
        <text x={W / 2} y={H - 8} textAnchor="middle" className="fill-gray-800 text-[18px] font-bold">
          {tr(locale, `step ${n}: ${formatNumber(count, locale)}`, `第 ${n} 步：${formatNumber(count, locale)}`)}
        </text>
        <text x={W / 2} y={22} textAnchor="middle" className="fill-fun-pink text-[20px] font-bold" opacity={final}>
          {formatRule(rule)} → {formatRuleAt(rule, askStep)}
        </text>
      </svg>
    );
    status = tr(locale, `Each step follows ${formatRule(rule)}. Step ${askStep} has ${formatNumber(countAtStep(rule, askStep), locale)} dots.`, `每一步都是 ${formatRule(rule)}。第 ${askStep} 步有 ${formatNumber(countAtStep(rule, askStep), locale)} 个点。`);
  } else if (view === "build") {
    const s = Math.min((W - 8) / grid.cols, (H - 8) / grid.rows);
    const ox = (W - s * grid.cols) / 2;
    const oy = (H - s * grid.rows) / 2;
    picture = (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="grid"
        aria-label={tr(locale, `Build step ${buildStep}: tap squares to light them`, `画第 ${buildStep} 步：点格子把它点亮`)}
        className="h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPaint}
        onPointerCancel={endPaint}
        onKeyDown={onGridKey}
      >
        {Array.from({ length: grid.cols * grid.rows }, (_, i) => {
          const cx = grid.minX + (i % grid.cols);
          const cy = grid.minY + Math.floor(i / grid.cols);
          const key = `${cx},${cy}`;
          const on = lit.has(key);
          return (
            <rect
              key={key}
              data-cell={key}
              data-index={i}
              role="gridcell"
              aria-selected={on}
              aria-label={tr(locale, `column ${i % grid.cols + 1}, row ${Math.floor(i / grid.cols) + 1}${on ? ", lit" : ""}`, `第 ${Math.floor(i / grid.cols) + 1} 行第 ${i % grid.cols + 1} 列${on ? "，已点亮" : ""}`)}
              tabIndex={i === focus ? 0 : -1}
              x={ox + (i % grid.cols) * s + GAP / 2}
              y={oy + Math.floor(i / grid.cols) * s + GAP / 2}
              width={s - GAP}
              height={s - GAP}
              rx={s / 4}
              className={`cursor-pointer outline-none focus-visible:stroke-fun-yellow ${on ? fillFor(colorGroup([cx, cy], centre, mode), mode) : "fill-white stroke-primary-200"}`}
              strokeWidth={on ? 0 : 1.5}
              onFocus={() => setFocus(i)}
            />
          );
        })}
      </svg>
    );
    status = message || tr(locale, `Light up step ${buildStep}, then press Check.`, `点亮第 ${buildStep} 步的点，然后按「检查」。`);
  } else {
    status = message || tr(locale, "How does each step grow? Try both colourings.", "每一步是怎么长大的？试试两种着色。");
  }

  const rows = [
    ...steps.map((c, i) => ({ n: i + 1, v: String(c.length) })),
    { n: buildStep, v: checked === "right" || checked === "count" ? String(countAtStep(rule, buildStep)) : "?" },
    { n: askStep, v: phase === "reveal" && progress >= 0.85 ? formatNumber(countAtStep(rule, askStep), locale) : "?" },
  ].filter((r, i, all) => all.findIndex((o) => o.n === r.n) === i);

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="min-h-0 min-w-0 flex-1">{picture}</div>
        <CountTable locale={locale} rows={rows} highlight={phase === "reveal" ? askStep : buildStep} />
      </div>
      <SceneMessage>{status}</SceneMessage>
      {interactive && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <SceneButton onClick={() => setView(view === "steps" ? "build" : "steps")} variant={view === "steps" ? "primary" : "ghost"}>
            {view === "steps" ? tr(locale, `Build step ${buildStep}`, `画第 ${buildStep} 步`) : tr(locale, "See the steps", "看前几步")}
          </SceneButton>
          {view === "build" && (
            <>
              <SceneButton onClick={check} variant="accent" disabled={lit.size === 0}>
                {tr(locale, "Check", "检查")}
              </SceneButton>
              <SceneButton onClick={() => setLit(new Set())} variant="ghost" disabled={lit.size === 0}>
                {tr(locale, "Clear", "清空")}
              </SceneButton>
            </>
          )}
          {(["arm", "ring", "none"] as const).map((m) => (
            <SceneButton key={m} onClick={() => setMode(m)} variant="ghost" ariaPressed={mode === m} className={mode === m ? "!border-fun-purple !bg-fun-purple/15" : ""}>
              {m === "arm" ? tr(locale, "By arms", "按胳膊着色") : m === "ring" ? tr(locale, "By rings", "按圈着色") : tr(locale, "One colour", "单色")}
            </SceneButton>
          ))}
        </div>
      )}
    </SceneFrame>
  );
}

function CountTable({ locale, rows, highlight }: { locale: SceneLocale; rows: Array<{ n: number; v: string }>; highlight: number }) {
  return (
    <table className="w-16 shrink-0 self-center text-center text-[11px] tabular-nums sm:w-20 sm:text-xs" aria-label={tr(locale, "Dots at each step", "每一步的点数")}>
      <thead>
        <tr className="text-gray-500">
          <th className="font-normal">{tr(locale, "step", "步")}</th>
          <th className="font-normal">{tr(locale, "dots", "点")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.n} className={r.n === highlight ? "bg-fun-yellow/30 font-bold text-gray-800" : "text-gray-600"}>
            <td>{r.n}</td>
            <td>{r.v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
