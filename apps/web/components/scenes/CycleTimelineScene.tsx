"use client";

import { useMemo, useState } from "react";
import { collisions, lcm, type CycleTimelineConfig, type SceneProps } from "@gmq/animation-engine";
import { SceneButton, SceneFrame, SceneMessage, bi, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 360;
const COLS = 20;
const LEFT = 34;
const STEP = (W - LEFT - 8) / COLS;
const BAND_H = 32;
const TOP = 6;
const MIN_P = 2;
const MAX_P = 30;
const REVEAL_MS = 6000;
const EXTRA_PRIME = 17;
const DEFAULT_LABELS = { a: { en: "cicadas", zh: "蝉" }, b: { en: "predators", zh: "天敌" } };

const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};

interface Row {
  a: number;
  b: number;
  every: number;
  times: number;
}

/** E8: two cycles light up their years; the red years are when cicadas meet predators. */
export default function CycleTimelineScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<CycleTimelineConfig>) {
  const events = useSceneEvents(onEvent);
  const { years } = config;
  const [a, setA] = useState(config.a);
  const [b, setB] = useState(config.b);
  const explore = phase === "explore";
  const nameA = bi(locale, config.labels?.a ?? DEFAULT_LABELS.a);
  const nameB = bi(locale, config.labels?.b ?? DEFAULT_LABELS.b);

  const rows = useMemo<Row[]>(() => {
    const periods = [config.altA ?? 12, config.a, EXTRA_PRIME].filter((p, i, arr) => arr.indexOf(p) === i);
    return periods.map((p) => ({ a: p, b: config.b, every: lcm(p, config.b), times: collisions(p, config.b, years).length }));
  }, [config.altA, config.a, config.b, years]);

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const revealRow = Math.min(rows.length - 1, Math.floor(segment(progress, 0, 0.9) * rows.length));

  // What the lamps show: the child's periods, the config's on the poster, the row being explained in the reveal.
  const [pa, pb] = phase === "explore" ? [a, b] : phase === "reveal" ? [rows[revealRow].a, rows[revealRow].b] : [config.a, config.b];
  const hits = useMemo(() => collisions(pa, pb, years), [pa, pb, years]);
  const first = hits[0];
  const bands = Math.ceil(years / COLS);
  const H = TOP + bands * BAND_H + 2;

  const change = (na: number, nb: number) => {
    if (!explore) return;
    events.interact();
    const ca = Math.max(MIN_P, Math.min(MAX_P, na));
    const cb = Math.max(MIN_P, Math.min(MAX_P, nb));
    setA(ca);
    setB(cb);
    events.state({ a: ca, b: cb, firstCollision: collisions(ca, cb, years)[0] ?? null });
  };

  const picks = [config.altA ?? 12, config.a, EXTRA_PRIME].filter((p, i, arr) => arr.indexOf(p) === i).sort((x, y) => x - y);
  const label = tr(locale, `Timeline of ${years} years: ${nameA} every ${pa} years, ${nameB} every ${pb} years`, `${years} 年时间轴：${nameA}每 ${pa} 年，${nameB}每 ${pb} 年`);

  const msg = (() => {
    if (phase === "hook") return tr(locale, `${nameA} every ${pa} years, ${nameB} every ${pb}. When do they meet?`, `${nameA}每 ${pa} 年出来，${nameB}每 ${pb} 年爆发。什么时候撞上？`);
    if (phase === "reveal")
      return progress >= 0.9
        ? tr(locale, "Prime cycles dodge the predator: they only meet at a multiple of both numbers.", "质数周期最能躲开天敌：只有到了两个数的公倍数才会撞上。")
        : tr(locale, `Every ${rows[revealRow].a} and every ${rows[revealRow].b}: they meet every ${rows[revealRow].every} years.`, `每 ${rows[revealRow].a} 年和每 ${rows[revealRow].b} 年：每 ${rows[revealRow].every} 年撞一次。`);
    return first
      ? tr(locale, `First together: year ${first}. ${hits.length} time${hits.length === 1 ? "" : "s"} in ${years} years.`, `第一次同时出现：第 ${first} 年。${years} 年里共 ${hits.length} 次。`)
      : tr(locale, `They never meet in ${years} years!`, `${years} 年里一次也没撞上！`);
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label={label} className="h-full w-full">
          {Array.from({ length: bands }, (_, band) => {
            const y = TOP + band * BAND_H;
            return (
              <g key={band}>
                <text x={LEFT - 6} y={y + 7} dy="0.35em" textAnchor="end" className="text-[9px]">
                  🦗
                </text>
                <text x={LEFT - 6} y={y + 18} dy="0.35em" textAnchor="end" className="text-[9px]">
                  🦅
                </text>
                {Array.from({ length: COLS }, (_, col) => {
                  const year = band * COLS + col + 1;
                  if (year > years) return null;
                  const x = LEFT + col * STEP + STEP / 2;
                  const litA = year % pa === 0;
                  const litB = year % pb === 0;
                  const both = litA && litB;
                  return (
                    <g key={year}>
                      {both && <rect x={x - 6} y={y + 1} width={12} height={23} rx={6} className="fill-fun-red/25" />}
                      <circle cx={x} cy={y + 7} r={4.2} className={both ? "fill-fun-red" : litA ? "fill-fun-green" : "fill-gray-200"} />
                      <circle cx={x} cy={y + 18} r={4.2} className={both ? "fill-fun-red" : litB ? "fill-fun-orange" : "fill-gray-200"} />
                      {(year % 5 === 0 || both) && (
                        <text x={x} y={y + 29} textAnchor="middle" className={`text-[6.5px] tabular-nums ${both ? "fill-fun-red font-bold" : "fill-gray-400"}`}>
                          {year}
                        </text>
                      )}
                      {year === first && phase !== "hook" && (
                        <text x={x} y={y + 1} textAnchor="middle" className="fill-fun-red text-[7px] font-bold">
                          ★
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      {phase === "reveal" && <LcmTable locale={locale} rows={rows} years={years} progress={progress} nameA={nameA} nameB={nameB} />}
      <SceneMessage>{msg}</SceneMessage>
      {explore && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
          <Stepper label={`🦗 ${nameA}`} value={a} onDec={() => change(a - 1, b)} onInc={() => change(a + 1, b)} locale={locale} />
          <Stepper label={`🦅 ${nameB}`} value={b} onDec={() => change(a, b - 1)} onInc={() => change(a, b + 1)} locale={locale} />
          {picks.map((p) => (
            <SceneButton key={p} variant={a === p ? "primary" : "ghost"} ariaPressed={a === p} ariaLabel={tr(locale, `${nameA} every ${p} years`, `${nameA}每 ${p} 年`)} onClick={() => change(p, b)}>
              🦗 {p}
            </SceneButton>
          ))}
        </div>
      )}
    </SceneFrame>
  );
}

function Stepper({ label, value, onDec, onInc, locale }: { label: string; value: number; onDec: () => void; onInc: () => void; locale: SceneLocale }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-white px-1 shadow-sm" role="group" aria-label={label}>
      <span className="px-1 text-[10px] text-gray-500 sm:text-xs">{label}</span>
      <SceneButton variant="ghost" onClick={onDec} disabled={value <= MIN_P} ariaLabel={tr(locale, "shorter cycle", "周期减 1")}>
        −
      </SceneButton>
      <span className="w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <SceneButton variant="ghost" onClick={onInc} disabled={value >= MAX_P} ariaLabel={tr(locale, "longer cycle", "周期加 1")}>
        +
      </SceneButton>
    </div>
  );
}

/** Reveal: lcm for the non-prime cycle, the config's cycle and 17, rows appearing in turn. */
function LcmTable({ locale, rows, years, progress, nameA, nameB }: { locale: SceneLocale; rows: Row[]; years: number; progress: number; nameA: string; nameB: string }) {
  return (
    <table className="mx-auto text-center text-[10px] tabular-nums sm:text-xs" aria-label={tr(locale, "When the cycles meet", "两个周期何时相遇")}>
      <thead className="text-gray-500">
        <tr>
          <th className="px-1.5 font-normal">{nameA}</th>
          <th className="px-1.5 font-normal">{nameB}</th>
          <th className="px-1.5 font-normal">{tr(locale, "meet every", "每隔几年撞上")}</th>
          <th className="px-1.5 font-normal">{tr(locale, `times in ${years} years`, `${years} 年里撞几次`)}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, k) => {
          const shown = segment(progress, k * (0.9 / rows.length), (k + 0.6) * (0.9 / rows.length));
          return (
            <tr key={r.a} style={{ opacity: shown }} className={isPrime(r.a) ? "font-bold text-green-700" : "text-fun-red"}>
              <td className="px-1.5">
                {r.a}
                {isPrime(r.a) ? tr(locale, " (prime)", "（质数）") : ""}
              </td>
              <td className="px-1.5">{r.b}</td>
              <td className="px-1.5">{tr(locale, `${r.every} years`, `${r.every} 年`)}</td>
              <td className="px-1.5">{r.times}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
