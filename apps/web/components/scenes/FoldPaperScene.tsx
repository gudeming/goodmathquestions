"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { REAL_FOLD_LIMIT, foldsToReach, formatLength, thicknessAfter, type FoldPaperConfig, type SceneProps } from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, SceneSvg, bi, tr } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 400;
const H = 240;
const PAPER_W = 150;
const PAPER_BASE_H = 4;
const PAPER_MAX_H = 150;
const RULER_X = 250;
const RULER_TOP = 16;
const RULER_BOTTOM = 224;
const REVEAL_MS = 4800;

/** A3: fold a sheet in half again and again; the ruler is logarithmic so the Moon fits. */
export default function FoldPaperScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<FoldPaperConfig>) {
  const { thicknessMm, maxFolds, references, labels } = config;
  const events = useSceneEvents(onEvent);
  const [folds, setFolds] = useState(0);
  const completedRef = useRef(false);
  const revealFrom = useRef(0);

  const fold = () => {
    if (phase !== "explore" || folds >= maxFolds) return;
    events.interact();
    const next = folds + 1;
    setFolds(next);
    events.state({ folds: next, thicknessMm: thicknessAfter(next, thicknessMm) });
    if (next === maxFolds && !completedRef.current) {
      completedRef.current = true;
      events.emit("completed", { moves: next });
    }
  };

  const unfold = () => {
    setFolds(0);
    completedRef.current = false;
  };

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  if (phase !== "reveal") revealFrom.current = folds;
  const shown = phase === "hook" ? 0 : phase === "reveal" ? Math.round(revealFrom.current + (maxFolds - revealFrom.current) * segment(progress, 0, 0.8)) : folds;
  const thick = thicknessAfter(shown, thicknessMm);

  // Log ruler from the bare sheet up to the higher of maxFolds and the tallest reference.
  const logMin = Math.min(Math.log10(thicknessMm), ...references.map((r) => Math.log10(r.heightMm))) - 0.1;
  const logMax = Math.max(Math.log10(thicknessAfter(maxFolds, thicknessMm)), ...references.map((r) => Math.log10(r.heightMm))) + 0.2;
  const yOf = (mm: number) => Math.max(RULER_TOP, Math.min(RULER_BOTTOM, RULER_BOTTOM - ((Math.log10(mm) - logMin) / (logMax - logMin)) * (RULER_BOTTOM - RULER_TOP)));
  const sorted = [...references].sort((a, b) => a.heightMm - b.heightMm);
  const passed = sorted.filter((r) => thick >= r.heightMm);
  const lastPassed = passed[passed.length - 1];

  const label = tr(locale, `A sheet of paper ${formatLength(thicknessMm, locale)} thick, folded again and again`, `一张 ${formatLength(thicknessMm, locale)} 厚的纸，一折再折`);
  const pretend = shown > REAL_FOLD_LIMIT;

  const message = (() => {
    if (phase === "hook") return labels?.hook ? bi(locale, labels.hook) : tr(locale, "Fold a sheet of paper in half, again and again. How thick does it get?", "一张纸对折、再对折……会变得多厚？");
    if (phase === "reveal") {
      if (progress < 0.8) return tr(locale, `Fast-forward to ${maxFolds} folds…`, `快进到折 ${maxFolds} 次……`);
      const top = sorted[sorted.length - 1];
      return tr(
        locale,
        `${maxFolds} folds: ${formatLength(thicknessAfter(maxFolds, thicknessMm), locale)}. Past ${bi(locale, top.label)} at fold ${foldsToReach(top.heightMm, thicknessMm)}. Each fold doubles; it never just "adds a bit".`,
        `折 ${maxFolds} 次：${formatLength(thicknessAfter(maxFolds, thicknessMm), locale)}。第 ${foldsToReach(top.heightMm, thicknessMm)} 次就超过了${bi(locale, top.label)}。每折一次翻一倍，而不是「多一点」。`,
      );
    }
    if (folds === 0) return tr(locale, "Tap “Fold once”: half as wide, twice as thick.", "点「折一次」：宽度减半，厚度翻倍。");
    if (pretend) return tr(locale, "Real paper can't fold any more… let's pretend!", "真的纸已经折不动了……我们假装继续折！");
    return lastPassed ? tr(locale, `Thicker than ${bi(locale, lastPassed.label)}!`, `比${bi(locale, lastPassed.label)}还厚！`) : tr(locale, `${folds} fold${folds === 1 ? "" : "s"}: still thin.`, `折了 ${folds} 次：还很薄。`);
  })();

  // Paper: half width, double thickness per fold (visually capped once it is a tall thin column).
  const paperW = Math.max(6, PAPER_W / 2 ** Math.min(shown, 5));
  const paperH = Math.min(PAPER_MAX_H, PAPER_BASE_H * 2 ** Math.min(shown, 6));
  const layers = shown <= 4 ? 2 ** shown : 0;
  const paperX = 20 + (PAPER_W - paperW) / 2;
  const paperY = RULER_BOTTOM - paperH;
  const fade = { duration: reducedMotion ? 0.2 : 0.35 };

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <SceneSvg viewBox={`0 0 ${W} ${H}`} label={label}>
          <line x1={10} x2={200} y1={RULER_BOTTOM} y2={RULER_BOTTOM} className="stroke-gray-300" strokeWidth={2} />
          <motion.rect
            initial={false}
            animate={{ x: paperX, y: paperY, width: paperW, height: paperH }}
            transition={fade}
            rx={2}
            className={pretend ? "fill-fun-purple/60" : "fill-white"}
            stroke="#93c5fd"
            strokeWidth={2}
            strokeDasharray={pretend ? "4 3" : undefined}
          />
          {Array.from({ length: Math.max(0, layers - 1) }, (_, i) => (
            <line key={i} x1={paperX} x2={paperX + paperW} y1={paperY + ((i + 1) * paperH) / layers} y2={paperY + ((i + 1) * paperH) / layers} className="stroke-primary-200" strokeWidth={1} />
          ))}
          {shown >= 6 && (
            <text x={paperX + paperW / 2} y={paperY - 6} textAnchor="middle" className="fill-gray-500 text-[10px]">
              {2 ** shown > 1e6 ? tr(locale, "millions of layers", "上百万层") : tr(locale, `${(2 ** shown).toLocaleString("en-US")} layers`, `${(2 ** shown).toLocaleString("zh-CN")} 层`)}
            </text>
          )}

          {/* Log ruler */}
          <line x1={RULER_X} x2={RULER_X} y1={RULER_TOP} y2={RULER_BOTTOM} className="stroke-gray-400" strokeWidth={2} />
          <text x={RULER_X} y={RULER_TOP - 6} textAnchor="middle" className="fill-gray-400 text-[8px]">
            {tr(locale, "log scale", "对数刻度")}
          </text>
          {sorted.map((r, i) => {
            const y = yOf(r.heightMm);
            const hit = thick >= r.heightMm;
            const at = foldsToReach(r.heightMm, thicknessMm);
            return (
              <g key={i} opacity={hit ? 1 : 0.55}>
                <line x1={RULER_X - 6} x2={RULER_X + 6} y1={y} y2={y} className={hit ? "stroke-fun-green" : "stroke-gray-400"} strokeWidth={2} />
                <text x={RULER_X + 10} y={y} dy="0.35em" className={`text-[10px] ${hit ? "fill-green-700 font-bold" : "fill-gray-600"}`}>
                  {r.emoji ? `${r.emoji} ` : ""}
                  {bi(locale, r.label)}
                  {(phase === "reveal" || hit) && <tspan className="fill-gray-400 font-normal">{tr(locale, ` · fold ${at}`, ` · 第 ${at} 折`)}</tspan>}
                </text>
              </g>
            );
          })}
          <motion.g initial={false} animate={{ y: yOf(Math.max(thick, thicknessMm)) }} transition={fade}>
            <path d={`M ${RULER_X - 22} -6 L ${RULER_X - 10} 0 L ${RULER_X - 22} 6 Z`} className="fill-fun-pink" />
            <text x={RULER_X - 26} y={0} textAnchor="end" dy="0.35em" className="fill-fun-pink text-[10px] font-bold">
              {formatLength(thick, locale)}
            </text>
          </motion.g>
        </SceneSvg>
      </div>
      <SceneMessage>{message}</SceneMessage>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Counter label={tr(locale, "folds", "折")} value={`${shown}/${maxFolds}`} />
        <Counter label={tr(locale, "thickness", "厚度")} value={formatLength(thick, locale)} tone="pink" />
        {phase === "explore" && (
          <>
            <SceneButton onClick={fold} disabled={folds >= maxFolds} variant={folds >= REAL_FOLD_LIMIT ? "accent" : "primary"}>
              {folds >= REAL_FOLD_LIMIT ? tr(locale, "Pretend to fold", "假装再折") : tr(locale, "Fold once", "折一次")}
            </SceneButton>
            <SceneButton onClick={unfold} variant="ghost" disabled={folds === 0}>
              {tr(locale, "Unfold", "展开重来")}
            </SceneButton>
          </>
        )}
      </div>
    </SceneFrame>
  );
}
