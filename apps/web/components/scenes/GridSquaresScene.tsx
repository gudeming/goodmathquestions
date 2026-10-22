"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { countSquares, squaresOfSize, type GridSquaresConfig, type SceneProps } from "@gmq/animation-engine";
import { SceneButton, SceneFrame, SceneMessage, tr } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const BOARD = 320;
const PAD = 8;
const STAGE_MS = 700;
const SIZE_STROKES = ["stroke-fun-pink", "stroke-fun-purple", "stroke-fun-cyan", "stroke-fun-green", "stroke-fun-yellow", "stroke-fun-orange", "stroke-primary-500", "stroke-fun-red"];

type Pos = { r: number; c: number };

/** B1: how many squares of every size hide on an n x n board? */
export default function GridSquaresScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<GridSquaresConfig>) {
  const n = config.size;
  const cell = (BOARD - PAD * 2) / n;
  const total = countSquares(n);
  const events = useSceneEvents(onEvent);
  const [k, setK] = useState(1);
  const [pos, setPos] = useState<Pos>({ r: 0, c: 0 });
  const [found, setFound] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const taps = useRef(0);
  const completedRef = useRef(false);

  const foundSet = useMemo(() => new Set(found), [found]);
  const perSize = useMemo(() => {
    const counts = Array.from({ length: n + 1 }, () => 0);
    for (const key of found) counts[Number(key.split(":")[0])]++;
    return counts;
  }, [found, n]);

  const clampPos = (p: Pos, size: number): Pos => ({ r: Math.max(0, Math.min(n - size, p.r)), c: Math.max(0, Math.min(n - size, p.c)) });

  const chooseSize = (size: number) => {
    events.interact();
    setK(size);
    setPos((p) => clampPos(p, size));
  };

  const record = () => {
    if (phase !== "explore") return;
    events.interact();
    taps.current++;
    const key = `${k}:${pos.r}:${pos.c}`;
    if (foundSet.has(key)) {
      setMessage(tr(locale, "Already counted that one!", "这个已经数过了！"));
      return;
    }
    const next = [...found, key];
    setFound(next);
    const sizeFound = perSize[k] + 1;
    const sizeTotal = squaresOfSize(n, k);
    setMessage(tr(locale, `${k}×${k}: ${sizeFound} of ${sizeTotal}`, `${k}×${k}：${sizeFound} / ${sizeTotal}`));
    events.state({ size: k, found: sizeFound, sizeTotal, allFound: next.length, total, sizeComplete: sizeFound === sizeTotal });
    if (next.length === total && !completedRef.current) {
      completedRef.current = true;
      events.emit("completed", { moves: taps.current });
      onProposeAnswer?.(String(total));
      setMessage(tr(locale, `All ${total} squares found!`, `${total} 个正方形全找到了！`));
    }
  };

  const toBoard = (e: PointerEvent<SVGSVGElement>): Pos | null => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = Math.min(rect.width, rect.height) / BOARD;
    const ox = rect.left + (rect.width - BOARD * scale) / 2;
    const oy = rect.top + (rect.height - BOARD * scale) / 2;
    const x = (e.clientX - ox) / scale - PAD;
    const y = (e.clientY - oy) / scale - PAD;
    if (x < 0 || y < 0 || x > n * cell || y > n * cell) return null;
    // Centre the frame under the pointer.
    return clampPos({ r: Math.floor(y / cell - (k - 1) / 2), c: Math.floor(x / cell - (k - 1) / 2) }, k);
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const p = toBoard(e);
    if (p && (p.r !== pos.r || p.c !== pos.c)) setPos(p);
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const moves: Record<string, Pos> = { ArrowUp: { r: -1, c: 0 }, ArrowDown: { r: 1, c: 0 }, ArrowLeft: { r: 0, c: -1 }, ArrowRight: { r: 0, c: 1 } };
    const d = moves[e.key];
    if (d) {
      e.preventDefault();
      events.interact();
      setPos((p) => clampPos({ r: p.r + d.r, c: p.c + d.c }, k));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      record();
    } else if (/^[1-8]$/.test(e.key) && Number(e.key) <= n) chooseSize(Number(e.key));
  };

  const stages = n;
  const progress = useRevealProgress(phase === "reveal", stages * STAGE_MS + 800, reducedMotion, () => events.emit("reveal_done"));
  const label = tr(locale, `A ${n}×${n} board`, `${n}×${n} 的棋盘`);

  // Reveal: sweep every size; the table fills as each size finishes.
  const sweepEnd = (stages * STAGE_MS) / (stages * STAGE_MS + 800);
  const revealStage = progress >= sweepEnd ? n + 1 : Math.floor((progress / sweepEnd) * stages) + 1;
  const stageT = progress >= sweepEnd ? 1 : segment(progress / sweepEnd, (revealStage - 1) / stages, revealStage / stages);

  let frame: (Pos & { size: number }) | null = null;
  if (phase === "explore") frame = { ...pos, size: k };
  else if (phase === "hook") frame = { r: 0, c: 0, size: 2 };
  else if (revealStage <= n && !reducedMotion) {
    const side = n - revealStage + 1;
    const idx = Math.min(side * side - 1, Math.floor(stageT * side * side));
    frame = { r: Math.floor(idx / side), c: idx % side, size: revealStage };
  }

  const shownFound = phase === "explore" ? found.filter((key) => key.startsWith(`${k}:`)) : [];
  const rows = Array.from({ length: n }, (_, i) => i + 1);
  const rowValue = (size: number) => (phase === "reveal" ? (size < revealStage ? squaresOfSize(n, size) : null) : phase === "hook" ? null : perSize[size]);
  const done = phase === "reveal" && revealStage > n;

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="flex h-full min-w-0 flex-1 justify-center">
          <svg
            viewBox={`0 0 ${BOARD} ${BOARD}`}
            preserveAspectRatio="xMidYMid meet"
            role="application"
            aria-label={tr(locale, `${label}. Arrow keys move the ${k}×${k} frame, Enter counts it, number keys change size.`, `${label}。方向键移动 ${k}×${k} 框，回车计数，数字键换尺寸。`)}
            tabIndex={phase === "explore" ? 0 : -1}
            className="aspect-square h-full max-w-full touch-none rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-fun-yellow"
            onPointerMove={phase === "explore" ? onMove : undefined}
            onPointerDown={phase === "explore" ? onMove : undefined}
            onClick={phase === "explore" ? record : undefined}
            onKeyDown={phase === "explore" ? onKey : undefined}
          >
            {Array.from({ length: n * n }, (_, i) => {
              const r = Math.floor(i / n);
              const c = i % n;
              return <rect key={i} x={PAD + c * cell} y={PAD + r * cell} width={cell} height={cell} className={(r + c) % 2 === 0 ? "fill-primary-100" : "fill-white"} />;
            })}
            <rect x={PAD} y={PAD} width={n * cell} height={n * cell} fill="none" className="stroke-primary-300" strokeWidth={2} />
            {shownFound.map((key) => {
              const [, r, c] = key.split(":").map(Number);
              return <rect key={key} x={PAD + c * cell + 3} y={PAD + r * cell + 3} width={k * cell - 6} height={k * cell - 6} rx={4} fill="none" className={SIZE_STROKES[(k - 1) % SIZE_STROKES.length]} strokeWidth={2} opacity={0.45} />;
            })}
            {phase === "hook" && <rect x={PAD + (n - 3) * cell} y={PAD + (n - 3) * cell} width={3 * cell} height={3 * cell} rx={4} fill="none" className="stroke-fun-cyan" strokeWidth={4} />}
            {frame && (
              <motion.rect
                animate={{ x: PAD + frame.c * cell, y: PAD + frame.r * cell, width: frame.size * cell, height: frame.size * cell }}
                initial={false}
                transition={{ duration: reducedMotion || phase === "reveal" ? 0 : 0.08 }}
                rx={6}
                fill={foundSet.has(`${frame.size}:${frame.r}:${frame.c}`) ? "rgba(74,222,128,0.25)" : "rgba(192,132,252,0.18)"}
                className={SIZE_STROKES[(frame.size - 1) % SIZE_STROKES.length]}
                strokeWidth={4}
                style={{ pointerEvents: "none" }}
              />
            )}
          </svg>
        </div>
        <div className="flex w-24 shrink-0 flex-col justify-center gap-0.5 text-xs tabular-nums sm:w-32 sm:text-sm" aria-label={tr(locale, "Squares found by size", "按尺寸统计")}>
          {rows.map((size) => {
            const v = rowValue(size);
            const tot = squaresOfSize(n, size);
            return (
              <div key={size} className={`flex justify-between rounded px-1 ${phase === "explore" && size === k ? "bg-fun-purple/15 font-bold" : ""}`}>
                <span>
                  {size}×{size}
                </span>
                <span className={v === tot ? "font-bold text-green-600" : "text-gray-500"}>{v === null ? "?" : phase === "reveal" ? v : `${v}/${tot}`}</span>
              </div>
            );
          })}
          <div className="mt-1 flex justify-between border-t border-gray-200 px-1 font-bold">
            <span>{tr(locale, "Total", "合计")}</span>
            <span className={done ? "text-fun-pink" : ""}>{phase === "explore" ? found.length : done ? total : "?"}</span>
          </div>
        </div>
      </div>
      {done && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="text-center text-sm font-bold text-gray-800 sm:text-base">
          {rows.map((s) => squaresOfSize(n, s)).join(" + ")} = <span className="text-fun-pink">{total}</span>
        </motion.p>
      )}
      {phase === "explore" && (
        <>
          <SceneMessage>{message || tr(locale, "Pick a size, move the frame, tap to count a square.", "选一个尺寸，移动方框，点一下数一个。")}</SceneMessage>
          <div className="mt-1 flex gap-1 overflow-x-auto pb-1" role="group" aria-label={tr(locale, "Square size", "正方形尺寸")}>
            {rows.map((size) => (
              <SceneButton key={size} onClick={() => chooseSize(size)} variant={size === k ? "primary" : "ghost"} ariaPressed={size === k} className="shrink-0 px-2">
                {size}×{size}
              </SceneButton>
            ))}
          </div>
        </>
      )}
    </SceneFrame>
  );
}
