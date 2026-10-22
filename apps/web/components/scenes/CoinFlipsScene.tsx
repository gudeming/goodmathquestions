"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import {
  EMPTY_COIN_STATE,
  addFlip,
  collectAfterStreak,
  expectedFlipsForStreak,
  flip,
  flipUntilStreak,
  mulberry32,
  type CoinFlipsConfig,
  type CoinState,
  type Flip,
  type Rng,
  type SceneProps,
} from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const REVEAL_MS = 3400;
const BATCH = 10;
/** Tally size after which the scene reports `completed`. */
const TALLY_GOAL = 20;
const REVEAL_SIM = 200;

const face = (f: Flip, locale: SceneLocale) => (f === "H" ? tr(locale, "H", "正") : tr(locale, "T", "反"));

/** C4: flip until a long streak of heads, then see that the next flip is still 50/50. */
export default function CoinFlipsScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<CoinFlipsConfig>) {
  const { streak } = config;
  const events = useSceneEvents(onEvent);
  const rngRef = useRef<Rng | null>(null);
  const [s, setS] = useState<CoinState>(EMPTY_COIN_STATE);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const [flipKey, setFlipKey] = useState(0);
  const done = useRef(false);
  const rng = () => (rngRef.current ??= mulberry32(config.seed ?? (Date.now() >>> 0)));

  const commit = (next: CoinState) => {
    setS(next);
    setFlipKey((k) => k + 1);
    events.state({ flips: next.flips, run: next.run, longest: next.longest, afterHeads: next.afterHeads, afterTails: next.afterTails });
    if (next.afterHeads + next.afterTails >= TALLY_GOAL && !done.current) {
      done.current = true;
      events.emit("completed", { moves: next.flips, afterHeads: next.afterHeads, afterTails: next.afterTails });
    }
  };
  const flipOnce = () => {
    if (phase !== "explore") return;
    events.interact();
    setLastRun(null);
    commit(addFlip(s, flip(rng()), streak));
  };
  const untilStreak = () => {
    if (phase !== "explore") return;
    events.interact();
    const r = flipUntilStreak(s, rng(), streak);
    setLastRun(r.used);
    commit(r.state);
  };
  const moreStreaks = () => {
    if (phase !== "explore") return;
    events.interact();
    setLastRun(null);
    commit(collectAfterStreak(s, rng(), streak, BATCH));
  };

  const revealTally = useMemo(() => {
    if (phase !== "reveal" || s.afterHeads + s.afterTails >= TALLY_GOAL) return s;
    return collectAfterStreak(s, mulberry32(config.seed ?? 1024), streak, REVEAL_SIM);
  }, [phase, s, streak, config.seed]);
  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const shown = phase === "reveal" ? revealTally : s;
  const last = shown.recent[shown.recent.length - 1];
  const fmt = (v: number) => formatNumber(v, locale);
  const odds = 2 ** streak;

  const label = tr(locale, `A fair coin landed heads ${streak} times in a row. What about the next flip?`, `公平的硬币连续 ${streak} 次正面。下一次呢？`);
  const message = (() => {
    if (phase === "hook") return tr(locale, `Heads ${streak} times in a row… is tails “due”?`, `连续 ${streak} 次正面……该轮到反面了吗？`);
    if (phase === "reveal")
      return progress > 0.5
        ? tr(locale, `${streak} heads in a row: 1 in ${fmt(odds)}, rare. But the next flip is still 1 in 2. The coin has no memory.`, `连续 ${streak} 次正面：${fmt(odds)} 分之一，很少见。但下一次仍然是二分之一。硬币没有记忆。`)
        : tr(locale, `All ${fmt(odds)} ways ${streak} flips can land: only one is all heads.`, `${streak} 次投掷一共 ${fmt(odds)} 种结果：只有一种全是正面。`);
    if (s.flips === 0) return tr(locale, "Flip the coin, or fast-forward to a streak.", "掷硬币，或者快进到出现连续正面。");
    if (lastRun !== null) return tr(locale, `${streak} heads in a row after ${fmt(lastRun)} flips (about ${fmt(expectedFlipsForStreak(streak))} on average). Now: what comes next?`, `掷了 ${fmt(lastRun)} 次才出现连续 ${streak} 次正面（平均约 ${fmt(expectedFlipsForStreak(streak))} 次）。下一次会是什么？`);
    const tally = s.afterHeads + s.afterTails;
    if (tally > 0) return tr(locale, `Right after ${streak} heads: ${fmt(s.afterHeads)} heads, ${fmt(s.afterTails)} tails.`, `连续 ${streak} 次正面之后：正面 ${fmt(s.afterHeads)} 次，反面 ${fmt(s.afterTails)} 次。`);
    return tr(locale, `Current run: ${s.run} heads.`, `现在连续 ${s.run} 次正面。`);
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {phase === "reveal" ? (
            <OddsGrid streak={streak} progress={progress} locale={locale} />
          ) : (
            <svg viewBox="0 0 220 150" role="img" aria-label={last ? tr(locale, `Last flip: ${last === "H" ? "heads" : "tails"}`, `上一次：${last === "H" ? "正面" : "反面"}`) : label} className="h-full w-full">
              <motion.g key={flipKey} initial={reducedMotion ? { opacity: 0 } : { scaleX: 0.1 }} animate={reducedMotion ? { opacity: 1 } : { scaleX: 1 }} transition={{ duration: reducedMotion ? 0.2 : 0.25 }} style={{ transformOrigin: "110px 52px" }}>
                <circle cx={110} cy={52} r={38} className={last === "T" ? "fill-gray-300 stroke-gray-400" : "fill-fun-yellow stroke-amber-500"} strokeWidth={4} />
                <text x={110} y={52} dy="0.35em" textAnchor="middle" className="fill-gray-800 text-[28px] font-bold">
                  {last ? face(last, locale) : "?"}
                </text>
              </motion.g>
              {shown.recent.map((f, i) => {
                const n = shown.recent.length;
                const inRun = i >= n - Math.min(shown.run, n);
                return (
                  <g key={i} transform={`translate(${6 + i * 8.9},118)`}>
                    <circle cx={4} cy={4} r={4} className={f === "H" ? (inRun && shown.run >= streak ? "fill-fun-pink" : "fill-fun-yellow") : "fill-gray-300"} />
                  </g>
                );
              })}
              <text x={110} y={145} textAnchor="middle" className="fill-gray-400 text-[9px]">
                {tr(locale, "latest flips →", "最近几次 →")}
              </text>
            </svg>
          )}
        </div>
        <TallyBar heads={shown.afterHeads} tails={shown.afterTails} streak={streak} locale={locale} />
      </div>
      <SceneMessage>{message}</SceneMessage>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
        {phase === "explore" ? (
          <>
            <SceneButton onClick={flipOnce}>{tr(locale, "Flip", "掷一次")}</SceneButton>
            <SceneButton onClick={untilStreak} variant="accent">
              {tr(locale, `⏩ Until ${streak} heads`, `⏩ 掷到连续 ${streak} 个正面`)}
            </SceneButton>
            <SceneButton onClick={moreStreaks} variant="ghost" disabled={s.streaks === 0}>
              {tr(locale, `${BATCH} more streaks`, `再找 ${BATCH} 次`)}
            </SceneButton>
          </>
        ) : null}
        <Counter label={tr(locale, "flips", "次数")} value={fmt(shown.flips)} />
        <Counter label={tr(locale, "longest", "最长")} value={shown.longest} tone="pink" />
      </div>
    </SceneFrame>
  );
}

/** What happened on the flip right after a streak: heads vs tails, with the 50% line. */
function TallyBar({ heads, tails, streak, locale }: { heads: number; tails: number; streak: number; locale: SceneLocale }) {
  const total = heads + tails;
  const hShare = total ? heads / total : 0.5;
  const H = 150;
  return (
    <svg viewBox="0 0 90 190" role="img" aria-label={tr(locale, `After ${streak} heads: ${heads} heads, ${tails} tails`, `连续 ${streak} 次正面之后：正 ${heads}，反 ${tails}`)} className="h-full w-[26%] shrink-0">
      <text x={45} y={10} textAnchor="middle" className="fill-gray-500 text-[8px]">{tr(locale, `flip after ${streak}×H`, `${streak} 连正之后`)}</text>
      <rect x={25} y={18} width={40} height={H} rx={6} className="fill-gray-100" />
      {total > 0 && (
        <g>
          <rect x={25} y={18} width={40} height={H * hShare} rx={6} className="fill-fun-yellow" style={{ transition: "height 300ms" }} />
          <rect x={25} y={18 + H * hShare} width={40} height={H * (1 - hShare)} rx={6} className="fill-gray-300" style={{ transition: "y 300ms, height 300ms" }} />
        </g>
      )}
      <line x1={18} x2={72} y1={18 + H / 2} y2={18 + H / 2} className="stroke-fun-pink" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={74} y={18 + H / 2} dy="0.35em" className="fill-fun-pink text-[8px] font-bold">50%</text>
      <text x={45} y={182} textAnchor="middle" className="fill-gray-700 text-[10px] font-bold">
        {total ? `${tr(locale, "H", "正")} ${heads} : ${tr(locale, "T", "反")} ${tails}` : "—"}
      </text>
    </svg>
  );
}

/** All 2^streak sequences as a grid; the single all-heads one lit. */
function OddsGrid({ streak, progress, locale }: { streak: number; progress: number; locale: SceneLocale }) {
  const total = 2 ** streak;
  const cols = 2 ** Math.ceil(streak / 2);
  const rows = total / cols;
  const cell = Math.min(200 / cols, 130 / rows);
  const w = cols * cell;
  const h = rows * cell;
  return (
    <svg viewBox={`0 0 ${w + 20} ${h + 24}`} role="img" aria-label={tr(locale, `1 out of ${total}`, `${total} 种里的 1 种`)} className="h-full w-full">
      <defs>
        <pattern id="coin-cells" width={cell} height={cell} patternUnits="userSpaceOnUse" x={10} y={4}>
          <rect width={cell * 0.86} height={cell * 0.86} className="fill-primary-100" />
        </pattern>
      </defs>
      <rect x={10} y={4} width={w} height={h} fill="url(#coin-cells)" opacity={segment(progress, 0, 0.2)} />
      <rect x={10} y={4} width={cell * 0.86} height={cell * 0.86} className="fill-fun-pink" opacity={segment(progress, 0.2, 0.35)} />
      <text x={(w + 20) / 2} y={h + 18} textAnchor="middle" className="fill-gray-700 text-[11px] font-bold" opacity={segment(progress, 0.3, 0.45)}>
        1 / {total.toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}
      </text>
    </svg>
  );
}
