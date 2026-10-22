"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import {
  applyJugAction,
  isJugsSolved,
  jugActionChanges,
  jugsLedger,
  jugsShortestSolution,
  jugsTimeline,
  type JugAction,
  type JugState,
  type SceneProps,
  type WaterJugsConfig,
} from "@gmq/animation-engine";
import { SceneButton, SceneFrame, SceneMessage, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 360;
const H = 200;
const BASE = 176;
const MAX_H = 128;
const JUG_W = 64;
const JUG_X = [104, 256] as const;
const MS_PER_STEP = 800;
const LEDGER_SHARE = 0.25;
/** Explore shows only the latest steps so the chips never push the buttons off a phone screen. */
const RECENT = 6;

const ACTION_ORDER: JugAction[][] = [
  [{ kind: "fill", jug: 0 }, { kind: "fill", jug: 1 }, { kind: "pour", from: 0, to: 1 }],
  [{ kind: "empty", jug: 0 }, { kind: "empty", jug: 1 }, { kind: "pour", from: 1, to: 0 }],
];

function actionText(a: JugAction, caps: readonly [number, number], locale: SceneLocale): string {
  if (a.kind === "fill") return tr(locale, `Fill ${caps[a.jug]} L`, `装满 ${caps[a.jug]} 升`);
  if (a.kind === "empty") return tr(locale, `Empty ${caps[a.jug]} L`, `倒空 ${caps[a.jug]} 升`);
  return tr(locale, `Pour ${caps[a.from]} → ${caps[a.to]}`, `${caps[a.from]} 倒入 ${caps[a.to]}`);
}

/** F6: measure the target with two jugs and a tap. */
export default function WaterJugsScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<WaterJugsConfig>) {
  const caps = config.jugs;
  const { target } = config;
  const events = useSceneEvents(onEvent);
  const [state, setState] = useState<JugState>([0, 0]);
  const [history, setHistory] = useState<JugAction[]>([]);
  const completedRef = useRef(false);
  const explore = phase === "explore";
  const solved = isJugsSolved(state, target);
  const solution = useMemo(() => jugsShortestSolution(config) ?? [], [config]);
  const timeline = useMemo(() => jugsTimeline(solution, caps), [solution, caps]);
  const ledger = useMemo(() => jugsLedger(solution, config), [solution, config]);
  const unit = MAX_H / Math.max(caps[0], caps[1]);

  const act = (a: JugAction) => {
    if (!explore || solved || !jugActionChanges(state, a, caps)) return;
    events.interact();
    const next = applyJugAction(state, a, caps);
    const steps = history.length + 1;
    setState(next);
    setHistory((h) => [...h, a]);
    events.state({ steps, levels: [...next] });
    if (isJugsSolved(next, target) && !completedRef.current) {
      completedRef.current = true;
      events.emit("completed", { steps, moves: steps, fewest: solution.length });
    }
  };
  const undo = () => {
    if (!explore || history.length === 0) return;
    const h = history.slice(0, -1);
    setHistory(h);
    setState(jugsTimeline(h, caps)[h.length]);
  };
  const reset = () => {
    setHistory([]);
    setState([0, 0]);
  };

  const revealMs = Math.max(3000, (solution.length * MS_PER_STEP) / (1 - LEDGER_SHARE));
  const progress = useRevealProgress(phase === "reveal", revealMs, reducedMotion, () => events.emit("reveal_done"));
  const revealStep = Math.min(solution.length, Math.floor(segment(progress, 0, 1 - LEDGER_SHARE) * solution.length + 1e-9));
  const showLedger = phase === "reveal" && progress >= 1 - LEDGER_SHARE;

  const levels: JugState = phase === "reveal" ? timeline[revealStep] : phase === "hook" ? [0, 0] : state;
  const steps = phase === "reveal" ? revealStep : history.length;
  const label = tr(locale, `Two jugs, ${caps[0]} and ${caps[1]} litres: measure exactly ${target} litres`, `两个壶，${caps[0]} 升和 ${caps[1]} 升：量出正好 ${target} 升`);

  const msg = (() => {
    if (phase === "hook") return tr(locale, `A ${caps[0]}-litre jug, a ${caps[1]}-litre jug and a tap. Measure exactly ${target} litres.`, `一个 ${caps[0]} 升壶、一个 ${caps[1]} 升壶和水龙头。量出正好 ${target} 升。`);
    if (phase === "reveal")
      return showLedger
        ? tr(locale, `Every litre came from the tap or went down the drain: ${caps[0]}s and ${caps[1]}s added and taken away.`, `每一升水不是从水龙头来，就是倒掉了：其实就是在加减 ${caps[0]} 和 ${caps[1]}。`)
        : tr(locale, `Step ${revealStep} of ${solution.length}`, `第 ${revealStep} 步，共 ${solution.length} 步`);
    if (solved)
      return history.length === solution.length
        ? tr(locale, `${target} litres in ${history.length} steps: the fewest possible!`, `${history.length} 步量出 ${target} 升：最少步数！`)
        : tr(locale, `${target} litres in ${history.length} steps! The fewest possible is ${solution.length}.`, `${history.length} 步量出 ${target} 升！最少可以 ${solution.length} 步。`);
    return tr(locale, "Fill, empty or pour. Get one jug to hold exactly the target.", "装满、倒空或互相倒，让一个壶里正好是目标的量。");
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label={label} className="h-full w-full">
          <text x={W / 2} y={16} textAnchor="middle" className="fill-gray-600 text-[11px]">
            {tr(locale, `target: ${target} L · steps: ${steps}`, `目标：${target} 升 · 步数：${steps}`)}
          </text>
          {([0, 1] as const).map((j) => {
            const h = caps[j] * unit;
            const x = JUG_X[j] - JUG_W / 2;
            const level = levels[j] * unit;
            const hit = levels[j] === target && phase !== "hook";
            return (
              <g key={j}>
                <motion.rect
                  x={x + 3}
                  width={JUG_W - 6}
                  initial={false}
                  animate={{ y: BASE - level, height: level }}
                  transition={{ duration: reducedMotion ? 0 : 0.45, ease: "easeInOut" }}
                  className={hit ? "fill-fun-green/70" : "fill-primary-300"}
                />
                <rect x={x} y={BASE - h} width={JUG_W} height={h} rx={8} fill="none" className="stroke-gray-500" strokeWidth={3} />
                {Array.from({ length: caps[j] - 1 }, (_, k) => (
                  <line key={k} x1={x} x2={x + 10} y1={BASE - (k + 1) * unit} y2={BASE - (k + 1) * unit} className="stroke-gray-400" strokeWidth={1} />
                ))}
                {target <= caps[j] && (
                  <line x1={x - 6} x2={x + JUG_W + 6} y1={BASE - target * unit} y2={BASE - target * unit} className="stroke-fun-pink" strokeWidth={1.5} strokeDasharray="4 3" />
                )}
                <text x={JUG_X[j]} y={BASE - h - 6} textAnchor="middle" className="fill-gray-700 text-[11px] font-bold">
                  {tr(locale, `${caps[j]} L jug`, `${caps[j]} 升壶`)}
                </text>
                <text x={JUG_X[j]} y={BASE + 16} textAnchor="middle" className={`text-[12px] font-bold tabular-nums ${hit ? "fill-green-700" : "fill-primary-700"}`} aria-live="polite">
                  {tr(locale, `${levels[j]} / ${caps[j]} L`, `${levels[j]} / ${caps[j]} 升`)}
                </text>
              </g>
            );
          })}
          <text x={W / 2 - 4} y={BASE - 4 - target * unit} textAnchor="middle" className="fill-fun-pink text-[9px]">
            {target} L
          </text>
        </svg>
      </div>
      {(phase === "reveal" || (explore && history.length > 0)) && (
        <ol className="flex flex-wrap justify-center gap-1" aria-label={phase === "reveal" ? tr(locale, "Shortest solution", "最短解法") : tr(locale, "Your steps", "你的步骤")}>
          {(phase === "reveal" ? solution : history.slice(-RECENT)).map((a, k) => {
            const i = phase === "reveal" ? k : Math.max(0, history.length - RECENT) + k;
            return (
            <li
              key={i}
              className={`rounded-full bg-primary-100 px-2 py-0.5 text-[10px] tabular-nums text-primary-700 sm:text-xs ${phase === "reveal" && i === revealStep - 1 ? "ring-2 ring-fun-yellow" : ""} ${phase === "reveal" && i >= revealStep ? "opacity-40" : ""}`}
            >
              {i + 1}. {actionText(a, caps, locale)}
            </li>
            );
          })}
        </ol>
      )}
      {showLedger && (
        <p className="text-center text-sm font-bold tabular-nums text-green-700" aria-label={tr(locale, "Litres in and out", "加进和倒掉的水")}>
          {ledger.terms.map((t) => (t >= 0 ? `+${t}` : `−${-t}`)).join(" ")} = {ledger.result}
        </p>
      )}
      <SceneMessage>{msg}</SceneMessage>
      {explore && (
        <div className="mt-1 grid grid-cols-4 gap-1">
          {ACTION_ORDER.map((row, ri) => (
            <div key={ri} className="contents">
              {row.map((a) => (
                <SceneButton key={actionText(a, caps, "en")} variant={a.kind === "pour" ? "accent" : "primary"} onClick={() => act(a)} disabled={solved || !jugActionChanges(state, a, caps)}>
                  {actionText(a, caps, locale)}
                </SceneButton>
              ))}
              {ri === 0 ? (
                <SceneButton variant="ghost" onClick={undo} disabled={history.length === 0}>
                  {tr(locale, "Undo", "撤销")}
                </SceneButton>
              ) : (
                <SceneButton variant="ghost" onClick={reset} disabled={history.length === 0}>
                  {tr(locale, "Reset", "重来")}
                </SceneButton>
              )}
            </div>
          ))}
        </div>
      )}
    </SceneFrame>
  );
}
