"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { convergence, mulberry32, piEstimate, throwDarts, type Dart, type PiDartsConfig, type Rng, type SceneProps } from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const S = 200;
const REVEAL_MS = 3600;
/** Proposing the estimate needs at least this many darts (C7 accepts 3.0–3.3 after 1000). */
const PROPOSE_AT = 1000;
const BATCHES = [10, 100, 1000];
/** The proposed estimate follows the readout, at most this often (trailing edge kept). */
const PROPOSE_THROTTLE_MS = 500;
/** One rounding everywhere: the readout shows what gets proposed. */
const DECIMALS = 2;

function dotsPath(darts: readonly Dart[], inside: boolean): string {
  let d = "";
  for (const p of darts) if (p.inside === inside) d += `M${(p.x * S).toFixed(1)} ${(p.y * S).toFixed(1)}h0`;
  return d;
}

/** C7: rain dots on a square with a circle inside; 4 × (share inside) creeps towards π. */
export default function PiDartsScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<PiDartsConfig>) {
  const { maxDrops } = config;
  const events = useSceneEvents(onEvent);
  const rngRef = useRef<Rng | null>(null);
  const [darts, setDarts] = useState<Dart[]>([]);
  const completed = useRef(false);
  const lastProposal = useRef<{ at: number; value: string | null }>({ at: 0, value: null });
  const proposeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rng = () => (rngRef.current ??= mulberry32(config.seed ?? (Date.now() >>> 0)));

  useEffect(
    () => () => {
      if (proposeTimer.current) clearTimeout(proposeTimer.current);
    },
    [],
  );

  /** Propose the current estimate (2 dp) whenever it changes, throttled. */
  const propose = (value: string) => {
    const send = () => {
      proposeTimer.current = null;
      if (lastProposal.current.value === value) return;
      lastProposal.current = { at: Date.now(), value };
      onProposeAnswer?.(value);
    };
    if (proposeTimer.current) clearTimeout(proposeTimer.current);
    const wait = PROPOSE_THROTTLE_MS - (Date.now() - lastProposal.current.at);
    if (wait <= 0) send();
    else proposeTimer.current = setTimeout(send, wait);
  };

  const drop = (count: number) => {
    if (phase !== "explore") return;
    events.interact();
    const room = maxDrops - darts.length;
    if (room <= 0) return;
    const next = [...darts, ...throwDarts(rng(), Math.min(count, room))];
    setDarts(next);
    const inside = next.filter((d) => d.inside).length;
    const est = piEstimate(inside, next.length);
    events.state({ darts: next.length, inside, estimate: Number(est.toFixed(4)) });
    if (next.length >= PROPOSE_AT) {
      propose(est.toFixed(DECIMALS));
      if (!completed.current) {
        completed.current = true;
        events.emit("completed", { moves: next.length, estimate: Number(est.toFixed(4)) });
      }
    }
  };

  const revealDarts = useMemo(() => {
    if (phase !== "reveal" || darts.length >= maxDrops) return darts;
    return [...darts, ...throwDarts(mulberry32((config.seed ?? 314) + darts.length), maxDrops - darts.length)];
  }, [phase, darts, maxDrops, config.seed]);
  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  // The reveal grows in 40 steps so the (big) paths aren't rebuilt every frame.
  const revealCount = Math.max(darts.length, Math.round((Math.round(segment(progress, 0, 0.7) * 40) / 40) * revealDarts.length));
  const shown = useMemo(() => (phase === "reveal" ? revealDarts.slice(0, revealCount) : phase === "hook" ? HOOK_DARTS : darts), [phase, revealDarts, revealCount, darts]);
  const inside = useMemo(() => shown.filter((d) => d.inside).length, [shown]);
  const est = piEstimate(inside, shown.length);
  const paths = useMemo(() => [dotsPath(shown, true), dotsPath(shown, false)], [shown]);
  const curve = useMemo(() => convergence(shown, Math.max(10, Math.round(shown.length / 400))), [shown]);

  const fmt = (v: number) => formatNumber(v, locale);
  const label = tr(locale, "Random dots in a square with a circle inside: estimate π", "正方形里画一个圆，随机撒点来估算 π");
  const message = (() => {
    if (phase === "hook") return tr(locale, "Rain on a square. Can the raindrops find π?", "雨点落在正方形上，雨点能算出 π 吗？");
    if (phase === "reveal")
      return progress > 0.7
        ? tr(locale, `Circle ÷ square = πr² ÷ 4r² = π/4. So 4 × ${fmt(inside)}/${fmt(shown.length)} ≈ ${est.toFixed(DECIMALS)}. More dots → closer to π = 3.14159…`, `圆 ÷ 正方形 = πr² ÷ 4r² = π/4。所以 4 × ${fmt(inside)}/${fmt(shown.length)} ≈ ${est.toFixed(DECIMALS)}。点越多越接近 π = 3.14159……`)
        : tr(locale, "Keep it raining…", "继续下雨……");
    if (darts.length === 0) return tr(locale, "Drop some dots. Count how many land inside the circle.", "撒一些点，数数有多少落在圆里。");
    return tr(locale, `${fmt(inside)} of ${fmt(darts.length)} inside: 4 × ${fmt(inside)} ÷ ${fmt(darts.length)} ≈ ${est.toFixed(DECIMALS)}`, `${fmt(darts.length)} 个里有 ${fmt(inside)} 个在圆内：4 × ${fmt(inside)} ÷ ${fmt(darts.length)} ≈ ${est.toFixed(DECIMALS)}`);
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        <svg viewBox={`-4 -4 ${S + 8} ${S + 8}`} role="img" aria-label={tr(locale, `${shown.length} dots, ${inside} inside the circle`, `${shown.length} 个点，${inside} 个在圆内`)} className="h-full min-w-0 flex-1">
          <rect x={0} y={0} width={S} height={S} className="fill-white stroke-gray-400" strokeWidth={1.5} />
          <circle cx={S / 2} cy={S / 2} r={S / 2} className="fill-primary-50 stroke-primary-400" strokeWidth={1.5} />
          <path d={paths[0]} className="stroke-primary-500" strokeWidth={shown.length > 2000 ? 1.8 : 3} strokeLinecap="round" />
          <path d={paths[1]} className="stroke-fun-orange" strokeWidth={shown.length > 2000 ? 1.8 : 3} strokeLinecap="round" />
        </svg>
        <div className="flex w-[40%] shrink-0 flex-col">
          <p className="text-center font-bold tabular-nums text-gray-800" aria-live="polite">
            <span className="text-xs text-gray-500">π ≈ </span>
            <span className="text-xl sm:text-2xl">{shown.length && phase !== "hook" ? est.toFixed(DECIMALS) : "?"}</span>
          </p>
          <div className="min-h-0 flex-1">
            <ConvergenceChart curve={curve} maxN={maxDrops} reveal={phase === "reveal"} locale={locale} />
          </div>
        </div>
      </div>
      <SceneMessage>{message}</SceneMessage>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
        {phase === "explore" && (
          <>
            {BATCHES.map((b) => (
              <SceneButton key={b} onClick={() => drop(b)} disabled={darts.length >= maxDrops} variant={b === 1000 ? "accent" : "primary"}>
                +{fmt(b)}
              </SceneButton>
            ))}
            <SceneButton onClick={() => setDarts([])} variant="ghost" disabled={darts.length === 0}>
              {tr(locale, "Clear", "清空")}
            </SceneButton>
          </>
        )}
        <Counter label={tr(locale, "dots", "点数")} value={`${fmt(shown.length)}/${fmt(maxDrops)}`} />
      </div>
    </SceneFrame>
  );
}

const HOOK_DARTS = throwDarts(mulberry32(31), 60);

/** Running estimate against the number of dots (log scale), with π dashed. */
function ConvergenceChart({ curve, maxN, reveal, locale }: { curve: Array<[number, number]>; maxN: number; reveal: boolean; locale: SceneLocale }) {
  const W = 140;
  const H = 120;
  const lo = 2.6;
  const hi = 3.8;
  const x = (n: number) => 4 + (Math.log10(n) / Math.log10(maxN)) * (W - 8);
  const y = (v: number) => 6 + ((hi - Math.max(lo, Math.min(hi, v))) / (hi - lo)) * (H - 20);
  const d = curve.map(([n, v], i) => `${i ? "L" : "M"}${x(n).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr(locale, "Estimate as the dots pile up", "随着点数增加的估计值")} className="h-full w-full">
      <line x1={4} x2={W - 4} y1={y(Math.PI)} y2={y(Math.PI)} className="stroke-fun-pink" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={W - 4} y={y(Math.PI) - 3} textAnchor="end" className="fill-fun-pink text-[9px] font-bold">π</text>
      <path d={d} fill="none" className={reveal ? "stroke-fun-purple" : "stroke-primary-400"} strokeWidth={reveal ? 2.2 : 1.5} />
      {[1, 10, 100, 1000, 10000].filter((n) => n <= maxN).map((n) => (
        <text key={n} x={x(n)} y={H - 2} textAnchor="middle" className="fill-gray-400 text-[8px]">
          {n >= 1000 ? `${n / 1000}k` : n}
        </text>
      ))}
    </svg>
  );
}
