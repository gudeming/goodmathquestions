"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  centreCuts,
  chordEndpoints,
  countPizzaRegions,
  crossingPoints,
  lazyCaterer,
  lineToChord,
  optimalCuts,
  pizzaFaces,
  type Chord,
  type PizzaCutsConfig,
  type Point,
  type SceneProps,
} from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const SIZE = 300;
const C = SIZE / 2;
const R = 118;
/** Chords shorter than this (in pizza radii) are crumbs, not cuts. */
const MIN_CHORD = 0.35;
const REVEAL_STEP_MS = 900;
const FACE_FILLS = ["fill-fun-yellow/70", "fill-fun-orange/60", "fill-fun-pink/45", "fill-fun-yellow/40", "fill-fun-red/40", "fill-fun-orange/35", "fill-fun-yellow/90"];
const KEY_ANGLE_STEP = Math.PI / 36;
const KEY_OFFSET_STEP = 0.08;

const toSvg = ([x, y]: Point) => [C + x * R, C - y * R] as const;
const chordLength = (c: Chord) => {
  const [p, q] = chordEndpoints(c);
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
};

/** Keyboard knife: a line at `angle` through the point `offset` radii from the centre along its normal. */
function knifeChord(angle: number, offset: number): Chord | null {
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const p: Point = [nx * offset, ny * offset];
  return lineToChord(p, [p[0] + Math.cos(angle), p[1] + Math.sin(angle)]);
}

/** B2: straight cuts across a pizza. Most pieces happen when every cut crosses every other one at a new point. */
export default function PizzaCutsScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<PizzaCutsConfig>) {
  const { maxCuts } = config;
  const events = useSceneEvents(onEvent);
  const [cuts, setCuts] = useState<Chord[]>([]);
  const [preview, setPreview] = useState<Chord | null>(null);
  const [knife, setKnife] = useState<{ angle: number; offset: number } | null>(null);
  const [message, setMessage] = useState("");
  /** The child's best piece count for each number of cuts (index = cuts). */
  const [bestSeen, setBestSeen] = useState<Array<number | null>>(() => Array.from({ length: maxCuts + 1 }, (_, n) => (n === 0 ? 1 : null)));
  const dragStart = useRef<Point | null>(null);
  const proposed = useRef(false);

  const interactive = phase === "explore";
  const progress = useRevealProgress(phase === "reveal", REVEAL_STEP_MS * (maxCuts + 1), reducedMotion, () => events.emit("reveal_done"));
  const revealCuts = useMemo(() => optimalCuts(maxCuts), [maxCuts]);
  const revealShown = Math.min(maxCuts, Math.ceil(segment(progress, 0, 0.9) * maxCuts));

  const shownCuts = phase === "reveal" ? revealCuts.slice(0, revealShown) : phase === "hook" ? centreCuts(2) : cuts;
  const pieces = countPizzaRegions(shownCuts);
  const faces = useMemo(() => pizzaFaces(shownCuts), [shownCuts]);
  const crossings = useMemo(() => crossingPoints(shownCuts), [shownCuts]);

  const commit = (chord: Chord | null) => {
    if (!interactive) return;
    if (!chord || chordLength(chord) < MIN_CHORD) {
      setMessage(tr(locale, "Cut all the way across the pizza.", "要把披萨整个切穿哦。"));
      return;
    }
    if (cuts.length >= maxCuts) {
      setMessage(tr(locale, `That's all ${maxCuts} cuts. Undo one to try again.`, `${maxCuts} 刀用完了。撤销一刀再试试。`));
      return;
    }
    events.interact();
    const next = [...cuts, chord];
    const n = next.length;
    const count = countPizzaRegions(next);
    const gain = count - countPizzaRegions(cuts);
    setCuts(next);
    record(n, count);
    events.state({ cuts: n, pieces: count, best: lazyCaterer(n) });
    if (count === lazyCaterer(n)) {
      setMessage(tr(locale, `Cut ${n} added ${gain} piece${gain === 1 ? "" : "s"}. That's the most possible for ${n} cut${n === 1 ? "" : "s"}!`, `第 ${n} 刀多出 ${gain} 块，${n} 刀最多就是 ${count} 块！`));
    } else {
      setMessage(tr(locale, `Cut ${n} added ${gain}. Could it cross more cuts, away from old crossings?`, `第 ${n} 刀多出 ${gain} 块。能不能穿过更多刀，又不经过旧交点？`));
    }
    if (n === maxCuts && count === lazyCaterer(maxCuts) && !proposed.current) {
      proposed.current = true;
      events.emit("completed", { moves: n, pieces: count });
      onProposeAnswer?.(String(count));
    }
  };

  const record = (n: number, count: number) =>
    setBestSeen((b) => b.map((v, i) => (i === n ? Math.max(v ?? 0, count) : v)));

  const allThroughCentre = () => {
    events.interact();
    const demo = centreCuts(maxCuts);
    setCuts(demo);
    const count = countPizzaRegions(demo);
    record(demo.length, count);
    events.state({ cuts: demo.length, pieces: count, best: lazyCaterer(demo.length) });
    setMessage(tr(locale, `All through the centre: only ${count} pieces. Every crossing is the same point!`, `全部过圆心：只有 ${count} 块。所有交点挤在同一个点上！`));
  };

  const undo = () => {
    setCuts((c) => c.slice(0, -1));
    setMessage("");
  };
  const clear = () => {
    setCuts([]);
    setMessage("");
    proposed.current = false;
  };

  // Pointer: press, drag, release. The knife is the whole line through both points.
  const toUnit = (e: PointerEvent<SVGSVGElement>): Point | null => {
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM?.();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return [(p.x - C) / R, (C - p.y) / R];
  };
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    dragStart.current = toUnit(e);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const start = dragStart.current;
    const p = start && toUnit(e);
    if (start && p) setPreview(lineToChord(start, p));
  };
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const start = dragStart.current;
    dragStart.current = null;
    setPreview(null);
    const p = start && toUnit(e);
    if (start && p && Math.hypot(p[0] - start[0], p[1] - start[1]) > 0.1) commit(lineToChord(start, p));
  };

  // Keyboard knife: arrows turn and slide it, Enter cuts.
  const knifeLine = knife ? knifeChord(knife.angle, knife.offset) : null;
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const k = knife ?? { angle: 0.4, offset: 0.2 };
    const moves: Record<string, { angle: number; offset: number }> = {
      ArrowLeft: { ...k, angle: k.angle + KEY_ANGLE_STEP },
      ArrowRight: { ...k, angle: k.angle - KEY_ANGLE_STEP },
      ArrowUp: { ...k, offset: Math.min(0.9, k.offset + KEY_OFFSET_STEP) },
      ArrowDown: { ...k, offset: Math.max(-0.9, k.offset - KEY_OFFSET_STEP) },
    };
    if (moves[e.key]) {
      e.preventDefault();
      // The first arrow press only shows the knife where it is.
      setKnife(knife ? moves[e.key] : k);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(knifeChord(k.angle, k.offset));
      setKnife({ angle: k.angle + 0.9, offset: -k.offset * 0.7 });
    }
  };

  const label = tr(locale, `A pizza and ${maxCuts} straight cuts`, `一张披萨，直刀切 ${maxCuts} 下`);
  const best = lazyCaterer(phase === "reveal" ? revealShown : shownCuts.length);

  const status = (() => {
    if (phase === "hook") return tr(locale, `${maxCuts} straight cuts. How many pieces at most?`, `直刀切 ${maxCuts} 下，最多几块？`);
    if (phase === "reveal")
      return revealShown === 0
        ? tr(locale, "Watch: each new cut crosses every old cut at a new point.", "看：每一刀都穿过之前所有的刀，而且不经过旧交点。")
        : tr(locale, `Cut ${revealShown} crosses ${revealShown - 1} cut${revealShown === 2 ? "" : "s"}, so it adds ${revealShown} pieces: ${pieces}.`, `第 ${revealShown} 刀穿过 ${revealShown - 1} 刀，多出 ${revealShown} 块：共 ${pieces} 块。`);
    return message || tr(locale, "Drag a line across the pizza to cut it. (Keyboard: focus the pizza, arrows aim, Enter cuts.)", "在披萨上拖一条线切一刀。（键盘：选中披萨，方向键瞄准，回车切。）");
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="min-h-0 min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            preserveAspectRatio="xMidYMid meet"
            role={interactive ? "application" : "img"}
            aria-label={tr(locale, `${label}. ${shownCuts.length} cuts, ${pieces} pieces.`, `${label}。已切 ${shownCuts.length} 刀，${pieces} 块。`)}
            tabIndex={interactive ? 0 : -1}
            className={`h-full w-full touch-none rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-fun-yellow ${interactive ? "cursor-crosshair" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              dragStart.current = null;
              setPreview(null);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setKnife(null)}
          >
            <circle cx={C} cy={C} r={R + 10} className="fill-fun-orange/70" />
            {faces.map((f, i) => (
              <polygon key={`${shownCuts.length}-${i}`} points={f.map((p) => toSvg(p).join(",")).join(" ")} className={`${FACE_FILLS[i % FACE_FILLS.length]} stroke-none`} style={{ transition: reducedMotion ? "opacity 200ms" : "fill 300ms" }} />
            ))}
            {shownCuts.map((c, i) => {
              const [p, q] = chordEndpoints(c).map(toSvg);
              return <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} className="stroke-white" strokeWidth={4} strokeLinecap="round" />;
            })}
            {crossings.map((x, i) => {
              const [px, py] = toSvg(x.point);
              return <circle key={i} cx={px} cy={py} r={x.chords > 2 ? 6 : 3.5} className={x.chords > 2 ? "fill-fun-red" : "fill-primary-600"} />;
            })}
            {[preview, knifeLine].map((c, i) => {
              if (!c || !interactive) return null;
              const [p, q] = chordEndpoints(c).map(toSvg);
              return <line key={`k${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} className="stroke-primary-600" strokeWidth={3} strokeDasharray="8 6" />;
            })}
            <text x={C} y={C} textAnchor="middle" dy="0.35em" className="fill-gray-800 text-[40px] font-bold" opacity={phase === "hook" ? 0.9 : 0} style={{ pointerEvents: "none" }}>
              ?
            </text>
          </svg>
        </div>
        <CutTable
          locale={locale}
          values={phase === "reveal" ? bestSeen.map((_, n) => (n <= revealShown ? lazyCaterer(n) : null)) : phase === "hook" ? bestSeen.map(() => null) : bestSeen}
          current={phase === "reveal" ? revealShown : shownCuts.length}
          reveal={phase === "reveal"}
        />
      </div>
      <SceneMessage>{status}</SceneMessage>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Counter label={tr(locale, "cuts", "刀数")} value={`${shownCuts.length}/${maxCuts}`} />
        <Counter label={tr(locale, "pieces", "块数")} value={pieces} tone={shownCuts.length > 0 && pieces === best ? "green" : "pink"} />
        {interactive && (
          <>
            <SceneButton onClick={undo} variant="ghost" disabled={cuts.length === 0}>
              {tr(locale, "Undo cut", "撤销一刀")}
            </SceneButton>
            <SceneButton onClick={clear} variant="ghost" disabled={cuts.length === 0}>
              {tr(locale, "New pizza", "换一张披萨")}
            </SceneButton>
            <SceneButton onClick={allThroughCentre} variant="accent">
              {tr(locale, "All through the centre", "全部过圆心")}
            </SceneButton>
          </>
        )}
      </div>
    </SceneFrame>
  );
}

/** cuts → pieces: the child's best while exploring, the true maximum (with "+n") in the reveal. */
function CutTable({ locale, values, current, reveal }: { locale: SceneLocale; values: Array<number | null>; current: number; reveal: boolean }) {
  return (
    <table className="w-20 shrink-0 self-center text-center text-[11px] tabular-nums sm:w-24 sm:text-xs" aria-label={tr(locale, "Most pieces for each number of cuts", "每种刀数最多能切几块")}>
      <thead>
        <tr className="text-gray-500">
          <th className="font-normal">{tr(locale, "cuts", "刀")}</th>
          <th className="font-normal">{reveal ? tr(locale, "max", "最多") : tr(locale, "your best", "你的最好")}</th>
        </tr>
      </thead>
      <tbody>
        {values.map((v, n) => {
          return (
            <tr key={n} className={n === current ? "rounded bg-fun-yellow/30 font-bold text-gray-800" : "text-gray-600"}>
              <td>{n}</td>
              <td>
                {v ?? "?"}
                {reveal && v !== null && n > 0 && <span className="ml-0.5 text-[9px] text-fun-pink">+{n}</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
