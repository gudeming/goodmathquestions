"use client";

import { useMemo, useRef, useState } from "react";
import { SOCK_COLORS, mulberry32, pairsIn, randomSock, socksToGuarantee, worstCaseSequence, worstSock, type Rng, type SceneProps, type SockDrawerConfig } from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, bi, tr } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const SOCK = "M0 0 h11 v15 q0 5 5 5 h5 q5 0 5 5 q0 5 -5 5 h-13 q-8 0 -8 -8 Z";
const MAX_HAND = 12;
const REVEAL_STEP_MS = 650;

function Sock({ x, y, fill, glow, scale = 1 }: { x: number; y: number; fill: string; glow?: boolean; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      {glow && <circle cx={11} cy={16} r={20} className="fill-fun-yellow/50" />}
      <path d={SOCK} className={`${fill} stroke-white`} strokeWidth={1.5} />
      <rect x={0} y={0} width={11} height={4} className="fill-white/70" />
    </g>
  );
}

/** C5: pull socks in the dark. Worst luck shows why colours + 1 socks always make a pair. */
export default function SockDrawerScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<SockDrawerConfig>) {
  const colors = config.colors;
  const pairsWanted = config.guaranteeTwoPairs ? 2 : 1;
  const guarantee = socksToGuarantee(colors, pairsWanted);
  const palette = SOCK_COLORS.slice(0, colors);
  const events = useSceneEvents(onEvent);
  const rngRef = useRef<Rng | null>(null);
  const [hand, setHand] = useState<number[]>([]);
  const [worst, setWorst] = useState(false);
  const [rounds, setRounds] = useState<Array<{ socks: number; worst: boolean }>>([]);
  const proposed = useRef(false);
  const rng = () => (rngRef.current ??= mulberry32(config.seed ?? (Date.now() >>> 0)));

  const pairs = pairsIn(hand, colors);
  const roundDone = pairs >= pairsWanted;

  const pull = () => {
    if (phase !== "explore" || roundDone || hand.length >= MAX_HAND) return;
    events.interact();
    const sock = worst ? worstSock(hand, colors) : randomSock(rng(), colors);
    const next = [...hand, sock];
    setHand(next);
    const p = pairsIn(next, colors);
    events.state({ socks: next.length, pairs: p, worstLuck: worst });
    if (p >= pairsWanted) {
      setRounds((r) => [...r, { socks: next.length, worst }].slice(-6));
      if (worst && !proposed.current) {
        proposed.current = true;
        events.emit("completed", { moves: next.length });
        onProposeAnswer?.(String(guarantee));
      }
    }
  };
  const empty = () => setHand([]);

  const sequence = useMemo(() => worstCaseSequence(colors, pairsWanted), [colors, pairsWanted]);
  const progress = useRevealProgress(phase === "reveal", REVEAL_STEP_MS * (sequence.length + 2), reducedMotion, () => events.emit("reveal_done"));
  const dropped = phase === "reveal" ? Math.round(segment(progress, 0.05, 0.85) * sequence.length) : 0;

  const goal = pairsWanted === 1 ? tr(locale, "a matching pair", "一双同色的") : tr(locale, "two matching pairs", "两双同色的");
  const label = tr(locale, `Socks in ${colors} colours, in the dark. How many to be sure of ${goal}?`, `黑暗里有 ${colors} 种颜色的袜子。至少拿几只才能保证有${goal}？`);

  const message = (() => {
    if (phase === "hook") return label;
    if (phase === "reveal")
      return progress > 0.85
        ? pairsWanted === 1
          ? tr(locale, `${colors} colours = ${colors} boxes. Worst luck puts one sock in each; sock number ${guarantee} has to land in a box that already has one.`, `${colors} 种颜色 = ${colors} 个盒子。最倒霉时每个盒子放一只；第 ${guarantee} 只一定会落进已经有袜子的盒子。`)
          : tr(locale, `Worst luck: one pair, one sock in every other box, and one odd extra. Sock number ${guarantee} makes the second pair.`, `最倒霉时：一双，加上每个盒子各一只，再多一只单的。第 ${guarantee} 只凑出第二双。`)
        : tr(locale, "One box for each colour…", "每种颜色一个盒子……");
    if (roundDone) return tr(locale, `${pairsWanted === 1 ? "A pair" : "Two pairs"} after ${hand.length} socks!${worst ? " Even with the worst luck." : " Lucky? Try worst-luck mode."}`, `拿了 ${hand.length} 只就有${pairsWanted === 1 ? "一双" : "两双"}了！${worst ? "就算最倒霉也是这样。" : "运气好？试试「最倒霉模式」。"}`);
    if (hand.length === 0) return tr(locale, `Pull socks until you have ${goal}.`, `一只只拿，直到拿到${goal}。`);
    return tr(locale, `${hand.length} socks, ${pairs} pair${pairs === 1 ? "" : "s"}.`, `${hand.length} 只，${pairs} 双。`);
  })();

  const sc = colors > 3 ? 0.7 : 1;
  // Lay out the hand: pairs glow.
  const glowing = new Set<number>();
  const seen = new Map<number, number>();
  hand.forEach((c, i) => {
    const prev = seen.get(c);
    if (prev !== undefined) {
      glowing.add(prev);
      glowing.add(i);
      seen.delete(c);
    } else seen.set(c, i);
  });

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        {phase === "reveal" ? (
          <svg viewBox="0 0 300 160" role="img" aria-label={tr(locale, `${colors} boxes, ${guarantee} socks`, `${colors} 个盒子，${guarantee} 只袜子`)} className="h-full w-full">
            {palette.map((c, b) => {
              const bw = 280 / colors;
              const x = 10 + b * bw;
              const inBox = sequence.slice(0, dropped).flatMap((s, i) => (s === b ? [i] : []));
              return (
                <g key={c.id}>
                  <rect x={x + 4} y={60} width={bw - 8} height={80} rx={8} className="fill-amber-100 stroke-amber-400" strokeWidth={2} />
                  <text x={x + bw / 2} y={154} textAnchor="middle" className="fill-gray-600 text-[10px]">{bi(locale, c.label)}</text>
                  {inBox.map((i, k) => (
                    <Sock key={i} x={x + 8 + (k % 2) * 26 * sc} y={70 + Math.floor(k / 2) * 32 * sc} fill={c.fill} glow={k % 2 === 1} scale={sc} />
                  ))}
                </g>
              );
            })}
            <text x={150} y={30} textAnchor="middle" className="fill-gray-700 text-[16px] font-bold">
              {tr(locale, `sock ${Math.max(1, dropped)} of ${guarantee}`, `第 ${Math.max(1, dropped)} / ${guarantee} 只`)}
            </text>
          </svg>
        ) : (
          <svg viewBox="0 0 300 160" role="img" aria-label={tr(locale, `${hand.length} socks in your hand`, `手里 ${hand.length} 只袜子`)} className="h-full w-full">
            <rect x={6} y={10} width={88} height={64} rx={8} className="fill-gray-700" />
            <rect x={14} y={18} width={72} height={48} rx={5} className="fill-gray-800" />
            <text x={50} y={46} textAnchor="middle" className="fill-gray-400 text-[18px]">🌑 ?</text>
            <text x={50} y={88} textAnchor="middle" className="fill-gray-500 text-[9px]">{tr(locale, "the drawer (dark!)", "抽屉（好黑！）")}</text>
            <text x={110} y={24} className="fill-gray-500 text-[9px]">{tr(locale, "in your hand:", "手里：")}</text>
            {hand.map((c, i) => (
              <Sock key={i} x={110 + (i % 6) * 31} y={34 + Math.floor(i / 6) * 40} fill={palette[c].fill} glow={glowing.has(i)} />
            ))}
            <text x={10} y={112} className="fill-gray-500 text-[9px]">{tr(locale, "rounds:", "每一轮：")}</text>
            {rounds.map((r, i) => (
              <text key={i} x={10 + i * 48} y={128} className={`text-[10px] font-bold ${r.worst ? "fill-fun-pink" : "fill-gray-600"}`}>
                {r.worst ? "😈" : "🍀"} {r.socks}
              </text>
            ))}
          </svg>
        )}
      </div>
      <SceneMessage>{message}</SceneMessage>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
        {phase === "explore" && (
          <>
            <SceneButton onClick={pull} disabled={roundDone || hand.length >= MAX_HAND}>
              {tr(locale, "Pull a sock", "摸一只")}
            </SceneButton>
            <SceneButton onClick={empty} variant={roundDone ? "accent" : "ghost"} disabled={hand.length === 0}>
              {tr(locale, "Put them back", "放回去")}
            </SceneButton>
            <SceneButton onClick={() => setWorst((w) => !w)} variant={worst ? "primary" : "ghost"} ariaPressed={worst}>
              😈 {tr(locale, "Worst luck", "最倒霉模式")}
            </SceneButton>
          </>
        )}
        <Counter label={tr(locale, "socks", "只数")} value={phase === "reveal" ? dropped : hand.length} />
      </div>
    </SceneFrame>
  );
}
