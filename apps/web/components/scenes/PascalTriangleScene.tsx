"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { diagonalSums, pascalTriangle, shallowDiagonal, type PascalTriangleConfig, type SceneProps } from "@gmq/animation-engine";
import { SceneButton, SceneFrame, SceneMessage, focusSibling, formatNumber, tr } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 290;
const H = 200;
const MID = 118;
const SUM_X = 262;
const REVEAL_MS = 7000;

type ColourMode = 0 | 2 | 3;
const NEXT_MODE: Record<ColourMode, ColourMode> = { 0: 2, 2: 3, 3: 0 };
const key = (r: number, c: number) => `${r},${c}`;

/** E4: every number is the sum of the two above it. What do the rows add up to? */
export default function PascalTriangleScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<PascalTriangleConfig>) {
  const R = config.rows;
  const askRow = config.askRow ?? R;
  const events = useSceneEvents(onEvent);
  const tri = useMemo(() => pascalTriangle(R), [R]);
  const totalCells = ((R + 1) * (R + 2)) / 2;
  const initial = useMemo(() => {
    const s = new Set<string>();
    for (let r = 0; r < Math.min(config.prefilled, R + 1); r++) for (let c = 0; c <= r; c++) s.add(key(r, c));
    return s;
  }, [config.prefilled, R]);
  const [filled, setFilled] = useState<Set<string>>(initial);
  const [last, setLast] = useState<[number, number] | null>(null);
  const [moves, setMoves] = useState(0);
  const [mode, setMode] = useState<ColourMode>(0);
  const [note, setNote] = useState("");
  const completedRef = useRef(false);
  const explore = phase === "explore";

  const dy = (H - 10) / (R + 1);
  const dx = Math.min((2 * MID - 4) / (R + 1), dy * 1.3);
  const rad = Math.min(dx, dy) * 0.46;
  const X = (r: number, c: number) => MID + (c - r / 2) * dx;
  const Y = (r: number) => 5 + (r + 0.5) * dy;

  const canFill = (s: Set<string>, r: number, c: number) => !s.has(key(r, c)) && (c === 0 || c === r || (s.has(key(r - 1, c - 1)) && s.has(key(r - 1, c))));
  const rowDone = (s: Set<string>, r: number) => tri[r].every((_, c) => s.has(key(r, c)));

  const commit = (next: Set<string>, added: number, at: [number, number]) => {
    events.interact();
    const m = moves + added;
    setFilled(next);
    setMoves(m);
    setLast(at);
    setNote("");
    let rowsComplete = 0;
    while (rowsComplete <= R && rowDone(next, rowsComplete)) rowsComplete++;
    events.state({ filled: next.size, total: totalCells, rowsComplete });
    if (next.size === totalCells && !completedRef.current) {
      completedRef.current = true;
      events.emit("completed", { moves: m });
    }
  };

  const tapCell = (r: number, c: number) => {
    if (!explore || filled.has(key(r, c))) return;
    if (!canFill(filled, r, c)) {
      events.interact();
      setNote(tr(locale, "Fill the two numbers above it first.", "先把它上面的两个数填好。"));
      return;
    }
    commit(new Set(filled).add(key(r, c)), 1, [r, c]);
  };
  const fillNext = () => {
    for (let r = 0; r <= R; r++) for (let c = 0; c <= r; c++) if (canFill(filled, r, c)) return tapCell(r, c);
  };
  const fillRow = () => {
    let r = 0;
    while (r <= R && rowDone(filled, r)) r++;
    if (r > R) return;
    const next = new Set(filled);
    let added = 0;
    for (let c = 0; c <= r; c++) {
      if (next.has(key(r, c))) continue;
      next.add(key(r, c));
      added++;
    }
    commit(next, added, [r, r]);
  };
  const reset = () => {
    setFilled(initial);
    setLast(null);
    setNote("");
    completedRef.current = false;
  };

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const revealRows = phase === "reveal" ? Math.ceil(segment(progress, 0, 0.45) * (R + 1) - 1e-9) : 0;
  const askLit = phase === "reveal" && progress >= 0.45;
  const diagCount = phase === "reveal" ? Math.ceil(segment(progress, 0.62, 0.98) * (R + 1) - 1e-9) : 0;
  const diagSums = useMemo(() => diagonalSums(R + 1), [R]);
  const diagCells = useMemo(() => (diagCount > 0 ? new Set(shallowDiagonal(diagCount - 1).map(([r, c]) => key(r, c))) : new Set<string>()), [diagCount]);

  const isShown = (r: number, c: number) => (phase === "hook" ? r < Math.min(5, R + 1) : filled.has(key(r, c)) || r < revealRows);
  const rowShown = (r: number) => tri[r].every((_, c) => isShown(r, c));
  const parents = last && last[1] > 0 && last[1] < last[0] ? new Set([key(last[0] - 1, last[1] - 1), key(last[0] - 1, last[1])]) : new Set<string>();
  const coloured = (v: number) => mode !== 0 && v % mode === 0;

  const label = tr(locale, `Pascal's triangle, rows 0 to ${R}`, `杨辉三角，第 0 到第 ${R} 行`);
  const fmt = (v: number) => formatNumber(v, locale);
  const msg = (() => {
    if (phase === "hook") return tr(locale, "Each number is the sum of the two above it; the edges are all 1. Add up each row…", "每个数等于它上面两个数的和，两边都是 1。把每一行加起来……");
    if (phase === "reveal") {
      if (diagCount > 0) return tr(locale, `Shallow diagonals add up to ${diagSums.slice(0, diagCount).join(", ")}… Fibonacci again!`, `沿浅斜线相加：${diagSums.slice(0, diagCount).join("、")}……又是斐波那契！`);
      if (askLit) return tr(locale, `Row ${askRow} adds up to 2^${askRow} = ${fmt(2 ** askRow)}: every number is passed down to two below, so each row doubles.`, `第 ${askRow} 行的和是 2^${askRow} = ${fmt(2 ** askRow)}：每个数都传给下面两个数，所以每行翻倍。`);
      return tr(locale, "Row sums: 1, 2, 4, 8, … each one doubles.", "每行的和：1、2、4、8……每次翻倍。");
    }
    if (filled.size === totalCells) return tr(locale, `All ${totalCells} numbers filled in ${moves} taps. Look at the row sums!`, `${totalCells} 个数全部填好（${moves} 次）。看看每行的和！`);
    if (note) return note;
    if (last && parents.size) return `${fmt(tri[last[0] - 1][last[1] - 1])} + ${fmt(tri[last[0] - 1][last[1]])} = ${fmt(tri[last[0]][last[1]])}`;
    return tr(locale, "Tap an empty circle whose two parents are filled, or use Fill next.", "点一个上面两个数都填好的空圈，或者点「填下一个」。");
  })();

  const onCellKey = (e: KeyboardEvent<SVGGElement>, r: number, c: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tapCell(r, c);
    }
  };

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={label} className="h-full w-full" onKeyDown={(e) => focusSibling(e, ".pascal-cell")}>
          {tri.map((row, r) => (
            <g key={r}>
              {row.map((v, c) => {
                const shown = isShown(r, c);
                const k = key(r, c);
                const open = explore && canFill(filled, r, c);
                const fillClass = diagCells.has(k)
                  ? "fill-fun-cyan"
                  : shown && coloured(v)
                    ? "fill-fun-pink"
                    : shown
                      ? r === askRow && askLit
                        ? "fill-fun-yellow"
                        : "fill-white"
                      : open
                        ? "fill-primary-100"
                        : "fill-gray-100";
                const digits = String(v).length;
                return (
                  <g
                    key={c}
                    className={`outline-none ${open ? "pascal-cell cursor-pointer" : ""} [&:focus-visible>circle]:stroke-fun-yellow`}
                    role={open ? "button" : undefined}
                    tabIndex={open ? 0 : -1}
                    aria-label={shown ? `${v}` : tr(locale, `Empty: row ${r}, place ${c}`, `空：第 ${r} 行第 ${c} 个`)}
                    onClick={() => tapCell(r, c)}
                    onKeyDown={(e) => onCellKey(e, r, c)}
                  >
                    <circle cx={X(r, c)} cy={Y(r)} r={rad} className={`${fillClass} ${parents.has(k) || (last?.[0] === r && last?.[1] === c) ? "stroke-fun-orange" : open ? "stroke-primary-400" : "stroke-gray-300"}`} strokeWidth={parents.has(k) ? 2 : 1} strokeDasharray={shown ? undefined : "2 1.5"} />
                    {shown && (
                      <text x={X(r, c)} y={Y(r)} textAnchor="middle" dy="0.35em" className="fill-gray-800 font-bold" style={{ fontSize: rad * (digits >= 3 ? 0.72 : digits === 2 ? 0.95 : 1.1), pointerEvents: "none" }}>
                        {v}
                      </text>
                    )}
                  </g>
                );
              })}
              {rowShown(r) && (
                <text x={SUM_X} y={Y(r)} dy="0.35em" textAnchor="middle" className={`${r === askRow && askLit ? "fill-fun-pink text-[10px]" : "fill-primary-600 text-[8px]"} font-bold tabular-nums`}>
                  {/* The asked row's sum is the answer: "?" until the reveal lights it. */}
                  {r === askRow && !askLit ? "?" : fmt(2 ** r)}
                </text>
              )}
              {phase === "reveal" && r > 0 && rowShown(r) && (
                <text x={SUM_X + 20} y={Y(r) - dy / 2} dy="0.35em" textAnchor="middle" className="fill-gray-400 text-[6px]">
                  ×2
                </text>
              )}
            </g>
          ))}
          {phase === "explore" && (
            <text x={2} y={2} dy="0.8em" className={`text-[9px] font-bold ${filled.size === totalCells ? "fill-green-700" : "fill-primary-700"}`}>
              {tr(locale, `filled ${filled.size}/${totalCells}`, `已填 ${filled.size}/${totalCells}`)}
            </text>
          )}
          <text x={SUM_X} y={2} dy="0.7em" textAnchor="middle" className="fill-gray-400 text-[7px]">
            {tr(locale, "sum", "和")}
          </text>
        </svg>
      </div>
      <SceneMessage>{msg}</SceneMessage>
      {explore && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          <SceneButton onClick={fillNext} disabled={filled.size === totalCells}>
            {tr(locale, "Fill next", "填下一个")}
          </SceneButton>
          <SceneButton onClick={fillRow} variant="ghost" disabled={filled.size === totalCells}>
            {tr(locale, "Fill a row", "填一整行")}
          </SceneButton>
          <SceneButton onClick={() => setMode(NEXT_MODE[mode])} variant={mode === 0 ? "ghost" : "accent"} ariaPressed={mode !== 0}>
            {mode === 0 ? tr(locale, "Colour: off", "涂色：关") : mode === 2 ? tr(locale, "Colour: evens", "涂色：偶数") : tr(locale, "Colour: ×3", "涂色：3 的倍数")}
          </SceneButton>
          <SceneButton onClick={reset} variant="ghost" disabled={filled.size === initial.size} ariaLabel={tr(locale, "Reset", "重来")}>
            ↺
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}
