"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { frogMinMoves, frogMoveFrom, frogSolution, isFrogDeadEnd, isFrogSolved, type Frog, type FrogMove, type FrogPuzzleConfig, type SceneProps } from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, focusSibling, tr } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 360;
const H = 110;
const PAD_Y = 84;
const FROG_Y = 66;
const MAX_STEP = 60;
const MS_PER_MOVE = 380;
const TABLE_SHARE = 0.25;
const SHAKE = [0, -5, 5, -3, 3, 0];

/** Pads hold frog ids ("G0", "B2", …) so each frog keeps its identity while it moves. */
type Ids = Array<string | null>;
const initialIds = (n: number): Ids => [...Array.from({ length: n }, (_, i) => `G${i}`), null, ...Array.from({ length: n }, (_, i) => `B${i}`)];
const toPads = (ids: Ids): Frog[] => ids.map((id) => (id ? (id[0] as "G" | "B") : null));
const applyIds = (ids: Ids, m: FrogMove): Ids => {
  const next = [...ids];
  next[m.to] = next[m.from];
  next[m.from] = null;
  return next;
};

/** E9: green frogs hop right, brown frogs hop left; swap the two teams. */
export default function FrogPuzzleScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<FrogPuzzleConfig>) {
  const n = config.perSide;
  const best = frogMinMoves(n);
  const events = useSceneEvents(onEvent);
  const [ids, setIds] = useState<Ids>(() => initialIds(n));
  const [history, setHistory] = useState<Array<{ ids: Ids; jumped: string | null }>>([]);
  const [jumped, setJumped] = useState<string | null>(null);
  const [shake, setShake] = useState<{ id: string; key: number } | null>(null);
  const [note, setNote] = useState("");
  const completedRef = useRef(false);
  const proposedRef = useRef(false);
  const explore = phase === "explore";
  const pads = toPads(ids);
  const solved = isFrogSolved(pads);
  const dead = explore && isFrogDeadEnd(pads);
  const moves = history.length;

  const count = 2 * n + 1;
  const step = Math.min(MAX_STEP, (W - 20) / count);
  const x0 = (W - step * count) / 2 + step / 2;
  const padX = (i: number) => x0 + i * step;
  const r = Math.min(17, step * 0.34);

  const tap = (from: number) => {
    if (!explore || solved) return;
    events.interact();
    const id = ids[from];
    if (!id) return;
    const m = frogMoveFrom(pads, from);
    if (!m) {
      setShake((s) => ({ id, key: (s?.key ?? 0) + 1 }));
      setNote(tr(locale, "That frog can't move: frogs only go forward, onto the empty pad, over at most one frog.", "这只青蛙动不了：只能往前跳到空荷叶上，最多跳过一只青蛙。"));
      return;
    }
    const next = applyIds(ids, m);
    const isJump = Math.abs(m.to - m.from) === 2;
    setHistory((h) => [...h, { ids, jumped }]);
    setIds(next);
    setJumped(isJump ? id : null);
    setNote("");
    const mv = moves + 1;
    const nowSolved = isFrogSolved(toPads(next));
    events.state({ moves: mv, solved: nowSolved });
    if (nowSolved) {
      if (!completedRef.current) {
        completedRef.current = true;
        events.emit("completed", { moves: mv, perSide: n });
      }
      if (mv === best && !proposedRef.current) {
        proposedRef.current = true;
        onProposeAnswer?.(String(best));
      }
    }
  };

  const undo = () => {
    if (!explore || history.length === 0) return;
    const last = history[history.length - 1];
    setIds(last.ids);
    setJumped(last.jumped);
    setHistory((h) => h.slice(0, -1));
    setNote("");
  };
  const reset = () => {
    setIds(initialIds(n));
    setHistory([]);
    setJumped(null);
    setNote("");
  };

  // Reveal: the BFS shortest solution, then the n(n + 2) table.
  const solution = useMemo(() => frogSolution(n), [n]);
  const revealMs = Math.max(3000, (solution.length * MS_PER_MOVE) / (1 - TABLE_SHARE));
  const progress = useRevealProgress(phase === "reveal", revealMs, reducedMotion, () => events.emit("reveal_done"));
  const revealStep = Math.min(solution.length, Math.floor(segment(progress, 0, 1 - TABLE_SHARE) * solution.length + 1e-9));
  const revealIds = useMemo(() => {
    let s = initialIds(n);
    for (let i = 0; i < revealStep; i++) s = applyIds(s, solution[i]);
    return s;
  }, [n, revealStep, solution]);
  const revealJumped = revealStep > 0 && Math.abs(solution[revealStep - 1].to - solution[revealStep - 1].from) === 2 ? revealIds[solution[revealStep - 1].to] : null;
  const showTable = phase === "reveal" && progress >= 1 - TABLE_SHARE;

  const shownIds = phase === "reveal" ? revealIds : phase === "hook" ? initialIds(n) : ids;
  const shownJump = phase === "reveal" ? revealJumped : phase === "explore" ? jumped : null;

  const label = tr(locale, `Frog swap: ${n} green and ${n} brown frogs on ${count} lily pads`, `青蛙换位：${count} 片荷叶上 ${n} 只绿蛙和 ${n} 只棕蛙`);
  const msg = (() => {
    if (phase === "hook") return tr(locale, "Green frogs hop right, brown frogs hop left. Swap them!", "绿蛙往右，棕蛙往左。让它们换位！");
    if (phase === "reveal")
      return showTable
        ? tr(locale, "Never let two frogs of the same colour sit side by side too early: they block each other.", "关键：别让同色的两只蛙过早挨在一起，它们会互相挡路。")
        : tr(locale, `Move ${revealStep} of ${solution.length}`, `第 ${revealStep} 步，共 ${solution.length} 步`);
    if (solved)
      return moves === best
        ? tr(locale, `Perfect! ${moves} moves, the fewest possible.`, `完美！${moves} 步，正是最少步数。`)
        : tr(locale, `Swapped in ${moves} moves. Can you do it in fewer?`, `用了 ${moves} 步换完。能更少吗？`);
    if (dead) return tr(locale, "Stuck! No frog can move. Undo a few moves.", "卡住了！没有青蛙能动了。撤销几步试试。");
    return note || tr(locale, "Tap a frog to make it hop or jump.", "点一只青蛙让它跳。");
  })();

  const onFrogKey = (e: KeyboardEvent<SVGGElement>, i: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tap(i);
    }
  };

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label={label} className="h-full w-full" onKeyDown={(e) => focusSibling(e, ".frog")}>
          <rect x={0} y={PAD_Y - 12} width={W} height={H - PAD_Y + 12} rx={10} className="fill-fun-cyan/20" />
          {Array.from({ length: count }, (_, i) => (
            <ellipse key={i} cx={padX(i)} cy={PAD_Y} rx={step * 0.44} ry={9} className={i === n && phase === "hook" ? "fill-green-300" : "fill-green-400"} />
          ))}
          {shownIds.map((id, i) => {
            if (!id) return null;
            const green = id[0] === "G";
            const canMove = explore && frogMoveFrom(toPads(shownIds), i) !== null;
            return (
              <motion.g key={id} initial={false} animate={{ x: padX(i) }} transition={{ duration: reducedMotion ? 0 : phase === "reveal" ? 0.25 : 0.35 }}>
                <motion.g
                  key={`${id}-${shownJump === id ? (phase === "reveal" ? revealStep : moves) : "rest"}-${shake?.id === id ? shake.key : 0}`}
                  animate={reducedMotion ? { opacity: 1 } : shake?.id === id && explore ? { x: SHAKE } : shownJump === id ? { y: [0, -26, 0] } : { y: 0 }}
                  transition={{ duration: reducedMotion ? 0.2 : 0.35 }}
                >
                  <g
                    className={`frog outline-none ${explore ? "cursor-pointer" : ""} [&:focus-visible>circle.ring]:stroke-fun-yellow`}
                    role={explore ? "button" : undefined}
                    tabIndex={explore ? 0 : -1}
                    aria-label={tr(locale, `${green ? "Green" : "Brown"} frog on pad ${i + 1}${canMove ? "" : ", can't move"}`, `第 ${i + 1} 片荷叶上的${green ? "绿" : "棕"}蛙${canMove ? "" : "，动不了"}`)}
                    onClick={() => tap(i)}
                    onKeyDown={(e) => onFrogKey(e, i)}
                  >
                    <rect x={-step / 2} y={FROG_Y - 26} width={step} height={46} fill="transparent" />
                    <circle className="ring" cy={FROG_Y} r={r + 3} fill="none" strokeWidth={3} stroke="transparent" />
                    <FrogBody y={FROG_Y} r={r} green={green} />
                  </g>
                </motion.g>
              </motion.g>
            );
          })}
        </svg>
      </div>
      {showTable && (
        <p className="text-center text-[11px] tabular-nums text-gray-700 sm:text-xs" aria-label={tr(locale, "Fewest moves", "最少步数")}>
          {[1, 2, 3, 4].map((k) => (
            <span key={k} className={`mx-1 rounded-full px-2 py-0.5 ${k === n ? "bg-fun-yellow/40 font-bold" : "bg-primary-100"}`}>
              {k} → {frogMinMoves(k)}
            </span>
          ))}
          <span className="ml-1 font-bold text-primary-700">= n(n + 2)</span>
        </p>
      )}
      <SceneMessage>{msg}</SceneMessage>
      {explore && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Counter label={tr(locale, "moves", "步数")} value={moves} tone={solved ? "green" : "primary"} />
          <SceneButton onClick={undo} variant={dead ? "accent" : "ghost"} disabled={history.length === 0}>
            {tr(locale, "Undo", "撤销")}
          </SceneButton>
          <SceneButton onClick={reset} variant="ghost" disabled={history.length === 0}>
            {tr(locale, "Reset", "重来")}
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

/** A round frog: green ones look right, brown ones look left. */
function FrogBody({ y, r, green }: { y: number; r: number; green: boolean }) {
  const look = green ? 1 : -1;
  const eye = r * 0.32;
  return (
    <g style={{ pointerEvents: "none" }}>
      <ellipse cy={y + r * 0.15} rx={r} ry={r * 0.82} className={green ? "fill-fun-green stroke-green-700" : "fill-amber-600 stroke-amber-900"} strokeWidth={1.5} />
      {[-1, 1].map((s) => (
        <g key={s}>
          <circle cx={s * r * 0.45} cy={y - r * 0.55} r={eye} className="fill-white" />
          <circle cx={s * r * 0.45 + look * eye * 0.4} cy={y - r * 0.55} r={eye * 0.5} className="fill-gray-900" />
        </g>
      ))}
      <path d={`M ${-r * 0.4} ${y + r * 0.2} q ${r * 0.4} ${r * 0.35} ${r * 0.8} 0`} fill="none" className="stroke-gray-900" strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}
