"use client";

import { motion } from "framer-motion";
import { useRef, useState, type KeyboardEvent } from "react";
import {
  RICE_REFERENCES,
  grainsOnSquare,
  groupDigits,
  log10Digits,
  scientific,
  totalGrains,
  worldRiceYears,
  type ChessboardDoublingConfig,
  type SceneProps,
} from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, SceneSvg, bi, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const COLS = 8;
const CELL = 30;
const BOARD_X = 6;
const BOARD_Y = 6;
const BARS_X = 262;
const BARS_W = 132;
const BAR_SLOTS = 8;
/** Linear bars fit the first 8 squares; after that they would overflow the panel. */
const LINEAR_SQUARES = 8;
const REVEAL_MS = 4200;
const LONG_DIGITS = 13;

/** Exact grains, grouped; very long numbers switch to scientific form. */
function showGrains(digits: string): string {
  return digits.length > LONG_DIGITS ? scientific(digits) : groupDigits(digits);
}

/** The biggest rice reference the board's total has passed. */
function passedReference(total: string) {
  const l = log10Digits(total);
  let best: (typeof RICE_REFERENCES)[number] | null = null;
  for (const r of RICE_REFERENCES) if (l >= Math.log10(r.grains)) best = r;
  return best;
}

/** A2: one grain on the first square, double on every next one. */
export default function ChessboardDoublingScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<ChessboardDoublingConfig>) {
  const { squares, startAmount: start, showLogScale, askSquare, unitLabel } = config;
  const events = useSceneEvents(onEvent);
  const [filled, setFilled] = useState(0);
  const proposedRef = useRef(false);
  const completedRef = useRef(false);
  const revealFrom = useRef(0);

  const advance = () => {
    if (phase !== "explore" || filled >= squares) return;
    events.interact();
    const k = filled + 1;
    setFilled(k);
    const grains = grainsOnSquare(k, start);
    events.state({ square: k, grains });
    if (askSquare !== undefined && k === askSquare && !proposedRef.current) {
      proposedRef.current = true;
      onProposeAnswer?.(grains);
    }
    if (k === squares && !completedRef.current) {
      completedRef.current = true;
      events.emit("completed", { moves: k });
    }
  };

  const reset = () => {
    setFilled(0);
    proposedRef.current = false;
    completedRef.current = false;
  };

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  if (phase !== "reveal") revealFrom.current = filled;
  const shown =
    phase === "hook" ? 4 : phase === "reveal" ? Math.round(revealFrom.current + (squares - revealFrom.current) * segment(progress, 0, 0.75)) : filled;

  const unit = bi(locale, unitLabel);
  const label = tr(locale, `A chessboard of ${squares} squares: each square doubles the last`, `${squares} 格的棋盘：每一格是前一格的两倍`);
  const grains = shown > 0 ? grainsOnSquare(shown, start) : "0";
  const total = shown > 0 ? totalGrains(shown, start) : "0";
  const ref = passedReference(total);
  const logMode = showLogScale && shown > LINEAR_SQUARES;
  const overflow = shown > LINEAR_SQUARES;

  const message = (() => {
    if (phase === "hook") return tr(locale, `1, 2, 4, 8, … what lands on square ${squares}?`, `1、2、4、8……第 ${squares} 格会有多少？`);
    if (phase === "reveal") {
      const years = worldRiceYears(totalGrains(squares, start));
      const yearsText = years >= 1 ? formatNumber(Math.round(years), locale) : years.toPrecision(2);
      return progress < 0.75
        ? tr(locale, `Fast-forward to square ${squares}…`, `快进到第 ${squares} 格……`)
        : tr(
            locale,
            `All ${squares} squares: ${showGrains(totalGrains(squares, start))} ${unit}, about ${yearsText} years of the world's rice.`,
            `${squares} 格加起来：${showGrains(totalGrains(squares, start))} ${unit}，大约是全世界 ${yearsText} 年的大米产量。`,
          );
    }
    if (filled === 0) return tr(locale, "Tap the first square to put the rice down.", "点第一格，放下米粒。");
    if (overflow) return logMode ? tr(locale, "The bars don't fit any more! Switched to a log scale: each step up is ×10.", "柱子已经画不下了！换成对数刻度：每升一格就是 ×10。") : tr(locale, "The bars don't fit any more!", "柱子已经画不下了！");
    return tr(locale, `Square ${filled}: ${showGrains(grains)} ${unit}. Next one doubles.`, `第 ${filled} 格：${showGrains(grains)} ${unit}。下一格翻倍。`);
  })();

  const interactive = phase === "explore";
  const rows = Math.ceil(squares / COLS);
  const boardH = rows * CELL;
  const H = Math.max(boardH + BOARD_Y * 2, 200);

  const onCellKey = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      advance();
    }
  };

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <motion.div className="min-h-0 flex-1" initial={phase === "reveal" && reducedMotion ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        <SceneSvg viewBox={`0 0 400 ${H}`} label={label}>
          {Array.from({ length: squares }, (_, i) => {
            const k = i + 1;
            const x = BOARD_X + (i % COLS) * CELL;
            const y = BOARD_Y + Math.floor(i / COLS) * CELL;
            const dark = (Math.floor(i / COLS) + (i % COLS)) % 2 === 1;
            const isFilled = k <= shown;
            const isNext = interactive && k === filled + 1;
            const isAsk = askSquare === k;
            return (
              <g
                key={k}
                role={isNext ? "button" : undefined}
                tabIndex={isNext ? 0 : -1}
                aria-label={isNext ? tr(locale, `Square ${k}: put the rice down`, `第 ${k} 格：放米`) : undefined}
                onClick={isNext ? advance : undefined}
                onKeyDown={isNext ? onCellKey : undefined}
                className={`outline-none ${isNext ? "cursor-pointer [&:focus-visible>rect]:stroke-fun-yellow" : ""}`}
              >
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  className={isFilled ? (k === shown ? "fill-fun-orange" : "fill-fun-yellow/70") : dark ? "fill-primary-200" : "fill-white"}
                  stroke={isNext ? "#2563eb" : isAsk ? "#ff6b9d" : "transparent"}
                  strokeWidth={isNext || isAsk ? 3 : 0}
                />
                <text x={x + CELL / 2} y={y + CELL / 2} textAnchor="middle" dy="0.35em" className={`text-[10px] ${isFilled ? "fill-white font-bold" : "fill-gray-400"}`} style={{ pointerEvents: "none" }}>
                  {k}
                </text>
              </g>
            );
          })}
          <Bars shown={shown} start={start} squares={squares} logMode={logMode} height={H} locale={locale} />
        </SceneSvg>
      </motion.div>
      <SceneMessage>{message}</SceneMessage>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Counter label={tr(locale, "square", "格")} value={`${shown}/${squares}`} />
        <Counter label={unit} value={showGrains(phase === "reveal" && progress >= 0.75 ? totalGrains(squares, start) : grains)} tone="pink" />
        {ref && <Counter label={tr(locale, "more than", "超过")} value={bi(locale, ref.label)} tone="green" />}
        {interactive && (
          <>
            <SceneButton onClick={advance} disabled={filled >= squares}>
              {filled === 0 ? tr(locale, "First square", "放第一格") : tr(locale, "Next square ×2", "下一格 ×2")}
            </SceneButton>
            <SceneButton onClick={reset} variant="ghost" disabled={filled === 0}>
              {tr(locale, "Reset", "重来")}
            </SceneButton>
          </>
        )}
      </div>
    </SceneFrame>
  );
}

/** The last few squares as bars; linear until they overflow, then log10 (or clamped). */
function Bars({ shown, start, squares, logMode, height, locale }: { shown: number; start: number; squares: number; logMode: boolean; height: number; locale: SceneLocale }) {
  const top = 22;
  const bottom = height - 20;
  const plot = bottom - top;
  const first = Math.max(1, shown - BAR_SLOTS + 1);
  const ks = shown === 0 ? [] : Array.from({ length: shown - first + 1 }, (_, i) => first + i);
  const linearMax = Math.log10(start) + (LINEAR_SQUARES - 1) * Math.log10(2);
  const logMax = Math.log10(start) + (squares - 1) * Math.log10(2) + 0.3;
  const slot = BARS_W / BAR_SLOTS;
  const heightOf = (k: number) => {
    const l = log10Digits(grainsOnSquare(k, start));
    if (logMode) return ((l + 0.3) / (logMax + 0.3)) * plot;
    return Math.min(1, 10 ** (l - linearMax)) * plot;
  };
  return (
    <g>
      <text x={BARS_X + BARS_W / 2} y={12} textAnchor="middle" className="fill-gray-500 text-[10px] font-bold">
        {logMode ? tr(locale, "log scale (×10 per line)", "对数刻度（每格 ×10）") : tr(locale, "grains per square", "每格米粒")}
      </text>
      {logMode &&
        Array.from({ length: Math.floor(logMax) + 1 }, (_, p) => p)
          .filter((p) => p % 3 === 0)
          .map((p) => {
            const y = bottom - ((p + 0.3) / (logMax + 0.3)) * plot;
            return (
              <g key={p}>
                <line x1={BARS_X} x2={BARS_X + BARS_W} y1={y} y2={y} className="stroke-gray-200" strokeDasharray="3 3" />
                <text x={BARS_X - 2} y={y} textAnchor="end" dy="0.35em" className="fill-gray-400 text-[8px]">
                  10^{p}
                </text>
              </g>
            );
          })}
      <line x1={BARS_X} x2={BARS_X + BARS_W} y1={bottom} y2={bottom} className="stroke-gray-300" strokeWidth={1.5} />
      {ks.map((k, i) => {
        const h = Math.max(1, heightOf(k));
        const x = BARS_X + i * slot + slot * 0.15;
        return (
          <g key={k}>
            <rect x={x} y={bottom - h} width={slot * 0.7} height={h} rx={3} className={k === shown ? "fill-fun-orange" : "fill-fun-yellow"} style={{ transition: "y 250ms, height 250ms" }} />
            <text x={x + slot * 0.35} y={bottom + 12} textAnchor="middle" className="fill-gray-500 text-[9px]">
              {k}
            </text>
          </g>
        );
      })}
      {!logMode && shown > LINEAR_SQUARES && (
        <text x={BARS_X + BARS_W / 2} y={top + 10} textAnchor="middle" className="fill-fun-pink text-[10px] font-bold">
          {tr(locale, "↑ off the chart", "↑ 画不下了")}
        </text>
      )}
    </g>
  );
}
