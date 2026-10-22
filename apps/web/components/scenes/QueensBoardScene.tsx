"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  attackedSquares,
  clashingQueens,
  colsFromQueens,
  isQueensSolution,
  mirrorKey,
  queensFromCols,
  queensSolutions,
  solutionKey,
  type Queen,
  type QueensBoardConfig,
  type SceneProps,
} from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const SIZE = 200;
const REVEAL_SHOWN = 12;
const REVEAL_MIN_MS = 3000;
const MS_PER_SOLUTION = 450;
const FOUND_SHOWN = 8;
const ARROWS: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

/** F7: n queens on an n × n board, no two on the same row, column or diagonal. */
export default function QueensBoardScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<QueensBoardConfig>) {
  const { n, countSolutions, dedupeMirrors } = config;
  const events = useSceneEvents(onEvent);
  const [queens, setQueens] = useState<Queen[]>([]);
  const [found, setFound] = useState<number[][]>([]);
  const [focus, setFocus] = useState(0);
  const [note, setNote] = useState("");
  const completedRef = useRef(false);
  const boardRef = useRef<SVGSVGElement>(null);
  const explore = phase === "explore";
  const cell = SIZE / n;

  const keyOf = (cols: readonly number[]) => (dedupeMirrors ? mirrorKey(cols) : solutionKey(cols));
  const distinct = useMemo(() => {
    const seen = new Set<string>();
    return queensSolutions(n).filter((cols) => {
      const k = dedupeMirrors ? mirrorKey(cols) : solutionKey(cols);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [n, dedupeMirrors]);
  const total = distinct.length;

  const revealMs = Math.max(REVEAL_MIN_MS, Math.min(REVEAL_SHOWN, total) * MS_PER_SOLUTION / 0.85);
  const progress = useRevealProgress(phase === "reveal", revealMs, reducedMotion, () => events.emit("reveal_done"));
  const revealList = distinct.slice(0, REVEAL_SHOWN);
  const revealCount = phase === "reveal" ? Math.max(1, Math.ceil(segment(progress, 0, 0.85) * revealList.length)) : 0;

  const hookQueen: Queen = [Math.max(0, Math.floor(n / 2) - 1), 1];
  const shown: Queen[] = phase === "reveal" ? queensFromCols(revealList[revealCount - 1]) : phase === "hook" ? [hookQueen] : queens;
  const attacked = useMemo(() => attackedSquares(shown, n), [shown, n]);
  const clashes = clashingQueens(shown);

  const toggle = (r: number, c: number) => {
    if (!explore) return;
    events.interact();
    setFocus(r * n + c);
    const has = queens.findIndex(([qr, qc]) => qr === r && qc === c);
    let next: Queen[];
    if (has >= 0) next = queens.filter((_, i) => i !== has);
    else if (queens.length >= n) {
      setNote(tr(locale, `There are already ${n} queens. Tap one to pick it up first.`, `棋盘上已经有 ${n} 个皇后了。先点一个拿走。`));
      return;
    } else next = [...queens, [r, c] as const];
    setQueens(next);
    let nextFound = found;
    if (isQueensSolution(next, n)) {
      const cols = colsFromQueens(next, n) as number[];
      if (found.some((f) => keyOf(f) === keyOf(cols))) setNote(tr(locale, "A solution, but you already found that one.", "是一个解，不过你已经找到过了。"));
      else {
        nextFound = [...found, cols];
        setFound(nextFound);
        setNote(
          nextFound.length === total
            ? tr(locale, `You found all ${total}!`, `${total} 个解全找到了！`)
            : tr(locale, "New solution! Clear the board and look for another.", "新的解！清空棋盘再找找别的。"),
        );
        if (nextFound.length === total && !completedRef.current) {
          completedRef.current = true;
          events.emit("completed", { found: nextFound.length, total, moves: nextFound.length });
        }
      }
    } else setNote("");
    events.state({ queens: next.length, found: nextFound.length });
  };

  const clear = () => {
    setQueens([]);
    setNote("");
  };

  const onBoardKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!explore) return;
    const d = ARROWS[e.key];
    if (!d) return;
    e.preventDefault();
    const r = Math.min(n - 1, Math.max(0, Math.floor(focus / n) + d[0]));
    const c = Math.min(n - 1, Math.max(0, (focus % n) + d[1]));
    setFocus(r * n + c);
    boardRef.current?.querySelector<SVGGElement>(`[data-cell="${r * n + c}"]`)?.focus();
  };
  const onCellKey = (e: KeyboardEvent<SVGGElement>, r: number, c: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(r, c);
    }
  };

  const label = tr(locale, `${n} queens on a ${n} × ${n} board`, `${n} × ${n} 棋盘上的 ${n} 个皇后`);
  const msg = (() => {
    if (phase === "hook") return tr(locale, `A queen attacks along rows, columns and diagonals. Can ${n} queens stay safe?`, `皇后能攻击同一行、同一列和斜线。${n} 个皇后能互不攻击吗？`);
    if (phase === "reveal") {
      if (n === 4 && !dedupeMirrors && total === 2) return tr(locale, "Only 2 solutions, and they are mirror images of each other.", "只有 2 种摆法，而且它们互为镜像。");
      return total > REVEAL_SHOWN ? tr(locale, `… ${total} in all.`, `……一共 ${total} 种。`) : tr(locale, `${total} solutions in all.`, `一共 ${total} 种摆法。`);
    }
    if (note) return note;
    if (clashes.size > 0) return tr(locale, "Red queens attack each other.", "红色的皇后互相攻击了。");
    return tr(locale, "Tap a square to place a queen; tap again to remove it.", "点格子放皇后，再点一次拿走。");
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="min-h-0 min-w-0 flex-1">
          <svg ref={boardRef} viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label={label} className="h-full w-full" onKeyDown={onBoardKey}>
            {Array.from({ length: n * n }, (_, i) => {
              const r = Math.floor(i / n);
              const c = i % n;
              const qi = shown.findIndex(([qr, qc]) => qr === r && qc === c);
              const dark = (r + c) % 2 === 1;
              return (
                <g
                  key={i}
                  data-cell={i}
                  role={explore ? "button" : undefined}
                  tabIndex={explore ? (i === focus ? 0 : -1) : -1}
                  aria-label={tr(locale, `Row ${r + 1}, column ${c + 1}${qi >= 0 ? ", queen" : attacked.has(i) ? ", attacked" : ""}`, `第 ${r + 1} 行第 ${c + 1} 列${qi >= 0 ? "，有皇后" : attacked.has(i) ? "，被攻击" : ""}`)}
                  aria-pressed={explore ? qi >= 0 : undefined}
                  className={`outline-none ${explore ? "cursor-pointer" : ""} [&:focus-visible>rect.ring]:stroke-fun-yellow`}
                  onClick={() => toggle(r, c)}
                  onKeyDown={(e) => onCellKey(e, r, c)}
                >
                  <rect x={c * cell} y={r * cell} width={cell} height={cell} className={dark ? "fill-amber-300" : "fill-amber-50"} />
                  {attacked.has(i) && <rect x={c * cell} y={r * cell} width={cell} height={cell} className="fill-fun-red/30" />}
                  <rect className="ring" x={c * cell + 1.5} y={r * cell + 1.5} width={cell - 3} height={cell - 3} fill="none" stroke="transparent" strokeWidth={3} />
                  {qi >= 0 && (
                    <text x={c * cell + cell / 2} y={r * cell + cell / 2} dy="0.36em" textAnchor="middle" fontSize={cell * 0.72} className={clashes.has(qi) ? "fill-fun-red" : "fill-gray-900"} style={{ pointerEvents: "none" }}>
                      ♛
                    </text>
                  )}
                </g>
              );
            })}
            <rect x={0} y={0} width={SIZE} height={SIZE} fill="none" className="stroke-amber-800" strokeWidth={2} />
          </svg>
        </div>
        {phase !== "hook" && (
          <div className="flex w-24 shrink-0 flex-col items-center gap-1 overflow-hidden sm:w-40">
            <span className="text-[10px] text-gray-500 sm:text-xs">{phase === "reveal" ? tr(locale, "all solutions", "全部解") : tr(locale, "found", "已找到")}</span>
            <div className="flex flex-wrap justify-center gap-1">
              {(phase === "reveal" ? revealList.slice(0, revealCount) : found.slice(-FOUND_SHOWN)).map((cols) => (
                <MiniBoard key={solutionKey(cols)} cols={cols} locale={locale} />
              ))}
            </div>
            {phase === "reveal" && total > REVEAL_SHOWN && revealCount === revealList.length && <span className="text-[10px] text-gray-500">{tr(locale, `… ${total} in all`, `……共 ${total} 种`)}</span>}
          </div>
        )}
      </div>
      <SceneMessage>{msg}</SceneMessage>
      {explore && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Counter label={tr(locale, "queens", "皇后")} value={`${queens.length}/${n}`} />
          <Counter label={tr(locale, "solutions", "解")} value={countSolutions ? `${found.length}/${total}` : found.length} tone={found.length > 0 ? "green" : "primary"} />
          <SceneButton onClick={clear} variant="ghost" disabled={queens.length === 0}>
            {tr(locale, "Clear", "清空")}
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

function MiniBoard({ cols, locale }: { cols: readonly number[]; locale: SceneLocale }) {
  const n = cols.length;
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="h-9 w-9 rounded-sm sm:h-11 sm:w-11" role="img" aria-label={tr(locale, `Solution: columns ${cols.map((c) => c + 1).join(", ")}`, `解：各行的列 ${cols.map((c) => c + 1).join("、")}`)}>
      {Array.from({ length: n * n }, (_, i) => (
        <rect key={i} x={i % n} y={Math.floor(i / n)} width={1} height={1} className={(Math.floor(i / n) + (i % n)) % 2 ? "fill-amber-300" : "fill-amber-50"} />
      ))}
      {cols.map((c, r) => (
        <circle key={r} cx={c + 0.5} cy={r + 0.5} r={0.36} className="fill-gray-900" />
      ))}
    </svg>
  );
}
