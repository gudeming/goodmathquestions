"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { timesElevenSteps, type DigitSlideConfig, type ElevenStep, type SceneProps } from "@gmq/animation-engine";
import { SceneButton, SceneFrame, SceneMessage, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const STAGE_MS = 800;
const REVEAL_MS = 3600;
const DEFAULT_EXAMPLES = [45, 63, 72, 85];
const HISTORY = 5;

type Slots = { left: string; middle: string; right: string; carry: boolean; joined: boolean };

function slotsFor(step: ElevenStep | undefined, n: number): Slots {
  const l = String(Math.floor(n / 10));
  const r = String(n % 10);
  if (!step) return { left: l, middle: "", right: r, carry: false, joined: true };
  if (step.kind === "split") return { left: String(step.left), middle: "?", right: String(step.right), carry: false, joined: false };
  if (step.kind === "sum") return { left: String(step.left), middle: String(step.middle), right: String(step.right), carry: step.middle >= 10, joined: false };
  if (step.kind === "carry") return { left: String(step.left), middle: String(step.middle), right: String(step.right), carry: false, joined: false };
  const v = String(step.value);
  return { left: v.slice(0, -2), middle: v.slice(-2, -1), right: v.slice(-1), carry: false, joined: true };
}

/** D6: × 11 for two-digit numbers. The digits slide apart and their sum drops into the middle. */
export default function DigitSlideScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<DigitSlideConfig>) {
  const examples = config.examples ?? DEFAULT_EXAMPLES;
  const events = useSceneEvents(onEvent);
  const [input, setInput] = useState("");
  const [n, setN] = useState<number | null>(null);
  const [stage, setStage] = useState(0);
  const [history, setHistory] = useState<Array<[number, number]>>([]);
  const [error, setError] = useState("");
  const [runKey, setRunKey] = useState(0);
  const done = useRef(false);

  const shownN = phase === "hook" ? examples[0] : n ?? examples[0];
  const steps = timesElevenSteps(shownN);

  useEffect(() => {
    if (n === null) return;
    if (reducedMotion) {
      setStage(steps.length - 1);
      return;
    }
    setStage(0);
    const id = setInterval(() => setStage((s) => (s >= steps.length - 1 ? s : s + 1)), STAGE_MS);
    return () => clearInterval(id);
  }, [n, runKey, reducedMotion, steps.length]);

  const multiply = (v: number) => {
    if (phase !== "explore") return;
    events.interact();
    if (!Number.isInteger(v) || v < 10 || v > 99) {
      setError(tr(locale, "Type a two-digit number (10–99).", "请输入一个两位数（10–99）。"));
      return;
    }
    setError("");
    setN(v);
    setInput(String(v));
    setRunKey((k) => k + 1);
    const next = [[v, v * 11] as [number, number], ...history.filter(([h]) => h !== v)].slice(0, HISTORY);
    setHistory(next);
    const carry = Math.floor(v / 10) + (v % 10) >= 10;
    events.state({ n: v, product: v * 11, carry });
    if ((carry || next.length >= 3) && !done.current) {
      done.current = true;
      events.emit("completed", { moves: next.length });
    }
  };

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const current = phase === "explore" && n !== null ? steps[Math.min(stage, steps.length - 1)] : phase === "hook" ? undefined : steps[steps.length - 1];
  const slots = slotsFor(current, shownN);
  const left = Math.floor(shownN / 10);
  const right = shownN % 10;
  const label = tr(locale, "A two-digit number times 11, in one second", "一秒算出两位数乘 11");

  const message = (() => {
    if (phase === "hook") return tr(locale, "45 × 11 = 495. 63 × 11 = 693. See the pattern?", "45 × 11 = 495，63 × 11 = 693。发现规律了吗？");
    if (phase === "reveal")
      return progress > 0.75
        ? tr(locale, `× 11 = × 10 + × 1. Shifted one place, the digits ${left} and ${right} land in the same column, so the middle digit is ${left} + ${right}.`, `× 11 = × 10 + × 1。错开一位相加，${left} 和 ${right} 落在同一列，所以中间是 ${left} + ${right}。`)
        : `${shownN} × 11 = ${shownN} × 10 + ${shownN} × 1`;
    if (error) return error;
    if (n === null) return tr(locale, "Type a two-digit number and press × 11.", "输入一个两位数，点「× 11」。");
    if (!current) return "";
    if (current.kind === "split") return tr(locale, "Slide the digits apart…", "把两个数字分开……");
    if (current.kind === "sum") return current.middle >= 10 ? tr(locale, `${current.left} + ${current.right} = ${current.middle}: too big for one digit!`, `${current.left} + ${current.right} = ${current.middle}：一格放不下！`) : tr(locale, `${current.left} + ${current.right} = ${current.middle} drops into the middle.`, `${current.left} + ${current.right} = ${current.middle} 放进中间。`);
    if (current.kind === "carry") return tr(locale, "Carry the 1 onto the left digit.", "把 1 进位到左边。");
    return `${n} × 11 = ${current.value}`;
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="min-h-0 min-w-0 flex-1">{phase === "reveal" ? <ColumnProof n={shownN} progress={progress} locale={locale} /> : <Digits n={shownN} slots={slots} reducedMotion={reducedMotion} />}</div>
        <ul aria-label={tr(locale, "Worked so far", "算过的")} className="w-[30%] shrink-0 space-y-0.5 self-center text-[11px] tabular-nums text-gray-600 sm:text-xs">
          {history.map(([a, p]) => (
            <li key={a}>
              {a} × 11 = <b className="text-gray-800">{p}</b>
            </li>
          ))}
        </ul>
      </div>
      <SceneMessage>{message}</SceneMessage>
      {phase === "explore" && (
        <form
          className="mt-1 flex flex-wrap items-center justify-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            multiply(Number(input));
          }}
        >
          <input type="number" inputMode="numeric" min={10} max={99} value={input} onChange={(e) => setInput(e.target.value)} aria-label={tr(locale, "A two-digit number", "一个两位数")} placeholder="10–99" className="h-11 w-20 rounded-full border border-gray-200 bg-white px-3 text-center font-bold tabular-nums focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-yellow" />
          <SceneButton onClick={() => multiply(Number(input))}>× 11</SceneButton>
          {examples.map((e) => (
            <SceneButton key={e} onClick={() => multiply(e)} variant="ghost">
              {e}
            </SceneButton>
          ))}
        </form>
      )}
    </SceneFrame>
  );
}

function Digits({ n, slots, reducedMotion }: { n: number; slots: Slots; reducedMotion: boolean }) {
  const spread = slots.joined ? 42 : 70;
  const t = { duration: reducedMotion ? 0 : 0.45 };
  const box = (x: number, text: string, cls: string, key: string) => (
    <motion.g key={key} initial={false} animate={{ x }} transition={t}>
      <rect x={-20} y={60} width={40} height={50} rx={8} className={cls} />
      <text x={0} y={85} dy="0.35em" textAnchor="middle" className="fill-gray-800 text-[28px] font-bold">
        {text}
      </text>
    </motion.g>
  );
  return (
    <svg viewBox="0 0 240 150" role="img" aria-label={`${n} × 11 = ${n * 11}`} className="h-full w-full">
      <text x={120} y={30} textAnchor="middle" className="fill-gray-500 text-[16px] font-bold">
        {n} × 11
      </text>
      {box(120 - spread, slots.left, "fill-primary-100 stroke-primary-300", "l")}
      {box(120 + spread, slots.right, "fill-primary-100 stroke-primary-300", "r")}
      {slots.middle && (
        <motion.g key={`m${slots.middle}`} initial={reducedMotion ? { opacity: 0 } : { y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: reducedMotion ? 0.2 : 0.4 }}>
          <rect x={120 - (slots.carry ? 26 : 20)} y={60} width={slots.carry ? 52 : 40} height={50} rx={8} className={slots.carry ? "fill-fun-red/30 stroke-fun-red" : "fill-fun-yellow/50 stroke-amber-400"} />
          <text x={120} y={85} dy="0.35em" textAnchor="middle" className="fill-gray-800 text-[28px] font-bold">
            {slots.middle}
          </text>
        </motion.g>
      )}
    </svg>
  );
}

/** Reveal: n × 10 above n × 1, shifted one place; the middle column adds the two digits. */
function ColumnProof({ n, progress, locale }: { n: number; progress: number; locale: SceneLocale }) {
  // Four columns so 99 × 11 = 1089 fits; column 2 is the tens column where the two digits meet.
  const tens = String(n * 10).padStart(4, " ");
  const ones = String(n).padStart(4, " ");
  const sum = String(n * 11).padStart(4, " ");
  const col = (i: number) => 75 + i * 30;
  const row = (chars: string, y: number, cls: string, opacity: number) =>
    chars.split("").map((ch, i) => (
      <text key={`${y}-${i}`} x={col(i)} y={y} textAnchor="middle" className={`text-[24px] font-bold ${i === 2 ? "fill-fun-pink" : cls}`} opacity={opacity}>
        {ch.trim()}
      </text>
    ));
  return (
    <svg viewBox="0 0 240 150" role="img" aria-label={`${n} × 10 + ${n} = ${n * 11}`} className="h-full w-full">
      <rect x={col(2) - 15} y={20} width={30} height={112} rx={8} className="fill-fun-pink/10" opacity={segment(progress, 0.45, 0.6)} />
      {row(tens, 44, "fill-gray-800", segment(progress, 0, 0.15))}
      <text x={200} y={44} className="fill-gray-400 text-[10px]" opacity={segment(progress, 0, 0.15)}>{n} × 10</text>
      <text x={45} y={78} textAnchor="middle" className="fill-gray-500 text-[22px]" opacity={segment(progress, 0.15, 0.3)}>+</text>
      {row(ones, 78, "fill-gray-800", segment(progress, 0.15, 0.3))}
      <text x={200} y={78} className="fill-gray-400 text-[10px]" opacity={segment(progress, 0.15, 0.3)}>{n} × 1</text>
      <line x1={50} x2={180} y1={92} y2={92} className="stroke-gray-500" strokeWidth={2} opacity={segment(progress, 0.3, 0.4)} />
      {row(sum, 122, "fill-primary-700", segment(progress, 0.6, 0.75))}
      <text x={col(2)} y={146} textAnchor="middle" className="fill-gray-500 text-[9px]" opacity={segment(progress, 0.6, 0.75)}>{tr(locale, "middle column", "中间一列")}</text>
    </svg>
  );
}
