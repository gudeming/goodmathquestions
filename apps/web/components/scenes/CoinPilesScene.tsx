"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { dealCoins, randomPick, splitAndFlip, type CoinPilesConfig, type SceneProps } from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, tr } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 360;
const H = 210;
const LEFT = { x: 6, y: 18, w: 244, h: 186 };
const RIGHT = { x: 262, y: 18, w: 92, h: 186 };
const REVEAL_MS = 5000;
const DEFAULT_SEED = 1;

type Stage = "pick" | "flipped" | "shown";

/** Positions of `count` coins packed into a box, row by row. */
function pack(count: number, box: typeof LEFT, maxR: number): { pts: Array<{ x: number; y: number }>; r: number } {
  const aspect = box.w / box.h;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count * aspect)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const pitch = Math.min(box.w / cols, box.h / rows);
  const r = Math.min(maxR, pitch * 0.42);
  const ox = box.x + (box.w - cols * pitch) / 2 + pitch / 2;
  return { pts: Array.from({ length: count }, (_, i) => ({ x: ox + (i % cols) * pitch, y: box.y + pitch / 2 + Math.floor(i / cols) * pitch })), r };
}

/** F10: blindfolded, take as many coins as there are heads, flip them all, and the heads match. */
export default function CoinPilesScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<CoinPilesConfig>) {
  const { coins, heads } = config;
  const seed = config.seed ?? DEFAULT_SEED;
  const events = useSceneEvents(onEvent);
  const [trial, setTrial] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [stage, setStage] = useState<Stage>("pick");
  const [results, setResults] = useState<boolean[]>([]);
  const faces = useMemo(() => dealCoins(coins, heads, seed + trial * 101), [coins, heads, seed, trial]);
  const explore = phase === "explore";

  // Reveal replays the latest split (or a fixed example) with every face showing.
  const revealPick = useMemo(() => (picked.length === heads ? picked : randomPick(coins, heads, seed + 7)), [picked, heads, coins, seed]);
  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const activePick = phase === "reveal" ? revealPick : phase === "hook" ? [] : picked;
  const split = splitAndFlip(faces, activePick);
  const flipped = phase === "reveal" ? segment(progress, 0.35, 0.45) >= 1 : stage !== "pick";
  const showFaces = phase === "reveal" || stage === "shown";

  const inRight = new Set(activePick);
  const leftIdx = useMemo(() => faces.map((_, i) => i).filter((i) => !inRight.has(i)), [faces, activePick]); // eslint-disable-line react-hooks/exhaustive-deps
  const leftLayout = useMemo(() => pack(leftIdx.length, LEFT, 9), [leftIdx.length]);
  const rightLayout = useMemo(() => pack(heads, RIGHT, 9), [heads]);

  const move = (i: number) => {
    if (!explore || stage !== "pick") return;
    events.interact();
    const next = inRight.has(i) ? picked.filter((p) => p !== i) : picked.length < heads ? [...picked, i] : picked;
    setPicked(next);
    events.state({ trial: trial + 1, picked: next.length });
  };
  const grabRest = () => {
    if (!explore || stage !== "pick") return;
    events.interact();
    const pool = randomPick(coins, coins, seed + trial * 13 + picked.length).filter((i) => !inRight.has(i));
    const next = [...picked, ...pool.slice(0, heads - picked.length)];
    setPicked(next);
    events.state({ trial: trial + 1, picked: next.length });
  };
  const flip = () => {
    if (!explore || picked.length !== heads) return;
    events.interact();
    setStage("flipped");
  };
  const show = () => {
    if (!explore || stage !== "flipped") return;
    const r = splitAndFlip(faces, picked);
    const equal = r.leftHeads === r.rightHeadsAfterFlip;
    const next = [...results, equal];
    setResults(next);
    setStage("shown");
    events.state({ trial: trial + 1, k: r.k, left: r.leftHeads, right: r.rightHeadsAfterFlip, equal, trials: next.length });
    if (next.length === 1) events.emit("completed", { moves: next.length, k: r.k, equal });
  };
  const again = () => {
    if (!explore) return;
    setTrial((t) => t + 1);
    setPicked([]);
    setStage("pick");
  };

  const rightHeadsNow = flipped ? split.rightHeadsAfterFlip : split.k;
  // Coins are pointer targets only; keyboard users get the same moves from "Grab at random".
  const coin = (i: number, x: number, y: number, r: number, side: "left" | "right") => {
    const isHead = side === "right" && flipped ? !faces[i] : faces[i];
    return (
      <motion.g
        key={i}
        initial={false}
        animate={{ x, y }}
        transition={{ duration: reducedMotion ? 0 : 0.35 }}
        className={explore && stage === "pick" ? "cursor-pointer" : ""}
        onClick={() => move(i)}
      >
        <circle r={r + 2} fill="transparent" />
        <motion.circle
          r={r}
          className={showFaces ? (isHead ? "fill-fun-yellow stroke-fun-orange" : "fill-gray-300 stroke-gray-400") : "fill-primary-200 stroke-primary-300"}
          strokeWidth={1}
          animate={side === "right" && !reducedMotion ? { scaleX: flipped ? [1, 0, 1] : 1 } : { scaleX: 1 }}
          transition={{ duration: 0.4 }}
        />
        {showFaces && r >= 5 && (
          <text textAnchor="middle" dy="0.35em" className={`font-bold ${isHead ? "fill-fun-orange" : "fill-gray-500"}`} style={{ pointerEvents: "none", fontSize: r }}>
            {isHead ? tr(locale, "H", "正") : tr(locale, "T", "反")}
          </text>
        )}
      </motion.g>
    );
  };

  const label = tr(locale, `${coins} coins, ${heads} heads up, and you can't see them`, `${coins} 枚硬币，${heads} 枚正面朝上，你看不见`);
  const msg = (() => {
    if (phase === "hook") return tr(locale, `Blindfolded: make two piles with the same number of heads.`, `蒙着眼睛：分成两堆，让两堆正面朝上的一样多。`);
    if (phase === "reveal") {
      const k = split.k;
      if (progress < 0.35) return tr(locale, `Say the ${heads} coins you took hold k heads (here k = ${k}). The big pile keeps ${heads} − k = ${heads - k} heads.`, `设拿出的 ${heads} 枚里有 k 个正面（这次 k = ${k}）。大堆里就剩 ${heads} − k = ${heads - k} 个正面。`);
      if (progress < 0.7) return tr(locale, `Flip the small pile: its k heads become tails and its ${heads} − k tails become heads.`, `把小堆全翻过来：k 个正面变反面，${heads} − k 个反面变正面。`);
      return tr(locale, `Both piles: ${heads} − k = ${heads - k} heads. You never needed to know k!`, `两堆都是 ${heads} − k = ${heads - k} 个正面。你根本不用知道 k 是几！`);
    }
    if (stage === "shown") return tr(locale, `Left: ${split.leftHeads} heads. Right: ${split.rightHeadsAfterFlip} heads. Equal!`, `左堆 ${split.leftHeads} 个正面，右堆 ${split.rightHeadsAfterFlip} 个正面。一样多！`);
    if (stage === "flipped") return tr(locale, "Flipped every coin in the right pile. Now take off the blindfold.", "右堆每一枚都翻过来了。现在摘下眼罩看看。");
    if (picked.length === heads) return tr(locale, `${heads} coins in the right pile. Now flip them all.`, `右堆有 ${heads} 枚了。把它们全部翻面。`);
    return tr(locale, `Tap coins to move ${heads} of them to the right pile (${picked.length}/${heads}).`, `点硬币，把 ${heads} 枚移到右堆（${picked.length}/${heads}）。`);
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label={label} className="h-full w-full">
          <rect {...{ x: LEFT.x - 4, y: LEFT.y - 4, width: LEFT.w + 8, height: LEFT.h + 8 }} rx={12} className="fill-white stroke-gray-200" />
          <rect {...{ x: RIGHT.x - 4, y: RIGHT.y - 4, width: RIGHT.w + 8, height: RIGHT.h + 8 }} rx={12} className={`stroke-2 ${flipped ? "fill-fun-pink/10 stroke-fun-pink" : "fill-white stroke-gray-200"}`} />
          <text x={LEFT.x + LEFT.w / 2} y={11} textAnchor="middle" className="fill-gray-600 text-[10px] font-bold">
            {tr(locale, `big pile · ${leftIdx.length}`, `大堆 · ${leftIdx.length} 枚`)}
            {showFaces ? tr(locale, ` · ${split.leftHeads} heads`, ` · ${split.leftHeads} 正`) : ""}
          </text>
          <text x={RIGHT.x + RIGHT.w / 2} y={11} textAnchor="middle" className="fill-gray-600 text-[10px] font-bold">
            {tr(locale, `small · ${activePick.length}/${heads}`, `小堆 · ${activePick.length}/${heads}`)}
            {showFaces ? tr(locale, ` · ${rightHeadsNow} H`, ` · ${rightHeadsNow} 正`) : ""}
          </text>
          {leftIdx.map((i, k) => coin(i, leftLayout.pts[k].x, leftLayout.pts[k].y, leftLayout.r, "left"))}
          {activePick.map((i, k) => coin(i, rightLayout.pts[k].x, rightLayout.pts[k].y, rightLayout.r, "right"))}
        </svg>
      </div>
      {phase === "reveal" && <Algebra heads={heads} k={split.k} step={progress < 0.35 ? 0 : progress < 0.7 ? 1 : 2} locale={locale} />}
      <SceneMessage>{msg}</SceneMessage>
      {explore && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {results.length > 0 && <Counter label={tr(locale, "equal", "相等")} value={`${results.filter(Boolean).length}/${results.length}`} tone="green" />}
          {stage === "pick" && (
            <SceneButton onClick={grabRest} variant="ghost" disabled={picked.length === heads}>
              {tr(locale, `Grab ${heads - picked.length} at random`, `随手拿 ${heads - picked.length} 枚`)}
            </SceneButton>
          )}
          {stage === "pick" && (
            <SceneButton onClick={flip} disabled={picked.length !== heads}>
              {tr(locale, "Flip the right pile", "翻转右堆")}
            </SceneButton>
          )}
          {stage === "flipped" && (
            <SceneButton onClick={show} variant="accent">
              {tr(locale, "Reveal faces", "揭晓")}
            </SceneButton>
          )}
          {stage === "shown" && <SceneButton onClick={again}>{tr(locale, "Try again", "再试一次")}</SceneButton>}
        </div>
      )}
    </SceneFrame>
  );
}

function Algebra({ heads, k, step, locale }: { heads: number; k: number; step: number; locale: "en" | "zh" }) {
  const rows = [
    tr(locale, `small pile: k heads · big pile: ${heads} − k heads`, `小堆：k 个正面 · 大堆：${heads} − k 个正面`),
    tr(locale, `flip small pile: ${heads} − k heads`, `小堆翻面：${heads} − k 个正面`),
    tr(locale, `${heads} − k = ${heads} − k ✓  (k = ${k}: ${heads - k} = ${heads - k})`, `${heads} − k = ${heads} − k ✓（k = ${k}：${heads - k} = ${heads - k}）`),
  ];
  return (
    <ol className="flex flex-col items-center text-[10px] sm:text-xs" aria-label={tr(locale, "Why it works", "为什么")}>
      {rows.map((r, i) => (
        <li key={i} className={`font-mono transition-opacity duration-300 ${i <= step ? "opacity-100" : "opacity-0"} ${i === 2 ? "font-bold text-fun-pink" : "text-gray-700"}`}>
          {r}
        </li>
      ))}
    </ol>
  );
}
