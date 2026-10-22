"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  applyHanoiMove,
  initialHanoi,
  isHanoiSolved,
  isLegalMove,
  minMoves,
  optimalSequence,
  topDisc,
  type HanoiState,
  type SceneProps,
  type TowerOfHanoiConfig,
} from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, focusSibling, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { useRevealProgress } from "./useRevealProgress";

const W = 360;
const H = 200;
const BASE_Y = 184;
const PEG_TOP = 52;
const LIFT_Y = 30;
const PEG_X = [60, 180, 300] as const;
const MAX_DISCS = 8;
const MS_PER_MOVE = 420;
const REVEAL_MIN_MS = 3000;
const REVEAL_MAX_MS = 8000;
const TABLE_ROWS = 5;
const DISC_FILLS = ["fill-fun-pink", "fill-fun-orange", "fill-fun-yellow", "fill-fun-green", "fill-fun-cyan", "fill-primary-500", "fill-fun-purple", "fill-fun-red"];
const SHAKE = [0, -8, 8, -5, 5, 0];

const pegAt = (x: number) => (x < 120 ? 0 : x < 240 ? 1 : 2);

/** Client point -> SVG user-space point (viewBox coordinates). */
function toSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const m = svg.getScreenCTM?.();
  if (!m) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const p = pt.matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

/** E1: move the tower one disc at a time, never a big disc on a small one. */
export default function TowerOfHanoiScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<TowerOfHanoiConfig>) {
  const { askDiscs } = config;
  const events = useSceneEvents(onEvent);
  const maxDiscs = Math.min(MAX_DISCS, Math.max(6, askDiscs ?? 0));
  const [n, setN] = useState(config.discs);
  const [pegs, setPegs] = useState<HanoiState>(() => initialHanoi(config.discs));
  const [moves, setMoves] = useState(0);
  const [lifted, setLifted] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [shake, setShake] = useState<{ peg: number; key: number } | null>(null);
  const [message, setMessage] = useState("");
  /** The child's fewest moves per tower size (the formula waits for the reveal). */
  const [bestSoFar, setBestSoFar] = useState<Record<number, number>>({});
  const dragging = useRef<{ from: number } | null>(null);
  const completedRef = useRef(false);
  const proposedRef = useRef(false);
  const interactive = phase === "explore";
  const solved = isHanoiSolved(pegs, n);

  const restart = (discs: number) => {
    setN(discs);
    setPegs(initialHanoi(discs));
    setMoves(0);
    setLifted(null);
    setDrag(null);
    setMessage("");
    completedRef.current = false;
  };

  const lift = (peg: number) => {
    if (solved || topDisc(pegs, peg) === undefined) return false;
    events.interact();
    setLifted(peg);
    return true;
  };

  const drop = (to: number, from: number | null = lifted) => {
    if (from === null) return;
    setLifted(null);
    if (from === to) return;
    if (!isLegalMove(pegs, from, to)) {
      setShake((s) => ({ peg: to, key: (s?.key ?? 0) + 1 }));
      setMessage(tr(locale, "A bigger disc can't sit on a smaller one.", "大盘不能压在小盘上。"));
      return;
    }
    const next = applyHanoiMove(pegs, from, to);
    const m = moves + 1;
    setPegs(next);
    setMoves(m);
    events.state({ moves: m, discs: n });
    if (isHanoiSolved(next, n)) {
      const best = minMoves(n);
      const prevBest = bestSoFar[n];
      setBestSoFar({ ...bestSoFar, [n]: prevBest === undefined ? m : Math.min(prevBest, m) });
      setMessage(
        prevBest === undefined || m < prevBest
          ? tr(locale, `Solved in ${m} moves: your best with ${n} discs so far.`, `${m} 步完成：这是你搬 ${n} 个盘的最好成绩。`)
          : tr(locale, `Solved in ${m} moves. Your best with ${n} discs is still ${prevBest}.`, `${m} 步完成。你搬 ${n} 个盘的最好成绩还是 ${prevBest} 步。`),
      );
      if (!completedRef.current) {
        completedRef.current = true;
        events.emit("completed", { moves: m, discs: n });
      }
      if (askDiscs !== undefined && n === askDiscs && m === best && !proposedRef.current) {
        proposedRef.current = true;
        onProposeAnswer?.(String(minMoves(askDiscs)));
      }
    } else setMessage("");
  };

  const activatePeg = (peg: number) => {
    if (!interactive) return;
    if (lifted === null) lift(peg);
    else drop(peg);
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!interactive || e.button > 0) return;
    const p = toSvg(e.currentTarget, e.clientX, e.clientY);
    if (!p) return;
    const peg = pegAt(p.x);
    if (lifted !== null) {
      drop(peg);
      return;
    }
    if (lift(peg)) {
      dragging.current = { from: peg };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const p = toSvg(e.currentTarget, e.clientX, e.clientY);
    if (p) setDrag(p);
  };
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const d = dragging.current;
    dragging.current = null;
    setDrag(null);
    if (!d) return;
    const p = toSvg(e.currentTarget, e.clientX, e.clientY);
    const peg = p ? pegAt(p.x) : d.from;
    // Released over the same peg: a tap, so the disc stays lifted for tap-tap play.
    if (peg !== d.from) drop(peg, d.from);
  };

  // Reveal: the optimal solution for the asked-about tower.
  const revealN = askDiscs ?? config.discs;
  const seq = useMemo(() => optimalSequence(revealN), [revealN]);
  const revealMs = Math.min(REVEAL_MAX_MS, Math.max(REVEAL_MIN_MS, seq.length * MS_PER_MOVE));
  const progress = useRevealProgress(phase === "reveal", revealMs, reducedMotion, () => events.emit("reveal_done"));
  const revealStep = Math.min(seq.length, Math.floor(progress * seq.length + 1e-9));
  const revealPegs = useMemo(() => {
    let s = initialHanoi(revealN);
    for (let i = 0; i < revealStep; i++) s = applyHanoiMove(s, seq[i][0], seq[i][1]);
    return s;
  }, [revealN, revealStep, seq]);

  const label = tr(locale, "Tower of Hanoi: move the tower to another peg", "汉诺塔：把整座塔搬到另一根柱子");
  const shownN = phase === "reveal" ? revealN : phase === "hook" ? config.discs : n;
  const shownPegs = phase === "reveal" ? revealPegs : phase === "hook" ? initialHanoi(config.discs) : pegs;
  const shownLifted = interactive ? lifted : null;
  const discH = Math.min(18, (BASE_Y - PEG_TOP - 8) / shownN);
  const discW = (size: number) => 26 + (size / shownN) * 84;

  const msg = (() => {
    if (phase === "hook") return tr(locale, "Move the whole tower. Never put a big disc on a small one.", "搬走整座塔，大盘不能压小盘。");
    if (phase === "reveal")
      return tr(
        locale,
        `Move ${revealN - 1} discs out of the way, move the biggest, move the ${revealN - 1} back on top. One more disc doubles the work, plus 1: 2^${revealN} − 1 = ${minMoves(revealN)} moves.`,
        `先把上面 ${revealN - 1} 个搬开，再搬最大的，再把 ${revealN - 1} 个搬回来。每多一个盘，步数翻倍再加 1：2^${revealN} − 1 = ${minMoves(revealN)} 步。`,
      );
    if (message) return message;
    return lifted === null ? tr(locale, "Tap (or drag) a peg's top disc, then tap where it goes.", "点（或拖）一根柱子最上面的盘，再点要放的柱子。") : tr(locale, "Now tap the peg to put it on.", "再点要放上去的柱子。");
  })();

  const onPegKey = (e: KeyboardEvent<SVGGElement>, peg: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activatePeg(peg);
    }
  };

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="min-h-0 min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            role="group"
            aria-label={label}
            className={`h-full w-full ${interactive ? "touch-none" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              dragging.current = null;
              setDrag(null);
            }}
            onKeyDown={(e) => focusSibling(e, ".hanoi-peg")}
          >
            <rect x={8} y={BASE_Y} width={W - 16} height={10} rx={5} className="fill-primary-200" />
            {PEG_X.map((x, peg) => {
              const stack = shownPegs[peg];
              const isShaking = shake?.peg === peg;
              return (
                <g
                  key={peg}
                  className={`hanoi-peg outline-none ${interactive ? "cursor-pointer" : ""} [&:focus-visible>rect.hit]:stroke-fun-yellow`}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : -1}
                  aria-label={tr(locale, `Peg ${peg + 1}, ${stack.length} discs${shownLifted === peg ? ", disc lifted" : ""}`, `${peg + 1} 号柱，${stack.length} 个盘${shownLifted === peg ? "，已拿起" : ""}`)}
                  onKeyDown={(e) => onPegKey(e, peg)}
                >
                  <rect className="hit" x={x - 58} y={8} width={116} height={BASE_Y - 4} rx={12} fill="transparent" strokeWidth={3} stroke="transparent" />
                  {isShaking && reducedMotion && (
                    <motion.rect key={shake.key} x={x - 58} y={PEG_TOP - 8} width={116} height={BASE_Y - PEG_TOP + 8} rx={12} className="fill-fun-red/20" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.2, delay: 0.3 }} />
                  )}
                  <motion.g key={isShaking ? `s${shake.key}` : "still"} animate={{ x: isShaking && !reducedMotion ? SHAKE : 0 }} transition={{ duration: 0.4 }}>
                    <rect x={x - 4} y={PEG_TOP} width={8} height={BASE_Y - PEG_TOP} rx={4} className="fill-primary-300" />
                    {stack.map((size, i) => {
                      const isTop = i === stack.length - 1;
                      const up = isTop && shownLifted === peg;
                      const cx = up && drag ? drag.x : x;
                      const y = up ? (drag ? drag.y - discH / 2 : LIFT_Y) : BASE_Y - (i + 1) * discH;
                      return (
                        <rect
                          key={size}
                          x={cx - discW(size) / 2}
                          y={y}
                          width={discW(size)}
                          height={discH - 2}
                          rx={(discH - 2) / 2}
                          className={`${DISC_FILLS[(size - 1) % DISC_FILLS.length]} ${up ? "stroke-gray-700" : "stroke-white"}`}
                          strokeWidth={2}
                          style={{ transition: drag || reducedMotion ? undefined : "y 180ms, x 180ms" }}
                        />
                      );
                    })}
                  </motion.g>
                </g>
              );
            })}
            {phase === "hook" && (
              <text x={PEG_X[2]} y={PEG_TOP + 40} textAnchor="middle" className="fill-fun-purple text-[34px] font-bold">
                ?
              </text>
            )}
          </svg>
        </div>
        {phase === "reveal" && <MovesTable locale={locale} n={revealN} step={revealStep} total={seq.length} />}
      </div>
      <SceneMessage>{msg}</SceneMessage>
      {interactive && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Counter label={tr(locale, "moves", "步数")} value={moves} tone={solved ? "green" : "primary"} />
          <Counter label={tr(locale, "best so far", "最好成绩")} value={bestSoFar[n] ?? "–"} tone="pink" />
          <SceneButton onClick={() => restart(n)} variant="ghost" disabled={moves === 0}>
            {tr(locale, "Reset", "重来")}
          </SceneButton>
          <SceneButton
            onClick={() => {
              events.interact();
              restart(n + 1);
            }}
            disabled={n >= maxDiscs}
          >
            {tr(locale, `Add a disc (${n + 1})`, `再加一个盘（${n + 1}）`)}
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

/** Reveal side table: n -> 2^n - 1, the current tower highlighted. */
function MovesTable({ locale, n, step, total }: { locale: SceneLocale; n: number; step: number; total: number }) {
  const rows = Math.max(TABLE_ROWS, n);
  return (
    <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 sm:w-32">
      <p className="text-center text-[10px] tabular-nums text-gray-500 sm:text-xs">
        {tr(locale, "move", "第")} {step}/{total}
        {tr(locale, "", " 步")}
      </p>
      <table className="w-full text-center text-[11px] tabular-nums sm:text-xs" aria-label={tr(locale, "Fewest moves for n discs", "n 个盘的最少步数")}>
        <thead>
          <tr className="text-gray-500">
            <th className="font-normal">{tr(locale, "discs", "盘")}</th>
            <th className="font-normal">{tr(locale, "moves", "步")}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => i + 1).map((k) => (
            <tr key={k} className={k === n ? "rounded bg-fun-yellow/40 font-bold text-gray-800" : "text-gray-600"}>
              <td>{k}</td>
              <td>{minMoves(k)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-center text-[10px] font-bold text-fun-pink sm:text-xs">2ⁿ − 1</p>
    </div>
  );
}
