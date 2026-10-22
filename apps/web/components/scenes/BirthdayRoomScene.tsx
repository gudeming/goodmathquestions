"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  birthdayMaxPeople,
  birthdayProbability,
  birthdayThreshold,
  mulberry32,
  simulateBirthdays,
  type BirthdayRoom,
  type BirthdayRoomConfig,
  type Rng,
  type SceneProps,
} from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const REVEAL_MS = 3000;
/** Random draws per animation frame (keeps each frame well under 8 ms). */
const DRAWS_PER_FRAME = 40_000;
/** Above this many people the room is drawn as a 365-day strip instead of dots. */
const DOT_CAP = 61;
const CURVE_SAMPLES = 160;

interface Tried {
  n: number;
  rate: number;
}

/** C1 / C9: how many people until a shared birthday (any pair / matching me) is more likely than not? */
export default function BirthdayRoomScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<BirthdayRoomConfig>) {
  const { mode, trials } = config;
  const max = birthdayMaxPeople(config);
  const threshold = birthdayThreshold(mode);
  const events = useSceneEvents(onEvent);
  const rngRef = useRef<Rng | null>(null);
  const rafRef = useRef(0);
  const [n, setN] = useState(() => Math.min(max, mode === "any_pair" ? 10 : 50));
  const [tried, setTried] = useState<Tried[]>([]);
  const [room, setRoom] = useState<BirthdayRoom | null>(null);
  const [last, setLast] = useState<{ n: number; hits: number } | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const rng = () => (rngRef.current ??= mulberry32(config.seed ?? (Date.now() >>> 0)));

  const simulate = () => {
    if (phase !== "explore" || running) return;
    events.interact();
    const people = n;
    const r = rng();
    const chunk = Math.max(1, Math.floor(DRAWS_PER_FRAME / (people + 1)));
    let done = 0;
    let hits = 0;
    let example: BirthdayRoom | null = null;
    setRunning(true);
    const step = () => {
      const k = Math.min(chunk, trials - done);
      const res = simulateBirthdays(r, mode, people, k);
      hits += res.hits;
      done += k;
      if (!example || (res.example.pair && !example.pair)) example = res.example;
      if (done < trials) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      const rate = hits / trials;
      setRunning(false);
      setRoom(example);
      setLast({ n: people, hits });
      setTried((prev) => [...prev.filter((t) => t.n !== people), { n: people, rate }].sort((a, b) => a.n - b.n));
      events.state({ people, rate });
    };
    step();
  };

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const label =
    mode === "any_pair"
      ? tr(locale, "How many people until two share a birthday?", "多少人时会有两个人同一天生日？")
      : tr(locale, "How many people until someone shares your birthday?", "多少人时会有人和你同一天生日？");

  const message = (() => {
    if (phase === "hook") return mode === "any_pair" ? tr(locale, "Two people, same birthday: how many in the room?", "两个人同一天生日：房间里要几个人？") : tr(locale, "Someone with your birthday: how many people?", "有人和你同一天生日：要多少人？");
    if (phase === "reveal")
      return mode === "any_pair"
        ? tr(locale, `With ${threshold} people there are ${formatNumber((threshold * (threshold - 1)) / 2, locale)} pairs, so a match passes 50%.`, `${threshold} 个人之间有 ${formatNumber((threshold * (threshold - 1)) / 2, locale)} 对，重合的机会就超过一半了。`)
        : tr(locale, `Only lines to you count, so it takes ${threshold} other people to pass 50%.`, `只有和「你」连的线才算，所以要 ${threshold} 个人才超过一半。`);
    if (running) return tr(locale, "Filling rooms…", "正在模拟房间……");
    if (!last) return tr(locale, `Pick a number of people, then simulate ${trials} rooms.`, `选一个人数，然后模拟 ${trials} 个房间。`);
    const pct = Math.round((last.hits / trials) * 100);
    return mode === "any_pair"
      ? tr(locale, `${last.n} people: ${last.hits} of ${trials} rooms had a shared birthday (${pct}%).`, `${last.n} 个人：${trials} 个房间里有 ${last.hits} 个出现同一天生日（${pct}%）。`)
      : tr(locale, `${last.n} others: in ${last.hits} of ${trials} rooms someone matched you (${pct}%).`, `${last.n} 个人：${trials} 个房间里有 ${last.hits} 个有人和你同一天（${pct}%）。`);
  })();

  const interactive = phase === "explore";
  const shownTried = phase === "hook" ? [] : tried;

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="min-h-0 w-[40%] shrink-0">
          {phase === "reveal" && mode === "match_me" ? (
            // The reveal talks about "lines to you": draw them on a room small enough to show as dots.
            <RoomView room={room && room.birthdays.length <= DOT_CAP ? room : null} people={Math.min(last?.n ?? n, DOT_CAP - 1)} mode={mode} locale={locale} reducedMotion={reducedMotion} />
          ) : (
            <RoomView room={phase === "hook" ? null : room} people={phase === "hook" ? 23 : (last?.n ?? n)} mode={mode} locale={locale} reducedMotion={reducedMotion} />
          )}
        </div>
        <div className="min-h-0 min-w-0 flex-1">
          <Chart mode={mode} max={max} tried={shownTried} reveal={phase === "reveal"} progress={progress} threshold={threshold} current={interactive ? n : null} locale={locale} />
        </div>
      </div>
      <SceneMessage>{message}</SceneMessage>
      {interactive && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <label className="flex min-h-[44px] items-center gap-2 text-xs text-gray-600 sm:text-sm">
            <span>{mode === "any_pair" ? tr(locale, "people in the room", "房间里的人数") : tr(locale, "other people besides you", "除你以外的人数")}</span>
            <input
              type="range"
              min={2}
              max={max}
              step={1}
              value={n}
              onChange={(e) => {
                events.interact();
                setN(Number(e.target.value));
              }}
              aria-label={mode === "any_pair" ? tr(locale, "People in the room", "房间里的人数") : tr(locale, "Other people besides you", "除你以外的人数")}
              className="h-11 w-28 accent-fun-purple sm:w-40"
            />
          </label>
          <Counter label={tr(locale, "people", "人")} value={n} />
          <SceneButton onClick={simulate} disabled={running} variant="accent">
            {tr(locale, `Simulate ${trials} rooms`, `模拟 ${trials} 个房间`)}
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

/** One example room: dots (small rooms) or a 365-day strip (big rooms); the match is highlighted. */
function RoomView({ room, people, mode, locale, reducedMotion }: { room: BirthdayRoom | null; people: number; mode: "any_pair" | "match_me"; locale: SceneLocale; reducedMotion: boolean }) {
  const count = room ? room.birthdays.length : mode === "match_me" ? people + 1 : people;
  const pair = room?.pair ?? null;
  const W = 160;
  const H = 160;
  const aria = pair
    ? tr(locale, `Example room: person ${pair[0] + 1} and person ${pair[1] + 1} share a birthday`, `示例房间：第 ${pair[0] + 1} 和第 ${pair[1] + 1} 个人同一天生日`)
    : tr(locale, "Example room", "示例房间");
  if (count > DOT_CAP && room) {
    const xOf = (d: number) => 6 + (d / 364) * (W - 12);
    const matchDay = pair ? room.birthdays[pair[0]] : null;
    const days = new Set(room.birthdays);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} className="h-full w-full">
        <text x={W / 2} y={30} textAnchor="middle" className="fill-gray-500 text-[11px]">{tr(locale, `${count} birthdays on a year`, `${count} 个生日放在一年里`)}</text>
        <rect x={6} y={60} width={W - 12} height={40} rx={6} className="fill-white stroke-primary-100" />
        {[...days].map((d) => <line key={d} x1={xOf(d)} x2={xOf(d)} y1={64} y2={96} className="stroke-primary-300" strokeWidth={0.6} />)}
        {mode === "match_me" && <line x1={xOf(room.birthdays[0])} x2={xOf(room.birthdays[0])} y1={52} y2={108} className="stroke-fun-purple" strokeWidth={3} />}
        {matchDay !== null && <circle cx={xOf(matchDay)} cy={120} r={6} className="fill-fun-pink" />}
        <text x={W / 2} y={145} textAnchor="middle" className="fill-gray-600 text-[11px] font-bold">
          {pair ? tr(locale, "a match!", "有重合！") : tr(locale, "no match", "没有重合")}
        </text>
      </svg>
    );
  }
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cell = Math.min((W - 8) / cols, (H - 8) / rows);
  // match_me: "you" (person 0) sits in the middle of the room, with a line to everyone else.
  const mid = Math.min(count - 1, Math.floor(rows / 2) * cols + Math.floor(cols / 2));
  const slot = (i: number) => (mode !== "match_me" ? i : i === 0 ? mid : i === mid ? 0 : i);
  const pos = (i: number) => [4 + (slot(i) % cols) * cell + cell / 2, 4 + Math.floor(slot(i) / cols) * cell + cell / 2] as const;
  const r = Math.max(2, cell * 0.32);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={mode === "match_me" ? `${aria}. ${tr(locale, `${count - 1} lines to you`, `${count - 1} 条连到你的线`)}` : aria} className="h-full w-full">
      {mode === "match_me" &&
        Array.from({ length: count - 1 }, (_, k) => k + 1).map((i) => <line key={`l${i}`} x1={pos(0)[0]} y1={pos(0)[1]} x2={pos(i)[0]} y2={pos(i)[1]} className="stroke-fun-purple/25" strokeWidth={0.8} />)}
      {Array.from({ length: count }, (_, i) => {
        const [x, y] = pos(i);
        const inPair = pair !== null && (pair[0] === i || pair[1] === i);
        const me = mode === "match_me" && i === 0;
        return <circle key={i} cx={x} cy={y} r={inPair ? r * 1.35 : r} className={inPair ? "fill-fun-pink" : me ? "fill-fun-purple" : "fill-primary-300"} />;
      })}
      {pair && (
        <motion.line
          key={`${pair[0]}-${pair[1]}`}
          x1={pos(pair[0])[0]}
          y1={pos(pair[0])[1]}
          x2={pos(pair[1])[0]}
          y2={pos(pair[1])[1]}
          className="stroke-fun-pink"
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={reducedMotion ? { opacity: 0 } : { pathLength: 0 }}
          animate={reducedMotion ? { opacity: 1 } : { pathLength: 1 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.4 }}
        />
      )}
    </svg>
  );
}

/** Probability of a match vs people: the child's simulated points, then the exact curve in the reveal. */
function Chart({ mode, max, tried, reveal, progress, threshold, current, locale }: { mode: "any_pair" | "match_me"; max: number; tried: Tried[]; reveal: boolean; progress: number; threshold: number; current: number | null; locale: SceneLocale }) {
  const W = 240;
  const H = 160;
  const L = 26;
  const R = 8;
  const T = 10;
  const B = 22;
  const x = (n: number) => L + (n / max) * (W - L - R);
  const y = (p: number) => T + (1 - p) * (H - T - B);
  const curve = useMemo(() => Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => Math.round((i / CURVE_SAMPLES) * max)).map((n) => [n, birthdayProbability(mode, n)] as const), [mode, max]);
  const drawn = reveal ? curve.filter(([n]) => n <= segment(progress, 0, 0.7) * max) : [];
  const late = reveal ? segment(progress, 0.7, 1) : 0;
  const pts = tried.map((t) => `${x(t.n)},${y(t.rate)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr(locale, "Chance of a match against number of people", "重合的概率与人数")} className="h-full w-full">
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} className="stroke-gray-300" />
      <line x1={L} x2={L} y1={T} y2={y(0)} className="stroke-gray-300" />
      {[0, 0.5, 1].map((p) => (
        <text key={p} x={L - 4} y={y(p)} dy="0.35em" textAnchor="end" className="fill-gray-400 text-[9px]">{Math.round(p * 100)}%</text>
      ))}
      {[0, Math.round(max / 2), max].map((n) => (
        <text key={n} x={x(n)} y={H - 8} textAnchor="middle" className="fill-gray-400 text-[9px]">{n}</text>
      ))}
      {current !== null && <line x1={x(current)} x2={x(current)} y1={T} y2={y(0)} className="stroke-fun-purple/40" strokeWidth={1.5} />}
      {drawn.length > 1 && <polyline points={drawn.map(([n, p]) => `${x(n)},${y(p)}`).join(" ")} fill="none" className="stroke-fun-green" strokeWidth={3} strokeLinejoin="round" />}
      {tried.length > 1 && <polyline points={pts} fill="none" className="stroke-primary-400" strokeWidth={1.5} strokeDasharray="3 3" />}
      {tried.map((t) => <circle key={t.n} cx={x(t.n)} cy={y(t.rate)} r={3.5} className="fill-primary-600" />)}
      {late > 0 && (
        <g opacity={late}>
          <line x1={L} x2={W - R} y1={y(0.5)} y2={y(0.5)} className="stroke-fun-pink" strokeWidth={1.5} strokeDasharray="5 4" />
          <line x1={x(threshold)} x2={x(threshold)} y1={y(0.5)} y2={y(0)} className="stroke-fun-pink" strokeWidth={1.5} strokeDasharray="2 3" />
          <circle cx={x(threshold)} cy={y(birthdayProbability(mode, threshold))} r={6} className="fill-fun-yellow stroke-fun-pink" strokeWidth={2} />
          <text x={Math.min(W - R - 16, x(threshold) + 8)} y={y(0.5) - 8} className="fill-fun-pink text-[12px] font-bold">{threshold}</text>
        </g>
      )}
    </svg>
  );
}
