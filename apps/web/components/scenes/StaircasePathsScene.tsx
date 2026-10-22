"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { pathKey, staircaseWays, type SceneProps, type StaircasePathsConfig } from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 240;
const H = 150;
const GROUND = 142;
const LEFT = 10;
const MAX_STEPS = 6;
const REVEAL_MIN_MS = 3500;
const MS_PER_TERM = 450;
const HOP_STROKE = ["stroke-fun-pink", "stroke-primary-500", "stroke-fun-purple"];

interface Geometry {
  sw: number;
  sh: number;
  x: (k: number) => number;
  y: (k: number) => number;
}
const geometry = (n: number): Geometry => {
  const sw = (W - 2 * LEFT) / (n + 1);
  const sh = 104 / n;
  return { sw, sh, x: (k) => LEFT + (k + 0.5) * sw, y: (k) => GROUND - k * sh };
};

function Staircase({ n, hops, g, reach, onStep, locale }: { n: number; hops: readonly number[]; g: Geometry; reach: number[]; onStep?: (k: number) => void; locale: SceneLocale }) {
  let pos = 0;
  const arcs = hops.map((h) => {
    const a = pos;
    pos += h;
    return { a, b: pos, h };
  });
  const onKey = (e: KeyboardEvent<SVGRectElement>, k: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onStep?.(k);
    }
  };
  return (
    <g>
      <rect x={LEFT} y={GROUND} width={g.sw} height={6} rx={2} className="fill-fun-green" />
      {Array.from({ length: n }, (_, i) => {
        const k = i + 1;
        return <rect key={k} x={LEFT + k * g.sw} y={g.y(k)} width={g.sw} height={k * g.sh + 6} className={k === n ? "fill-fun-yellow/70 stroke-amber-400" : "fill-primary-100 stroke-primary-300"} strokeWidth={1} />;
      })}
      {Array.from({ length: n }, (_, i) => (
        <text key={i} x={g.x(i + 1)} y={g.y(i + 1) + 11} textAnchor="middle" className="fill-primary-400 text-[8px]">
          {i + 1}
        </text>
      ))}
      <text x={g.x(n)} y={g.y(n) - 22} textAnchor="middle" className="text-[11px]">
        🏁
      </text>
      {arcs.map(({ a, b, h }, i) => {
        const [x1, y1, x2, y2] = [g.x(a), g.y(a) - 2, g.x(b), g.y(b) - 2];
        const cy = Math.min(y1, y2) - 12 - 6 * h;
        return (
          <g key={i}>
            <path d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${cy} ${x2} ${y2}`} fill="none" className={HOP_STROKE[h - 1]} strokeWidth={2.5} strokeLinecap="round" />
            <text x={(x1 + x2) / 2} y={(Math.min(y1, y2) + cy) / 2 - 1} textAnchor="middle" className="fill-gray-700 text-[8px] font-bold">
              +{h}
            </text>
          </g>
        );
      })}
      <text x={g.x(pos)} y={g.y(pos) - 4} textAnchor="middle" className="text-[14px]" style={{ pointerEvents: "none" }}>
        🧒
      </text>
      {reach.map((k) => (
        <rect
          key={k}
          x={LEFT + k * g.sw}
          y={g.y(k) - 24}
          width={g.sw}
          height={GROUND - g.y(k) + 30}
          fill="transparent"
          className="stair-step cursor-pointer outline-none focus-visible:fill-fun-yellow/30"
          role="button"
          tabIndex={0}
          aria-label={tr(locale, `Hop to step ${k} (+${k - pos})`, `跳到第 ${k} 级（+${k - pos}）`)}
          onClick={() => onStep?.(k)}
          onKeyDown={(e) => onKey(e, k)}
        />
      ))}
    </g>
  );
}

/** E2: how many ways up the stairs with hops of 1 or 2 (or 3)? */
export default function StaircasePathsScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<StaircasePathsConfig>) {
  const { maxHop, askN } = config;
  const events = useSceneEvents(onEvent);
  const [n, setN] = useState(config.steps);
  const [hops, setHops] = useState<number[]>([]);
  const [found, setFound] = useState<Record<number, string[]>>({});
  const [note, setNote] = useState("");
  const completedRef = useRef(false);
  const explore = phase === "explore";
  const pos = hops.reduce((a, b) => a + b, 0);
  const atTop = pos === n;
  const from = atTop ? 0 : pos;
  const g = useMemo(() => geometry(phase === "hook" ? 3 : n), [phase, n]);
  const total = (k: number) => staircaseWays(k, maxHop);
  const foundHere = found[n] ?? [];

  const hop = (h: number) => {
    if (!explore || from + h > n) return;
    events.interact();
    const next = [...(atTop ? [] : hops), h];
    setHops(next);
    const p = next.reduce((a, b) => a + b, 0);
    if (p < n) {
      setNote("");
      return;
    }
    const key = pathKey(next);
    if (foundHere.includes(key)) {
      setNote(tr(locale, `${key.replace(/\+/g, " + ")} — already found. Try a different way.`, `${key.replace(/\+/g, " + ")}——已经找到过了，换一种走法。`));
      return;
    }
    const list = [...foundHere, key];
    setFound({ ...found, [n]: list });
    setNote(tr(locale, `New way: ${key.replace(/\+/g, " + ")}!`, `新走法：${key.replace(/\+/g, " + ")}！`));
    events.state({ n, found: list.length, total: total(n) });
    if (n === config.steps && list.length === total(n) && !completedRef.current) {
      completedRef.current = true;
      events.emit("completed", { moves: list.length, steps: n });
    }
  };
  const tapStep = (k: number) => hop(k - from);
  const changeN = (d: number) => {
    const next = Math.max(1, Math.min(MAX_STEPS, n + d));
    if (next === n) return;
    events.interact();
    setN(next);
    setHops([]);
    setNote("");
  };
  const undo = () => {
    if (!explore || hops.length === 0) return;
    setHops(atTop ? [] : hops.slice(0, -1));
    setNote("");
  };

  // Reveal: f(1) … f(askN), each the sum of the previous maxHop values.
  const revealMs = Math.max(REVEAL_MIN_MS, askN * MS_PER_TERM);
  const progress = useRevealProgress(phase === "reveal", revealMs, reducedMotion, () => events.emit("reveal_done"));
  const values = useMemo(() => Array.from({ length: askN }, (_, i) => staircaseWays(i + 1, maxHop)), [askN, maxHop]);
  const shownTerms = phase === "reveal" ? Math.max(1, Math.ceil(segment(progress, 0, 0.9) * askN - 1e-9)) : 0;

  const label = tr(locale, `Climb the stairs with hops of 1${maxHop === 3 ? ", 2 or 3" : " or 2"} steps`, `每次上 1${maxHop === 3 ? "、2 或 3" : " 或 2"} 级，走上楼梯`);
  const fmt = (v: number) => formatNumber(v, locale);
  const msg = (() => {
    if (phase === "hook") return tr(locale, `3 steps, hops of 1 or 2: 1 + 1 + 1, 1 + 2, 2 + 1. What about ${askN} steps?`, `3 级楼梯：1 + 1 + 1、1 + 2、2 + 1。${askN} 级呢？`);
    if (phase === "reveal") {
      const k = shownTerms;
      if (k >= askN && progress >= 0.9) return tr(locale, `${askN} steps: ${fmt(values[askN - 1])} ways. The last hop comes from one step below or two below, so add those two counts.`, `${askN} 级：${fmt(values[askN - 1])} 种。最后一跳要么从下面一级来，要么从下面两级来，所以把这两个数加起来。`);
      if (k <= maxHop) return tr(locale, `f(${k}) = ${fmt(values[k - 1])}`, `f(${k}) = ${fmt(values[k - 1])}`);
      const parts = Array.from({ length: maxHop }, (_, j) => values[k - 2 - j]);
      return `f(${k}) = ${Array.from({ length: maxHop }, (_, j) => `f(${k - 1 - j})`).join(" + ")} = ${parts.map(fmt).join(" + ")} = ${fmt(values[k - 1])}`;
    }
    if (note) return note;
    return tr(locale, "Hop up with the buttons, or tap a step within reach.", "用按钮往上跳，或点一下够得着的台阶。");
  })();

  const reach = explore ? Array.from({ length: maxHop }, (_, i) => from + i + 1).filter((k) => k <= n) : [];

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        {phase === "reveal" ? (
          <RecurrenceView values={values} shown={shownTerms} maxHop={maxHop} askN={askN} locale={locale} />
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={label} className="h-full w-full" onKeyDown={(e) => focusStep(e)}>
            <Staircase n={phase === "hook" ? 3 : n} hops={phase === "hook" ? [1, 2] : hops} g={g} reach={reach} onStep={tapStep} locale={locale} />
          </svg>
        )}
      </div>
      {explore && (
        <div className="flex flex-wrap justify-center gap-1 text-[10px] tabular-nums sm:text-xs" aria-label={tr(locale, "Ways found for each number of steps", "每种楼梯找到的走法")}>
          {Array.from({ length: MAX_STEPS }, (_, i) => i + 1).map((k) => (
            // Only the child's own count per staircase: the totals (and askN's answer) wait for the reveal.
            <span key={k} className={`rounded-full px-1.5 py-0.5 ${k === n ? "bg-primary-500 text-white" : (found[k]?.length ?? 0) === total(k) ? "bg-fun-green/30 text-green-800" : "bg-gray-100 text-gray-600"}`}>
              {k}: {found[k]?.length ?? 0}
              {(found[k]?.length ?? 0) === total(k) ? " ✓" : ""}
            </span>
          ))}
        </div>
      )}
      {explore && foundHere.length > 0 && (
        <div className="flex max-h-10 flex-wrap justify-center gap-1 overflow-hidden text-[10px] sm:text-xs">
          {foundHere.map((k) => (
            <span key={k} className="rounded bg-fun-yellow/30 px-1 tabular-nums">
              {k}
            </span>
          ))}
        </div>
      )}
      <SceneMessage>{msg}</SceneMessage>
      {explore && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          <SceneButton onClick={() => changeN(-1)} variant="ghost" disabled={n <= 1} ariaLabel={tr(locale, "Fewer steps", "少一级")}>
            −
          </SceneButton>
          <Counter label={tr(locale, "steps", "级")} value={n} />
          <SceneButton onClick={() => changeN(1)} variant="ghost" disabled={n >= MAX_STEPS} ariaLabel={tr(locale, "More steps", "多一级")}>
            +
          </SceneButton>
          {Array.from({ length: maxHop }, (_, i) => i + 1).map((h) => (
            <SceneButton key={h} onClick={() => hop(h)} disabled={from + h > n}>
              {tr(locale, `+${h} step${h > 1 ? "s" : ""}`, `上 ${h} 级`)}
            </SceneButton>
          ))}
          <SceneButton onClick={undo} variant="ghost" disabled={hops.length === 0}>
            {tr(locale, "Undo", "撤销")}
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

function focusStep(e: KeyboardEvent<SVGSVGElement>) {
  const keys: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
  const d = keys[e.key];
  if (!d) return;
  const items = Array.from(e.currentTarget.querySelectorAll<SVGElement>(".stair-step"));
  const i = items.indexOf(document.activeElement as SVGElement);
  if (i < 0) return;
  e.preventDefault();
  items[(i + d + items.length) % items.length].focus();
}

/** Reveal: the value chips, plus a zoom on the newest one being built from the previous ones. */
function RecurrenceView({ values, shown, maxHop, askN, locale }: { values: number[]; shown: number; maxHop: number; askN: number; locale: SceneLocale }) {
  const k = shown;
  const sources = k > maxHop ? Array.from({ length: maxHop }, (_, j) => k - maxHop + j) : [];
  const boxW = 64;
  const gap = 14;
  const totalW = (sources.length + 1) * boxW + sources.length * gap + 30;
  const x0 = (W - totalW) / 2;
  const box = (x: number, label: string, v: number, hot: boolean) => (
    <g>
      <rect x={x} y={14} width={boxW} height={34} rx={8} className={hot ? "fill-fun-yellow stroke-amber-500" : "fill-primary-100 stroke-primary-300"} />
      <text x={x + boxW / 2} y={26} textAnchor="middle" className="fill-gray-500 text-[8px]">
        {label}
      </text>
      <text x={x + boxW / 2} y={41} textAnchor="middle" className="fill-gray-800 text-[11px] font-bold">
        {formatNumber(v, locale)}
      </text>
    </g>
  );
  const targetX = x0 + sources.length * (boxW + gap) + 30;
  return (
    <div className="flex h-full flex-col">
      <svg viewBox={`0 0 ${W} 66`} role="img" aria-label={`f(${k}) = ${formatNumber(values[k - 1], locale)}`} className="h-1/2 w-full">
        <defs>
          <marker id="stair-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0 0 L6 3 L0 6 z" className="fill-fun-pink" />
          </marker>
        </defs>
        {sources.map((s, j) => {
          const x = x0 + j * (boxW + gap);
          return (
            <g key={s}>
              {box(x, `f(${s})`, values[s - 1], false)}
              <path d={`M ${x + boxW / 2} 48 Q ${(x + boxW / 2 + targetX + boxW / 2) / 2} ${62} ${targetX + boxW / 2 - 6} 50`} fill="none" className="stroke-fun-pink" strokeWidth={1.5} markerEnd="url(#stair-arrow)" />
            </g>
          );
        })}
        {sources.length > 0 && (
          <text x={targetX - 15} y={36} textAnchor="middle" className="fill-fun-pink text-[14px] font-bold">
            =
          </text>
        )}
        {box(sources.length ? targetX : (W - boxW) / 2, `f(${k})`, values[k - 1], k === askN)}
      </svg>
      <ol className="flex flex-wrap content-start justify-center gap-1 overflow-hidden text-[10px] tabular-nums sm:text-xs" aria-label={tr(locale, "Ways for each number of steps", "每级楼梯的走法数")}>
        {values.slice(0, k).map((v, i) => (
          <li key={i} className={`rounded-full px-1.5 py-0.5 ${i + 1 === askN ? "bg-fun-pink font-bold text-white" : i + 1 === k ? "bg-fun-yellow/60" : "bg-primary-100 text-primary-700"}`}>
            {i + 1}→{formatNumber(v, locale)}
          </li>
        ))}
      </ol>
    </div>
  );
}
