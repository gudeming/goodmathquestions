"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  bankOf,
  canCross,
  crossRiver,
  initialRiverState,
  isRiverSolved,
  riverConflicts,
  riverTimeline,
  shortestSolution,
  type Bank,
  type RiverCrossingConfig,
  type RiverMove,
  type RiverState,
  type SceneProps,
} from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, bi, focusSibling, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { easeInOut, useRevealProgress } from "./useRevealProgress";

const W = 360;
const H = 220;
const BANK_X: Record<Bank, number> = { left: 52, right: 308 };
const BOAT_X: Record<Bank, number> = { left: 136, right: 224 };
const BOAT_Y = 170;
const EATEN_MS = 1400;
const MS_PER_CROSSING = 1000;
const REVEAL_MIN_MS = 3000;
const REVEAL_MAX_MS = 8000;
const FARMER = "🧑‍🌾";

type Item = RiverCrossingConfig["items"][number];
interface Eaten {
  pair: [string, string];
  previous: RiverState;
}

/** Position of the k-th of `count` items on a bank: one column up to 3, then two; rows leave room for the labels. */
function bankSlot(bank: Bank, k: number, count: number): { x: number; y: number } {
  const cx = BANK_X[bank];
  if (count <= 3) return { x: cx, y: 34 + k * 56 };
  return { x: cx + (k % 2 === 0 ? -24 : 24), y: 34 + Math.floor(k / 2) * (count <= 6 ? 56 : 46) };
}

/** F1: ferry everything across; never leave a hungry pair alone. */
export default function RiverCrossingScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<RiverCrossingConfig>) {
  const { items } = config;
  const events = useSceneEvents(onEvent);
  const [state, setState] = useState<RiverState>(initialRiverState);
  const [boat, setBoat] = useState<string[]>([]);
  const [history, setHistory] = useState<RiverState[]>([]);
  const [failures, setFailures] = useState(0);
  const [eaten, setEaten] = useState<Eaten | null>(null);
  const [message, setMessage] = useState("");
  const completedRef = useRef(false);
  const interactive = phase === "explore" && eaten === null;
  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const name = (id: string) => bi(locale, (byId.get(id) as Item).label);
  const crossings = history.length;

  // After an "eaten" crossing, undo it so the child can try again (no penalty beyond the count).
  useEffect(() => {
    if (!eaten) return;
    const t = setTimeout(() => {
      setState(eaten.previous);
      setHistory((h) => h.slice(0, -1));
      setEaten(null);
    }, reducedMotion ? 0 : EATEN_MS);
    return () => clearTimeout(t);
  }, [eaten, reducedMotion]);

  const tapItem = (id: string) => {
    if (!interactive || isRiverSolved(state, config)) return;
    events.interact();
    if (boat.includes(id)) {
      setBoat(boat.filter((b) => b !== id));
      setMessage("");
    } else if (bankOf(state, id) !== state.farmer) {
      setMessage(tr(locale, `The farmer is on the other bank from the ${name(id)}.`, `农夫不在${name(id)}这一岸。`));
    } else if (canCross(state, [...boat, id], config)) {
      setBoat([...boat, id]);
      setMessage("");
    } else {
      setMessage(tr(locale, `The boat only holds ${config.boatCapacity} besides the farmer.`, `船上除了农夫只能坐 ${config.boatCapacity} 样。`));
    }
  };

  const cross = () => {
    if (!interactive) return;
    events.interact();
    const next = crossRiver(state, boat);
    const nextHistory = [...history, state];
    setHistory(nextHistory);
    setState(next);
    setBoat([]);
    const bad = riverConflicts(next, config);
    if (bad.length > 0) {
      const [a, b] = bad[0];
      const f = failures + 1;
      setFailures(f);
      setEaten({ pair: [a, b], previous: state });
      setMessage(tr(locale, `Oh no, the ${name(a)} ate the ${name(b)}! Let's undo that crossing.`, `糟了，${name(a)}把${name(b)}吃了！退回这一步再试。`));
      events.state({ crossings: nextHistory.length - 1, failures: f });
      return;
    }
    events.state({ crossings: nextHistory.length, failures });
    if (isRiverSolved(next, config)) {
      setMessage(tr(locale, `Everyone made it across in ${nextHistory.length} crossings!`, `${nextHistory.length} 次过河，全部安全到达！`));
      if (!completedRef.current) {
        completedRef.current = true;
        events.emit("completed", { crossings: nextHistory.length, failures });
      }
    } else setMessage("");
  };

  const undo = () => {
    if (!interactive || history.length === 0) return;
    setState(history[history.length - 1]);
    setHistory(history.slice(0, -1));
    setBoat([]);
    setMessage("");
  };

  const reset = () => {
    setState(initialRiverState());
    setHistory([]);
    setBoat([]);
    setMessage("");
    completedRef.current = false;
  };

  // Reveal: the BFS shortest solution, one crossing per step.
  const solution = useMemo<RiverMove[]>(() => shortestSolution(config) ?? [], [config]);
  const timeline = useMemo(() => riverTimeline(solution), [solution]);
  const revealMs = Math.min(REVEAL_MAX_MS, Math.max(REVEAL_MIN_MS, solution.length * MS_PER_CROSSING));
  const progress = useRevealProgress(phase === "reveal", revealMs, reducedMotion, () => events.emit("reveal_done"));

  const label = tr(locale, "River crossing: get everything to the other bank", "过河：把所有东西运到对岸");

  // What to draw: a resting state plus (in the reveal) a boat in transit.
  let view: { state: RiverState; boat: string[]; boatX: number; farmer: Bank };
  let revealStep = 0;
  if (phase === "reveal") {
    const t = progress * solution.length;
    revealStep = Math.min(solution.length, Math.floor(t + 1e-9));
    if (revealStep >= solution.length) {
      const last = timeline[timeline.length - 1];
      view = { state: last, boat: [], boatX: BOAT_X[last.farmer], farmer: last.farmer };
    } else {
      const from = timeline[revealStep];
      const move = solution[revealStep];
      const frac = easeInOut(Math.min(1, (t - revealStep) * 1.25));
      view = { state: from, boat: move.carry, boatX: BOAT_X[from.farmer] + (BOAT_X[move.to] - BOAT_X[from.farmer]) * frac, farmer: from.farmer };
    }
  } else if (phase === "hook") {
    view = { state: initialRiverState(), boat: [], boatX: BOAT_X.left, farmer: "left" };
  } else {
    view = { state, boat, boatX: BOAT_X[state.farmer], farmer: state.farmer };
  }

  const isKeyMove = (m: RiverMove | undefined) => Boolean(m && m.to === "left" && m.carry.length > 0);
  const currentMove = phase === "reveal" ? solution[Math.min(revealStep, solution.length - 1)] : undefined;

  const msg = (() => {
    if (phase === "hook") return tr(locale, "One boat, one farmer. Who goes first?", "一条船，一个农夫。先带谁过河？");
    if (phase === "reveal") {
      if (revealStep >= solution.length) return tr(locale, `Done in ${solution.length} crossings. The trick: sometimes going back is going forward.`, `${solution.length} 次过河完成。诀窍：有时候往回走才是前进。`);
      if (isKeyMove(currentMove))
        return tr(locale, `Key move: bring the ${currentMove!.carry.map(name).join(" + ")} back!`, `关键一步：把${currentMove!.carry.map(name).join("和")}带回来！`);
      return tr(locale, `Crossing ${revealStep + 1} of ${solution.length}`, `第 ${revealStep + 1} 次过河，共 ${solution.length} 次`);
    }
    if (message) return message;
    return tr(locale, "Tap things to put them in the boat, then Cross.", "点东西放上船，再点「过河」。");
  })();

  const eatenIds = eaten ? new Set(eaten.pair) : null;
  const onItemKey = (e: KeyboardEvent<SVGGElement>, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tapItem(id);
    }
  };

  const token = (it: Item, x: number, y: number, inBoat: boolean) => {
    const victim = eaten?.pair[1] === it.id;
    const eater = eaten?.pair[0] === it.id;
    return (
      <g
        key={it.id}
        className={`river-item outline-none ${interactive ? "cursor-pointer" : ""} [&:focus-visible>circle.ring]:stroke-fun-yellow`}
        transform={`translate(${x},${y})`}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : -1}
        aria-label={`${bi(locale, it.label)}${inBoat ? tr(locale, ", in the boat", "，在船上") : ""}`}
        aria-pressed={interactive ? inBoat : undefined}
        onClick={() => tapItem(it.id)}
        onKeyDown={(e) => onItemKey(e, it.id)}
      >
        <circle className="ring" r={22} strokeWidth={3} stroke={inBoat ? "#2563eb" : eatenIds?.has(it.id) ? "#f87171" : "transparent"} fill={inBoat ? "#dbeafe" : "#ffffff"} />
        <motion.text
          textAnchor="middle"
          dy="0.35em"
          className="text-[22px]"
          style={{ pointerEvents: "none" }}
          animate={victim ? { opacity: 0.25, scale: reducedMotion ? 1 : 0.6 } : eater && !reducedMotion ? { scale: [1, 1.3, 1, 1.3, 1] } : { opacity: 1, scale: 1 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.8 }}
        >
          {it.emoji}
        </motion.text>
        {!inBoat && (
          <text y={32} textAnchor="middle" className="fill-gray-600 text-[9px]" style={{ pointerEvents: "none" }}>
            {bi(locale, it.label)}
          </text>
        )}
        {eater && (
          <text x={18} y={-14} className="text-[14px]" style={{ pointerEvents: "none" }}>
            😋
          </text>
        )}
      </g>
    );
  };

  const onBank = (bank: Bank) => items.filter((it) => bankOf(view.state, it.id) === bank && !view.boat.includes(it.id));

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label={label} className="h-full w-full" onKeyDown={(e) => focusSibling(e, ".river-item")}>
          <rect x={0} y={0} width={104} height={H} rx={12} className="fill-fun-green/30" />
          <rect x={256} y={0} width={104} height={H} rx={12} className="fill-fun-green/30" />
          <rect x={104} y={0} width={152} height={H} className="fill-fun-cyan/25" />
          <path d="M120 60 q10 -6 20 0 t20 0 M190 110 q10 -6 20 0 t20 0 M130 140 q10 -6 20 0 t20 0" fill="none" className="stroke-fun-cyan" strokeWidth={2} />
          {(["left", "right"] as const).map((bank) => {
            const list = onBank(bank);
            return list.map((it, k) => {
              const p = bankSlot(bank, k, list.length);
              return token(it, p.x, p.y, false);
            });
          })}
          <motion.g initial={false} animate={{ x: view.boatX }} transition={{ duration: phase === "reveal" || reducedMotion ? 0 : 0.6, ease: "easeInOut" }}>
            <path d={`M -38 ${BOAT_Y} h 76 l -12 22 h -52 z`} className="fill-fun-orange" />
            <text x={-22} y={BOAT_Y - 12} textAnchor="middle" className="text-[24px]" style={{ pointerEvents: "none" }}>
              {FARMER}
            </text>
            {view.boat.map((id, i) => token(byId.get(id) as Item, 8 + i * 30, BOAT_Y - 22, true))}
          </motion.g>
        </svg>
      </div>
      {phase === "reveal" && <MoveStrip locale={locale} solution={solution} step={revealStep} name={name} isKeyMove={isKeyMove} />}
      <SceneMessage>{msg}</SceneMessage>
      {phase === "explore" && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Counter label={tr(locale, "crossings", "过河次数")} value={crossings} tone={isRiverSolved(state, config) ? "green" : "primary"} />
          {failures > 0 && <Counter label={tr(locale, "oops", "失败")} value={failures} tone="pink" />}
          <SceneButton onClick={cross} disabled={!interactive || isRiverSolved(state, config)}>
            {boat.length ? tr(locale, `Cross with the ${boat.map(name).join(" + ")}`, `带${boat.map(name).join("和")}过河`) : tr(locale, "Cross alone", "空船过河")}
          </SceneButton>
          <SceneButton onClick={undo} variant="ghost" disabled={!interactive || history.length === 0}>
            {tr(locale, "Undo", "撤销")}
          </SceneButton>
          <SceneButton onClick={reset} variant="ghost" disabled={!interactive || (history.length === 0 && boat.length === 0)}>
            {tr(locale, "Reset", "重来")}
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

/** Reveal: the crossings as chips, current one ringed, the "bring it back" move in pink. */
function MoveStrip({ locale, solution, step, name, isKeyMove }: { locale: SceneLocale; solution: RiverMove[]; step: number; name: (id: string) => string; isKeyMove: (m: RiverMove) => boolean }) {
  return (
    <ol className="flex flex-wrap justify-center gap-1" aria-label={tr(locale, "Shortest solution", "最短解法")}>
      {solution.map((m, i) => (
        <li
          key={i}
          className={`rounded-full px-2 py-0.5 text-[10px] tabular-nums sm:text-xs ${isKeyMove(m) ? "bg-fun-pink/20 text-fun-pink" : "bg-primary-100 text-primary-700"} ${i === step ? "ring-2 ring-fun-yellow" : ""} ${i > step ? "opacity-40" : ""}`}
        >
          {i + 1}. {m.to === "right" ? "→" : "←"} {m.carry.length ? m.carry.map(name).join("+") : tr(locale, "empty", "空船")}
        </li>
      ))}
    </ol>
  );
}
