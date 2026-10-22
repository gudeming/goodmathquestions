"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import {
  checkTrickInput,
  formatLinear,
  formatTrickStep,
  linearTrace,
  mulberry32,
  randomTrickInput,
  reverseNumber,
  runTrick,
  trickInputRange,
  trickWidth,
  type NumberTrickStepperConfig,
  type SceneProps,
  type TrickInputCheck,
  type TrickRun,
} from "@gmq/animation-engine";
import { SceneButton, SceneFrame, SceneMessage, bi, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

type HistoryItem = { start: number; final: number; loops: number | null };

const REVEAL_MS = 3200;
const REVEAL_MIN_RUNS = 4;
const HISTORY_SHOWN = 8;

function inputProblem(check: TrickInputCheck, config: NumberTrickStepperConfig, locale: SceneLocale): string {
  if (check.ok) return "";
  const { min, max } = trickInputRange(config);
  if (check.reason === "not_integer") return tr(locale, "Whole numbers only.", "请输入整数。");
  if (check.reason === "out_of_range") return tr(locale, `Pick a number from ${min} to ${max}.`, `请选 ${min} 到 ${max} 之间的数。`);
  return config.input.constraint === "distinct_ends_diff_ge_2"
    ? tr(locale, "The first and last digits must differ by at least 2.", "首位和末位数字至少要差 2。")
    : tr(locale, "The digits can't all be the same.", "数字不能全都一样。");
}

/** D1-D4: the child picks a number and steps through a trick that always lands in the same place. */
export default function NumberTrickStepperScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<NumberTrickStepperConfig>) {
  const events = useSceneEvents(onEvent);
  const [text, setText] = useState("");
  const [problem, setProblem] = useState("");
  const [run, setRun] = useState<TrickRun | null>(null);
  const [shown, setShown] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const rng = useRef(mulberry32(config.seed ?? 1089));
  const completedRef = useRef(false);
  const { min, max } = trickInputRange(config);
  const loop = Boolean(config.loopUntilFixed);

  const finish = (r: TrickRun) => {
    const next = [...history, { start: r.start, final: r.final, loops: r.loopsToFixed }];
    setHistory(next);
    events.state({ runs: next.length, finals: [...new Set(next.map((h) => h.final))] });
    if (!completedRef.current) {
      completedRef.current = true;
      events.emit("completed", { moves: next.length, start: r.start, final: r.final });
    }
  };

  const reveal = (r: TrickRun, count: number) => {
    setShown(count);
    if (count === r.steps.length) finish(r);
  };

  const start = (value: number) => {
    events.interact();
    const check = checkTrickInput(value, config);
    setProblem(inputProblem(check, config, locale));
    if (!check.ok) return;
    const r = runTrick(value, config, { rng: rng.current });
    setRun(r);
    setShown(0);
  };

  const submit = () => {
    const v = Number(text.trim());
    if (text.trim() === "" || !Number.isFinite(v)) {
      setProblem(tr(locale, `Type a number from ${min} to ${max}.`, `输入一个 ${min} 到 ${max} 之间的数。`));
      return;
    }
    start(v);
  };

  const randomStart = () => {
    const v = randomTrickInput(config, rng.current);
    if (v !== null) {
      setText(String(v));
      start(v);
    }
  };

  const advance = (all: boolean) => {
    if (!run || shown >= run.steps.length) return;
    events.interact();
    reveal(run, all ? run.steps.length : shown + 1);
  };
  const again = () => {
    setRun(null);
    setShown(0);
    setText("");
    setProblem("");
  };

  // Reveal needs a few runs to show "everyone lands on the same number".
  const revealHistory = useMemo(() => {
    if (phase !== "reveal") return history;
    const extra: HistoryItem[] = [];
    const r = mulberry32((config.seed ?? 7) + 101);
    while (history.length + extra.length < REVEAL_MIN_RUNS) {
      const s = randomTrickInput(config, r);
      if (s === null) break;
      const res = runTrick(s, config, { rng: r });
      extra.push({ start: s, final: res.final, loops: res.loopsToFixed });
    }
    return [...history, ...extra];
  }, [phase, history, config]);

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const label = tr(locale, "A number trick", "数字魔术");
  const finished = run !== null && shown === run.steps.length;

  if (phase === "hook") {
    return (
      <SceneFrame label={label} inert>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="text-5xl" aria-hidden>
            🎩
          </div>
          <ol className="space-y-1 text-center text-sm text-gray-600">
            {config.steps.map((s, i) => (
              <li key={i}>
                {i + 1}. {bi(locale, s.label)}
              </li>
            ))}
          </ol>
          <div className="rounded-2xl bg-fun-purple/15 px-6 py-2 text-3xl font-bold text-fun-purple">?</div>
        </div>
      </SceneFrame>
    );
  }

  if (phase === "reveal") {
    const items = revealHistory.slice(-HISTORY_SHOWN);
    const extra = config.revealExtra ?? (linearTrace(config.steps) ? "algebra" : "none");
    const trace = extra === "algebra" ? linearTrace(config.steps) : null;
    const panelT = segment(progress, 0.45, 1);
    return (
      <SceneFrame label={label}>
        <div className="flex flex-wrap justify-center gap-2">
          {items.map((h, i) => {
            const t = segment(progress, (i / items.length) * 0.4, (i / items.length) * 0.4 + 0.1);
            return (
              <motion.div key={`${h.start}-${i}`} style={{ opacity: reducedMotion ? 1 : 0.2 + t * 0.8 }} className="flex flex-col items-center rounded-xl bg-white px-3 py-1 shadow-sm">
                <span className="text-xs text-gray-500 tabular-nums">{h.start}</span>
                <span className={`text-lg font-bold tabular-nums ${t >= 1 ? "text-fun-pink" : "text-gray-700"}`}>{h.final}</span>
                {config.expectDivisibleBy !== undefined && <span className="text-[10px] text-gray-500">= {config.expectDivisibleBy} × {h.final / config.expectDivisibleBy}</span>}
                {loop && h.loops !== null && <span className="text-[10px] text-gray-500">{tr(locale, `${h.loops} rounds`, `${h.loops} 轮`)}</span>}
              </motion.div>
            );
          })}
        </div>
        <motion.div className="mt-3 flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden" style={{ opacity: panelT }}>
          {extra === "nines_table" && <NinesTable locale={locale} />}
          {trace && (
            <div className="flex flex-wrap items-center justify-center gap-1 text-sm font-bold sm:text-base">
              {trace.map((f, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-gray-400">→</span>}
                  <span className={`rounded-lg px-2 py-1 ${i === trace.length - 1 ? "bg-fun-pink text-white" : "bg-primary-100 text-primary-700"}`}>{formatLinear(f)}</span>
                </span>
              ))}
            </div>
          )}
          {config.expectFixedPoint !== undefined && (
            <p className="mt-2 text-center text-sm text-gray-600">
              {tr(locale, `Every start lands on ${config.expectFixedPoint}.`, `不管从哪个数开始，都落到 ${config.expectFixedPoint}。`)}
            </p>
          )}
        </motion.div>
      </SceneFrame>
    );
  }

  const width = run ? trickWidth(run.start, config) : 0;
  const visibleSteps = run ? run.steps.slice(0, shown) : [];

  return (
    <SceneFrame label={label}>
      {!run ? (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-sm text-gray-600">{tr(locale, `Think of a number from ${min} to ${max}.`, `想一个 ${min} 到 ${max} 之间的数。`)}</p>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              inputMode="numeric"
              aria-label={tr(locale, "Your number", "你的数")}
              className="h-11 w-28 rounded-xl border-2 border-primary-200 text-center text-lg font-bold tabular-nums focus:border-fun-purple focus:outline-none"
            />
            <SceneButton onClick={submit}>{tr(locale, "Start", "开始")}</SceneButton>
            <SceneButton onClick={randomStart} variant="ghost" ariaLabel={tr(locale, "Pick a random number", "随机选一个数")}>
              🎲
            </SceneButton>
          </form>
          <SceneMessage>{problem}</SceneMessage>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-1" aria-live="polite">
          <p className="mb-1 text-center text-sm text-gray-500">
            {tr(locale, "Your number:", "你的数：")} <span className="font-bold text-primary-700">{run.start}</span>
          </p>
          {(loop ? config.steps.map((s, i) => ({ s, i, r: undefined })) : config.steps.map((s, i) => ({ s, i, r: visibleSteps[i] }))).map(({ s, i, r }) => (
            <div key={i} className={`mb-1 rounded-xl px-3 py-1 text-sm ${!loop && i === shown && !finished ? "bg-fun-yellow/25 font-bold" : "bg-white"}`}>
              <span className="text-gray-600">{bi(locale, s.label)}</span>
              {r && <span className="ml-2 font-mono font-bold text-primary-700">{formatTrickStep(r, run.start, width)}</span>}
            </div>
          ))}
          {loop &&
            visibleSteps.map((r, i) => (
              <div key={i} className="font-mono text-sm tabular-nums text-primary-700">
                {tr(locale, `Round ${r.loop + 1}:`, `第 ${r.loop + 1} 轮：`)} {formatTrickStep(r, run.start, width)}
              </div>
            ))}
          {finished && (
            <motion.p initial={reducedMotion ? { opacity: 0 } : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-1 text-center text-2xl font-bold text-fun-pink">
              {run.final}
            </motion.p>
          )}
        </div>
      )}

      {run && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {finished ? (
            <SceneButton onClick={again} variant="accent">
              {tr(locale, "Try another number", "换个数再来")}
            </SceneButton>
          ) : (
            <>
              <SceneButton onClick={() => advance(false)}>{tr(locale, "Next step", "下一步")}</SceneButton>
              <SceneButton onClick={() => advance(true)} variant="ghost">
                {tr(locale, "Show all", "全部显示")}
              </SceneButton>
            </>
          )}
        </div>
      )}
      {history.length > 0 && (
        <div className="mt-1 flex flex-wrap justify-center gap-1 text-xs tabular-nums" aria-label={tr(locale, "Your tries", "你试过的数")}>
          {history.slice(-HISTORY_SHOWN).map((h, i) => (
            <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
              {h.start} → <b>{h.final}</b>
            </span>
          ))}
        </div>
      )}
    </SceneFrame>
  );
}

/** D1: every 3-digit "difference" is a multiple of 99, and each one plus its reverse is 1089. */
function NinesTable({ locale }: { locale: SceneLocale }) {
  const rows = Array.from({ length: 8 }, (_, i) => 99 * (i + 2));
  return (
    <div className="text-center">
      <p className="mb-1 text-xs text-gray-500">{tr(locale, "The first answer is always a multiple of 99:", "第一步的结果总是 99 的倍数：")}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-xs tabular-nums sm:grid-cols-4 sm:text-sm">
        {rows.map((m) => (
          <span key={m}>
            {m} + {String(reverseNumber(m, 3)).padStart(3, "0")} = <b className="text-fun-pink">{m + reverseNumber(m, 3)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
