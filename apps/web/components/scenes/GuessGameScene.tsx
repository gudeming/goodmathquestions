"use client";

import { useMemo, useRef, useState } from "react";
import {
  binarySearchSteps,
  halvingStrip,
  middleGuess,
  mulberry32,
  narrow,
  randomInt,
  replyTo,
  type GuessGameConfig,
  type GuessReply,
  type SceneProps,
} from "@gmq/animation-engine";
import { SceneButton, SceneFrame, SceneMessage, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 360;
const H = 120;
const X0 = 16;
const X1 = 344;
const BAR_Y = 52;
const REVEAL_MS = 5000;

type Mode = GuessGameConfig["mode"];
interface Guess {
  value: number;
  reply: GuessReply;
}

/** Secret for round `round`: seeded configs are reproducible; unseeded ones use the clock (only ever inside a handler). */
function pickSecret(max: number, seed: number | undefined, round: number): number {
  const s = seed !== undefined ? seed * 7919 + round : Date.now() + round;
  return randomInt(mulberry32(s), 1, max);
}

/** F12: higher or lower? Halving the range finds any number in 1..100 within 7 guesses. */
export default function GuessGameScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<GuessGameConfig>) {
  const { max } = config;
  const events = useSceneEvents(onEvent);
  const bound = binarySearchSteps(max);
  const [mode, setMode] = useState<Mode>(config.mode);
  const [round, setRound] = useState(0);
  const secret = useRef<number | null>(null);
  const [pick, setPick] = useState(() => Math.ceil(max / 2));
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [range, setRange] = useState<[number, number]>([1, max]);
  const [note, setNote] = useState("");
  const [solvedRounds, setSolvedRounds] = useState(0);
  const explore = phase === "explore";
  const done = guesses[guesses.length - 1]?.reply === "correct";

  const restart = (nextMode: Mode = mode) => {
    setMode(nextMode);
    setRound((r) => r + 1);
    secret.current = null;
    setGuesses([]);
    setRange([1, max]);
    setPick(Math.ceil(max / 2));
    setNote("");
  };

  const record = (g: Guess, next: [number, number]) => {
    const list = [...guesses, g];
    setGuesses(list);
    setRange(next);
    events.state({ mode, guesses: list.length, low: next[0], high: next[1] });
    if (g.reply === "correct") {
      setSolvedRounds((n) => n + 1);
      events.emit("completed", { mode, moves: list.length, guesses: list.length, bound });
    }
    return list;
  };

  // You guess: the computer holds the secret.
  const guess = () => {
    if (!explore || done) return;
    events.interact();
    if (secret.current === null) secret.current = pickSecret(max, config.seed, round);
    const g = Math.max(1, Math.min(max, Math.round(pick)));
    const reply = replyTo(secret.current, g);
    const wasted = g < range[0] || g > range[1];
    const list = record({ value: g, reply }, narrow(range[0], range[1], g, reply));
    if (reply === "correct") {
      setNote(
        // The worst-case bound is the question's answer: it is stated in the reveal, not here.
        tr(locale, `Got it: ${g}, in ${list.length} guess${list.length === 1 ? "" : "es"}! Could you always do it in that many?`, `猜中了：${g}，用了 ${list.length} 次！每次都能这么快吗？`),
      );
    } else if (wasted) {
      setNote(tr(locale, `You already knew it was between ${range[0]} and ${range[1]}!`, `你已经知道它在 ${range[0]} 和 ${range[1]} 之间了！`));
    } else setNote(reply === "higher" ? tr(locale, `Higher than ${g}.`, `比 ${g} 大。`) : tr(locale, `Lower than ${g}.`, `比 ${g} 小。`));
  };

  // Computer guesses: the child holds the secret and answers.
  const answer = (reply: GuessReply) => {
    if (!explore || done) return;
    events.interact();
    const g = middleGuess(range[0], range[1]);
    const next = narrow(range[0], range[1], g, reply);
    if (next[0] > next[1]) {
      setNote(tr(locale, "Hmm, that doesn't add up. Did your number change? Let's start again.", "咦，对不上。你是不是换了数？我们重来。"));
      restart("computer_guesses");
      return;
    }
    const list = record({ value: g, reply }, next);
    if (reply === "correct") setNote(tr(locale, `Found it in ${list.length} guess${list.length === 1 ? "" : "es"}.`, `${list.length} 次就猜中了。`));
    else setNote("");
  };

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const strip = useMemo(() => halvingStrip(max), [max]);
  const shownSteps = phase === "reveal" ? Math.round(segment(progress, 0.05, 0.75) * (strip.length - 1)) : 0;

  const x = (v: number) => X0 + ((v - 0.5) / max) * (X1 - X0);
  // What the bar shows: the live range, or (reveal) the worst-case range after `shownSteps` halvings.
  const [lo, hi] = phase === "reveal" ? [1, strip[shownSteps]] : phase === "hook" ? [1, max] : range;
  const computerGuess = middleGuess(range[0], range[1]);

  const label = tr(locale, `Guess my number from 1 to ${formatNumber(max, locale)}`, `猜一个 1 到 ${formatNumber(max, locale)} 之间的数`);
  const msg = (() => {
    if (phase === "hook") return tr(locale, `I'm thinking of a number from 1 to ${max}. Higher or lower?`, `我想了一个 1 到 ${max} 的数。大了还是小了？`);
    if (phase === "reveal") {
      if (progress < 0.8) return tr(locale, "Each guess in the middle cuts what's left in half.", "每次猜中间，剩下的范围减半。");
      return tr(locale, `${strip.length - 1} halvings take ${max} down to 1: 2^${bound} = ${formatNumber(2 ** bound, locale)} > ${max}, so ${bound} guesses always do it.`, `${max} 减半 ${strip.length - 1} 次就只剩 1 个：2^${bound} = ${formatNumber(2 ** bound, locale)} > ${max}，所以 ${bound} 次一定够。`);
    }
    if (note) return note;
    return mode === "you_guess"
      ? tr(locale, "Pick a number and press Guess.", "选一个数，点「猜」。")
      : tr(locale, `Think of a number from 1 to ${max}. Is it ${computerGuess}?`, `心里想一个 1 到 ${max} 的数。是 ${computerGuess} 吗？`);
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      {explore && (
        <div className="flex justify-center gap-1" role="group" aria-label={tr(locale, "Who guesses?", "谁来猜？")}>
          <SceneButton onClick={() => restart("you_guess")} variant={mode === "you_guess" ? "primary" : "ghost"} ariaPressed={mode === "you_guess"}>
            {tr(locale, "You guess", "你来猜")}
          </SceneButton>
          <SceneButton onClick={() => restart("computer_guesses")} variant={mode === "computer_guesses" ? "primary" : "ghost"} ariaPressed={mode === "computer_guesses"}>
            {tr(locale, "I guess", "我来猜")}
          </SceneButton>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label={label} className="h-full w-full">
          <rect x={X0} y={BAR_Y - 10} width={X1 - X0} height={20} rx={10} className="fill-gray-200" />
          {lo <= hi && (
            <rect
              x={x(lo) - (X1 - X0) / max / 2}
              y={BAR_Y - 10}
              width={Math.max(4, ((hi - lo + 1) / max) * (X1 - X0))}
              height={20}
              rx={10}
              className={done ? "fill-fun-green" : "fill-primary-400"}
              style={{ transition: reducedMotion ? "none" : "x 400ms, width 400ms" }}
            />
          )}
          <text x={X0} y={BAR_Y + 26} className="fill-gray-500 text-[10px]">1</text>
          <text x={X1} y={BAR_Y + 26} textAnchor="end" className="fill-gray-500 text-[10px]">{max}</text>
          {phase !== "reveal" && lo <= hi && (
            <text x={(x(lo) + x(hi)) / 2} y={BAR_Y + 4} textAnchor="middle" className="fill-white text-[11px] font-bold">
              {done ? guesses[guesses.length - 1]?.value : phase === "hook" ? "?" : `${lo}–${hi}`}
            </text>
          )}
          {phase === "explore" &&
            guesses.map((g, i) => (
              <g key={i} transform={`translate(${x(g.value)},${BAR_Y - 14})`}>
                <path d="M0 0 l-4 -7 h8 z" className={g.reply === "correct" ? "fill-fun-green" : "fill-fun-pink"} />
                <text y={-10} textAnchor="middle" className="fill-gray-600 text-[8px]">{g.value}</text>
              </g>
            ))}
          {explore && (
            <text x={X0} y={14} className={`text-[11px] font-bold ${done ? "fill-green-700" : "fill-primary-700"}`} aria-live="polite">
              {tr(locale, `guesses: ${guesses.length}`, `已猜 ${guesses.length} 次`)}
              {solvedRounds > 0 ? tr(locale, ` · rounds won: ${solvedRounds}`, ` · 已完成 ${solvedRounds} 局`) : ""}
            </text>
          )}
          {phase === "reveal" && <HalvingChips strip={strip} shown={shownSteps} />}
        </svg>
      </div>
      {explore && guesses.length > 0 && <History guesses={guesses} locale={locale} />}
      <SceneMessage>{msg}</SceneMessage>
      {explore && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {done ? (
            <SceneButton onClick={() => restart()}>{tr(locale, "Play again", "再来一局")}</SceneButton>
          ) : mode === "you_guess" ? (
            <>
              <SceneButton onClick={() => setPick((p) => Math.max(1, p - 1))} variant="ghost" className="hidden min-[340px]:inline-block" ariaLabel={tr(locale, "One less", "减一")}>−</SceneButton>
              <input
                type="range"
                min={1}
                max={max}
                value={pick}
                onChange={(e) => setPick(Number(e.target.value))}
                aria-label={tr(locale, "Your guess", "你猜的数")}
                aria-valuetext={`${pick}`}
                className="h-11 w-28 accent-primary-500 sm:w-40"
              />
              <SceneButton onClick={() => setPick((p) => Math.min(max, p + 1))} variant="ghost" className="hidden min-[340px]:inline-block" ariaLabel={tr(locale, "One more", "加一")}>+</SceneButton>
              <SceneButton onClick={guess}>{tr(locale, `Guess ${pick}`, `猜 ${pick}`)}</SceneButton>
            </>
          ) : (
            <>
              <SceneButton onClick={() => answer("higher")} variant="ghost">{tr(locale, "My number is higher ↑", "我的数更大 ↑")}</SceneButton>
              <SceneButton onClick={() => answer("lower")} variant="ghost">{tr(locale, "My number is lower ↓", "我的数更小 ↓")}</SceneButton>
              <SceneButton onClick={() => answer("correct")} variant="accent">{tr(locale, "Yes!", "对了！")}</SceneButton>
            </>
          )}
        </div>
      )}
    </SceneFrame>
  );
}

/** Reveal: 100 → 50 → 25 → … → 1, one halving at a time. */
function HalvingChips({ strip, shown }: { strip: number[]; shown: number }) {
  const step = (X1 - X0) / strip.length;
  return (
    <g>
      {strip.map((v, i) => (
        <g key={i} transform={`translate(${X0 + step * (i + 0.5)},${BAR_Y + 46})`} opacity={i <= shown ? 1 : 0.15} style={{ transition: "opacity 300ms" }}>
          <rect x={-17} y={-11} width={34} height={22} rx={11} className={i === strip.length - 1 ? "fill-fun-green" : "fill-primary-100"} />
          <text textAnchor="middle" dy="0.35em" className="fill-gray-800 text-[11px] font-bold">{v}</text>
          {i > 0 && (
            <text x={-step / 2} y={-14} textAnchor="middle" className="fill-fun-pink text-[8px] font-bold">÷2</text>
          )}
        </g>
      ))}
      <text x={W / 2} y={H - 2} textAnchor="middle" className="fill-gray-500 text-[9px]">{strip.length - 1} × ÷2</text>
    </g>
  );
}

function History({ guesses, locale }: { guesses: Guess[]; locale: SceneLocale }) {
  const arrow = { higher: "↑", lower: "↓", correct: "✓" } as const;
  return (
    <ol className="flex flex-wrap justify-center gap-1" aria-label={tr(locale, "Guesses so far", "已经猜过的数")}>
      {guesses.slice(-10).map((g, i) => (
        <li key={i} className={`rounded-full px-2 py-0.5 text-[10px] tabular-nums sm:text-xs ${g.reply === "correct" ? "bg-fun-green/20 text-green-700" : "bg-primary-100 text-primary-700"}`}>
          {g.value} {arrow[g.reply]}
        </li>
      ))}
    </ol>
  );
}
