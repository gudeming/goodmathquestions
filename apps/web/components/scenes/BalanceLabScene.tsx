"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  balancedTernary,
  contiguousReach,
  minWeighings,
  mulberry32,
  placeHeavy,
  splitThree,
  weighBalls,
  weighWeights,
  weighableSet,
  weighingFor,
  type BalanceLabConfig,
  type Rng,
  type SceneProps,
  type Tilt,
} from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, focusSibling, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

type Spot = "off" | "left" | "right";
const W = 360;
const H = 240;
const PIVOT = { x: 180, y: 34 };
const ARM = 110;
const TILT_DEG = 8;
const REVEAL_MS = 4200;

/** Enter / Space activates an SVG "button". */
const onEnter = (enabled: boolean, fn: () => void) => (e: KeyboardEvent) => {
  if (!enabled || (e.key !== "Enter" && e.key !== " ")) return;
  e.preventDefault();
  e.stopPropagation();
  fn();
};

type Item = { key: string; label: string; ariaLabel: string; fillClass: string; selected?: boolean; faded?: boolean; square?: boolean };

/** F2 / E10: a two-pan balance. */
export default function BalanceLabScene(props: SceneProps<BalanceLabConfig>) {
  return props.config.mode === "find_heavy" ? <FindHeavy {...props} /> : <Weights {...props} />;
}

/** Shared balance drawing: beam, two pans (drop targets), items on pans and in the tray. */
type ScaleProps = { tilt: Tilt | null; left: Item[]; right: Item[]; tray: Item[]; interactive: boolean; reducedMotion: boolean; locale: SceneLocale };
type ScaleHandlers = { onItem?: (key: string) => void; onSpot?: (spot: Spot) => void; onDragStart?: (key: string, e: PointerEvent<SVGGElement>) => void; onDrop?: (e: PointerEvent<SVGGElement>) => void };

function Scale({ tilt, left, right, tray, interactive, reducedMotion, locale, onItem, onSpot, onDragStart, onDrop }: ScaleProps & ScaleHandlers) {
  const a = ((tilt === "left" ? -TILT_DEG : tilt === "right" ? TILT_DEG : 0) * Math.PI) / 180;
  const [dx, dy] = [ARM * Math.cos(a), ARM * Math.sin(a)];
  const transition = { duration: reducedMotion ? 0.2 : 0.6, type: "tween" as const };
  const trayCols = Math.min(Math.max(tray.length, 1), 14);
  const trayR = Math.min(16, W / trayCols / 2 - 3);
  const panItem = (items: Item[]) => Math.min(12, 120 / Math.min(5, Math.max(items.length, 1)) / 2 - 1);
  const draw = (it: Item, x: number, y: number, r: number) => (
    <g
      key={it.key}
      transform={`translate(${x},${y})`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={it.ariaLabel}
      aria-pressed={interactive ? Boolean(it.selected) : undefined}
      className={`bl-item outline-none [&:focus-visible>.ring]:stroke-fun-yellow ${interactive ? "cursor-pointer touch-none" : ""}`}
      opacity={it.faded ? 0.25 : 1}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive) onItem?.(it.key);
      }}
      onKeyDown={onEnter(interactive, () => onItem?.(it.key))}
      onPointerDown={(e) => interactive && onDragStart?.(it.key, e)}
      onPointerUp={(e) => interactive && onDrop?.(e)}
    >
      <circle r={Math.max(r + 6, 22)} fill="transparent" />
      <rect className="ring" x={-r - 4} y={-r - 4} width={2 * r + 8} height={2 * r + 8} rx={it.square ? 6 : r + 4} fill="none" strokeWidth={3} stroke={it.selected ? "#fbbf24" : "transparent"} />
      <rect x={-r} y={-r} width={2 * r} height={2 * r} rx={it.square ? 4 : r} className={`${it.fillClass} stroke-white`} strokeWidth={2} />
      <text textAnchor="middle" dy="0.35em" className="fill-white text-[11px] font-bold" style={{ pointerEvents: "none" }}>{it.label}</text>
    </g>
  );
  const pan = (side: "left" | "right", items: Item[]) => {
    const r = panItem(items);
    const [ox, oy] = side === "left" ? [-dx, -dy] : [dx, dy];
    return (
      <motion.g initial={false} animate={{ x: ox, y: oy }} transition={transition}>
        <g
          data-pan={side}
          role={interactive ? "button" : undefined}
          tabIndex={interactive ? 0 : -1}
          aria-label={side === "left" ? tr(locale, "Left pan", "左盘") : tr(locale, "Right pan", "右盘")}
          className="outline-none [&:focus-visible>rect]:stroke-fun-yellow"
          onClick={() => interactive && onSpot?.(side)}
          onKeyDown={onEnter(interactive, () => onSpot?.(side))}
        >
          <line x1={PIVOT.x} y1={PIVOT.y} x2={PIVOT.x - 60} y2={PIVOT.y + 70} className="stroke-gray-300" strokeWidth={1.5} />
          <line x1={PIVOT.x} y1={PIVOT.y} x2={PIVOT.x + 60} y2={PIVOT.y + 70} className="stroke-gray-300" strokeWidth={1.5} />
          <rect x={PIVOT.x - 66} y={PIVOT.y + 2} width={132} height={78} fill="transparent" />
          <rect x={PIVOT.x - 66} y={PIVOT.y + 70} width={132} height={10} rx={5} className="fill-primary-300 stroke-transparent" strokeWidth={3} />
          {items.map((it, i) => draw(it, PIVOT.x - 52 + (i % 5) * 26, PIVOT.y + 70 - r - 2 - Math.floor(i / 5) * (2 * r + 2), r))}
        </g>
      </motion.g>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={tr(locale, "Balance", "天平")} className="h-full w-full" onKeyDown={(e) => focusSibling(e, ".bl-item")}>
      <path d={`M ${PIVOT.x} ${PIVOT.y} L ${PIVOT.x - 16} ${PIVOT.y + 120} L ${PIVOT.x + 16} ${PIVOT.y + 120} Z`} className="fill-gray-200" />
      <motion.line initial={false} x1={PIVOT.x - ARM} y1={PIVOT.y} x2={PIVOT.x + ARM} y2={PIVOT.y} animate={{ x1: PIVOT.x - dx, y1: PIVOT.y - dy, x2: PIVOT.x + dx, y2: PIVOT.y + dy }} transition={transition} className="stroke-gray-600" strokeWidth={5} strokeLinecap="round" />
      <circle cx={PIVOT.x} cy={PIVOT.y} r={6} className="fill-gray-600" />
      {pan("left", left)}
      {pan("right", right)}
      <g data-pan="off" onClick={() => interactive && onSpot?.("off")}>
        <rect x={0} y={166} width={W} height={H - 166} rx={12} className="fill-white/70" />
        {tray.map((it, i) => draw(it, (i % trayCols) * (W / trayCols) + W / trayCols / 2, 186 + Math.floor(i / trayCols) * (2 * trayR + 6), trayR))}
      </g>
    </svg>
  );
}

function useDrag(move: (key: string, spot: Spot) => unknown) {
  const from = useRef<string | null>(null);
  const suppress = useRef(false);
  return {
    /** True (once) right after a drag-drop, so the trailing click doesn't also fire. */
    consumeSuppressed: () => {
      const was = suppress.current;
      suppress.current = false;
      return was;
    },
    onDragStart: (key: string, e: PointerEvent<SVGGElement>) => {
      from.current = key;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onDrop: (e: PointerEvent<SVGGElement>) => {
      const key = from.current;
      from.current = null;
      const spot = document.elementFromPoint(e.clientX, e.clientY)?.closest<SVGGElement>("[data-pan]")?.dataset.pan as Spot | undefined;
      if (key === null || !spot) return;
      const home = e.currentTarget.closest<SVGGElement>("[data-pan]")?.dataset.pan;
      if (home !== spot) {
        suppress.current = true;
        move(key, spot);
      }
    },
  };
}

function FindHeavy({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<BalanceLabConfig>) {
  const items = config.items ?? 9;
  const best = minWeighings(items);
  const events = useSceneEvents(onEvent);
  const rngRef = useRef<Rng | null>(null);
  const heavyRef = useRef<number | null>(null);
  const [where, setWhere] = useState<Spot[]>(() => Array.from({ length: items }, () => "off"));
  const [selected, setSelected] = useState<number | null>(null);
  const [tilt, setTilt] = useState<Tilt | null>(null);
  const [weighings, setWeighings] = useState(0);
  const [result, setResult] = useState<{ guess: number; correct: boolean } | null>(null);
  const [message, setMessage] = useState("");

  const heavy = () => (heavyRef.current ??= placeHeavy((rngRef.current ??= mulberry32(config.seed ?? (Date.now() >>> 0))), items));
  const move = (key: string, spot: Spot) => {
    events.interact();
    const i = Number(key);
    setWhere((w) => w.map((s, j) => (j === i ? spot : s)));
    setTilt(null);
    setSelected(null);
  };
  const drag = useDrag(move);
  const live = phase === "explore" && !result;

  const tapBall = (key: string) => {
    if (drag.consumeSuppressed()) return;
    events.interact();
    const i = Number(key);
    setSelected((s) => (s === i ? null : i));
  };
  const tapSpot = (spot: Spot) => {
    if (selected !== null) move(String(selected), spot);
  };
  const weigh = () => {
    events.interact();
    const left = where.flatMap((s, i) => (s === "left" ? [i] : []));
    const right = where.flatMap((s, i) => (s === "right" ? [i] : []));
    if (!left.length || !right.length) return setMessage(tr(locale, "Put balls on both pans first.", "先在两个盘里都放上球。"));
    const t = weighBalls(left, right, heavy());
    const n = weighings + 1;
    setTilt(t);
    setWeighings(n);
    setMessage(t === "balanced" ? tr(locale, "Balanced! The heavy ball is not on the scale.", "平衡！重球不在天平上。") : tr(locale, `The ${t === "left" ? "left" : "right"} pan went down.`, `${t === "left" ? "左" : "右"}盘沉下去了。`));
    events.state({ weighings: n, tilt: t, left: left.length, right: right.length });
  };
  const guess = () => {
    if (selected === null) return;
    const correct = selected === heavy();
    setResult({ guess: selected, correct });
    events.emit("completed", { moves: weighings, correct });
    if (correct && weighings > 0 && weighings <= best) onProposeAnswer?.(String(best));
    setMessage(
      correct
        ? tr(locale, `Yes! Found in ${weighings} weighing${weighings === 1 ? "" : "s"} (best possible: ${best}).`, `对了！用了 ${weighings} 次（最少可以 ${best} 次）。`)
        : tr(locale, `Not that one. The heavy ball was #${heavy() + 1}.`, `不是这个。重球是 ${heavy() + 1} 号。`),
    );
  };
  const newGame = () => {
    heavyRef.current = null;
    setWhere(Array.from({ length: items }, () => "off"));
    [setSelected, setTilt, setResult].forEach((f) => f(null));
    setWeighings(0);
    setMessage("");
  };

  // Reveal: the 3-3-3 strategy, one weighing at a time.
  const rounds = useMemo(() => {
    if (phase !== "reveal") return [];
    const h = heavyRef.current ?? placeHeavy(mulberry32(config.seed ?? 1), items);
    let cand = Array.from({ length: items }, (_, i) => i);
    const out: Array<{ l: number[]; r: number[]; cand: number[]; next: number[]; tilt: Tilt }> = [];
    while (cand.length > 1) {
      const [l, r, off] = splitThree(cand);
      const t = weighBalls(l, r, h);
      const next = t === "left" ? l : t === "right" ? r : off;
      out.push({ l, r, cand, next, tilt: t });
      cand = next;
    }
    return out;
  }, [phase, items, config.seed]);
  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));

  const ball = (i: number, extra: Partial<Item> = {}): Item => ({
    key: String(i),
    label: String(i + 1),
    ariaLabel: tr(locale, `Ball ${i + 1}`, `${i + 1} 号球`),
    fillClass: result && i === heavyRef.current ? "fill-fun-pink" : "fill-fun-purple",
    selected: selected === i,
    ...extra,
  });

  let view: { tilt: Tilt | null; left: Item[]; right: Item[]; tray: Item[] };
  let msg = message;
  if (phase === "reveal") {
    const k = Math.max(1, rounds.length);
    const idx = Math.min(rounds.length - 1, Math.floor(progress * k * 0.999));
    const r = rounds[idx];
    const local = segment(progress, idx / k, (idx + 1) / k);
    const after = local > 0.5;
    const keep = new Set(after ? r?.next : r?.cand);
    const fade = (i: number) => ball(i, { selected: false, faded: !keep.has(i), fillClass: progress >= 1 && keep.size === 1 && keep.has(i) ? "fill-fun-pink" : "fill-fun-purple" });
    view = r
      ? { tilt: local > 0.3 ? r.tilt : null, left: r.l.map((i) => fade(i)), right: r.r.map((i) => fade(i)), tray: Array.from({ length: items }, (_, i) => i).filter((i) => !r.l.includes(i) && !r.r.includes(i)).map((i) => fade(i)) }
      : { tilt: null, left: [], right: [], tray: [ball(0)] };
    msg = r
      ? tr(locale, `Weighing ${idx + 1} of ${rounds.length}: ${r.l.length} vs ${r.l.length}, ${r.cand.length - 2 * r.l.length} off. Any result leaves a third.`, `第 ${idx + 1} 次（共 ${rounds.length} 次）：${r.l.length} 对 ${r.l.length}，${r.cand.length - 2 * r.l.length} 个不上秤。不管结果如何，都只剩三分之一。`)
      : "";
  } else {
    const at = (s: Spot) => (phase === "hook" ? (s === "off" ? Array.from({ length: items }, (_, i) => i) : []) : where.flatMap((w, i) => (w === s ? [i] : [])));
    view = { tilt: phase === "hook" ? null : tilt, left: at("left").map((i) => ball(i)), right: at("right").map((i) => ball(i)), tray: at("off").map((i) => ball(i)) };
    if (phase === "hook") msg = tr(locale, `${items} balls, one is heavier. Fewest weighings?`, `${items} 个球，一个更重。最少称几次？`);
    else if (!msg) msg = tr(locale, "Tap a ball, then a pan (or drag it). Then weigh.", "点一个球再点一个盘（或直接拖过去），然后称一称。");
  }

  return (
    <SceneFrame label={tr(locale, `Find the heavy ball among ${items}`, `在 ${items} 个球里找出重的`)} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <Scale {...view} interactive={live} reducedMotion={reducedMotion} locale={locale} onItem={tapBall} onSpot={tapSpot} onDragStart={drag.onDragStart} onDrop={drag.onDrop} />
      </div>
      <SceneMessage>{msg}</SceneMessage>
      {phase === "explore" && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Counter label={tr(locale, "weighings", "称重次数")} value={weighings} tone={weighings > best ? "pink" : "primary"} />
          {!result && <SceneButton onClick={weigh}>{tr(locale, "Weigh", "称一称")}</SceneButton>}
          {!result && <SceneButton onClick={guess} variant="accent" disabled={selected === null}>{tr(locale, "This is the heavy one", "这个是重的")}</SceneButton>}
          <SceneButton onClick={newGame} variant="ghost">{tr(locale, "New game", "再来一局")}</SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

type Place = "off" | "opposite" | "beside";
const CYCLE: Record<Place, Place> = { off: "opposite", opposite: "beside", beside: "off" };
const SPOT_PLACE: Record<Spot, Place> = { off: "off", left: "beside", right: "opposite" };

function Weights({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<BalanceLabConfig>) {
  const weights = config.weights ?? [1, 3, 9, 27];
  const events = useSceneEvents(onEvent);
  const reach = useMemo(() => contiguousReach(weights), [weights]);
  // The slider runs past the heaviest weighable amount (to the next ten) so its end doesn't give the answer away.
  const sliderMax = useMemo(() => Math.ceil((Math.max(1, ...weighableSet(weights)) + 1) / 10) * 10, [weights]);
  const [target, setTarget] = useState(config.target ?? 1);
  const [place, setPlace] = useState<Place[]>(() => weights.map(() => "off"));
  const [found, setFound] = useState<number[]>([]);
  const moves = useRef(0);
  const completedRef = useRef(false);

  const sum = (p: Place[], which: Place) => weights.filter((_, i) => p[i] === which);
  const commit = (t: number, p: Place[]) => {
    events.interact();
    moves.current++;
    setTarget(t);
    setPlace(p);
    const balanced = weighWeights(t, sum(p, "beside"), sum(p, "opposite")) === "balanced";
    const next = balanced && !found.includes(t) ? [...found, t].sort((a, b) => a - b) : found;
    if (next !== found) setFound(next);
    const k = next.filter((v) => v <= reach).length;
    events.state({ target: t, balanced, found: k });
    if (k >= reach && !completedRef.current) {
      completedRef.current = true;
      events.emit("completed", { moves: moves.current });
      onProposeAnswer?.(String(reach));
    }
  };
  const drag = useDrag((key, spot) => key !== "object" && commit(target, place.map((p, i) => (String(i) === key ? SPOT_PLACE[spot] : p))));
  const tapWeight = (key: string) => {
    if (drag.consumeSuppressed() || key === "object") return;
    commit(target, place.map((p, i) => (String(i) === key ? CYCLE[p] : p)));
  };

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const shownPlace = phase === "hook" ? weights.map((): Place => "off") : place;
  const tilt = weighWeights(target, sum(shownPlace, "beside"), sum(shownPlace, "opposite"));
  const item = (i: number): Item => ({ key: String(i), label: `${weights[i]}`, ariaLabel: tr(locale, `${weights[i]} g weight, ${shownPlace[i]}`, `${weights[i]} 克砝码`), fillClass: "fill-fun-orange", square: true });
  const objectItem: Item = { key: "object", label: `${target}g`, ariaLabel: tr(locale, `Object, ${target} g`, `物品，${target} 克`), fillClass: "fill-primary-500", square: true };
  const idx = (p: Place) => shownPlace.flatMap((s, i) => (s === p ? [i] : []));

  if (phase === "reveal") return <TernaryTable weights={weights} reach={reach} progress={progress} locale={locale} />;

  return (
    <SceneFrame label={tr(locale, `Weigh whole grams with ${weights.join(", ")}`, `用 ${weights.join("、")} 称出整数克`)} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <Scale tilt={tilt} left={[objectItem, ...idx("beside").map(item)]} right={idx("opposite").map(item)} tray={idx("off").map(item)} interactive={phase === "explore"} reducedMotion={reducedMotion} locale={locale} onItem={tapWeight} onDragStart={drag.onDragStart} onDrop={drag.onDrop} />
      </div>
      <SceneMessage>
        {phase === "hook"
          ? tr(locale, `${weights.length} weights, two pans. From 1 g up, with no gaps: how far can you go?`, `${weights.length} 个砝码，两个盘。从 1 克往上一克不漏，能称到几克？`)
          : tilt === "balanced"
            ? tr(locale, `Balanced: ${target} g measured!`, `平衡了：称出了 ${target} 克！`)
            : tr(locale, "Tap a weight: off → other pan → object's pan.", "点砝码：不用 → 对面盘 → 物品这边。")}
      </SceneMessage>
      {phase === "explore" && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <label className="flex min-h-[44px] items-center gap-2 text-xs text-gray-600 sm:text-sm">
            {tr(locale, "object", "物品")}
            <input type="range" min={1} max={sliderMax} value={target} onChange={(e) => commit(Number(e.target.value), place)} aria-label={tr(locale, "Object weight in grams", "物品重量（克）")} className="h-11 w-24 accent-primary-500 sm:w-36" />
          </label>
          {/* Reached weights as a growing strip: no denominator before the reveal. */}
          <div className="flex items-center gap-1" aria-label={tr(locale, `Weighed so far: ${found.join(", ") || "none"}`, `已称出：${found.join("、") || "还没有"}`)}>
            <div className="flex max-w-[7rem] flex-wrap gap-px sm:max-w-[10rem]">{found.map((v) => <span key={v} title={`${v} g`} className="h-2.5 w-1.5 rounded-sm bg-fun-green" />)}</div>
            <span className="text-xs tabular-nums text-gray-600">{tr(locale, `${found.length} found`, `已称出 ${found.length} 种`)}</span>
          </div>
          <SceneButton onClick={() => commit(target, weights.map(() => "off"))} variant="ghost">{tr(locale, "Clear", "清空")}</SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

/** Reveal for the weights mode: each weight is -1 (beside the object), 0 (off) or +1 (opposite). */
function TernaryTable({ weights, reach, progress, locale }: { weights: number[]; reach: number; progress: number; locale: SceneLocale }) {
  const sorted = [...weights].sort((a, b) => a - b);
  const powersOf3 = sorted.every((w, i) => w === 3 ** i);
  const rows = Math.ceil(segment(progress, 0, 0.9) * reach);
  const digits = (n: number): number[] => {
    if (powersOf3) {
      const d = balancedTernary(n);
      return sorted.map((_, i) => d[i] ?? 0);
    }
    const w = weighingFor(n, sorted);
    return sorted.map((x) => (w?.opposite.includes(x) ? 1 : w?.beside.includes(x) ? -1 : 0));
  };
  const sign = (d: number) => (d === 1 ? <span className="text-green-600">+</span> : d === -1 ? <span className="text-fun-orange">−</span> : <span className="text-gray-300">·</span>);
  return (
    <SceneFrame label={tr(locale, `Every weight from 1 to ${reach}`, `1 到 ${reach} 的每一种称法`)}>
      <p className="text-center text-[11px] text-gray-600 sm:text-xs">
        <span className="text-green-600">+</span> {tr(locale, "other pan", "对面盘")} · <span className="text-gray-400">·</span> {tr(locale, "off", "不用")} · <span className="text-fun-orange">−</span> {tr(locale, "object's pan", "物品这边")}
        {powersOf3 && tr(locale, " — base 3 with digits −1, 0, 1", " —— 用 −1、0、1 写的三进制")}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-x-3 font-mono text-[11px] tabular-nums sm:grid-cols-4 sm:text-xs">
          {Array.from({ length: rows }, (_, i) => i + 1).map((n) => {
            const d = digits(n);
            return (
              <div key={n} className="flex items-center justify-between gap-1 border-b border-gray-100 py-0.5">
                <span className="w-8 text-right font-bold text-gray-700">{n}</span>
                <span className="flex gap-1">
                  {d.map((x, j) => (
                    <span key={j} title={`${sorted[j]}`} className="w-3 text-center">{sign(x)}</span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <SceneMessage>{tr(locale, `Columns: ${sorted.join(", ")}. All ${reach} weights, no gaps.`, `列：${sorted.join("、")}。${reach} 种重量，一个不缺。`)}</SceneMessage>
    </SceneFrame>
  );
}
