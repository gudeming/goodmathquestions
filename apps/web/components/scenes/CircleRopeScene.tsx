"use client";

import { useRef, useState } from "react";
import { DEFAULT_PLANETS, GAP_THINGS, biggestThatFits, circumference, ropeGap, type CircleRopeConfig, type GapThing, type RopePlanet, type SceneProps } from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, bi, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const REVEAL_MS = 3200;
const STEP = 0.1;

function formatMetres(m: number, locale: SceneLocale): string {
  if (m >= 1) return `${formatNumber(Number(m.toPrecision(3)), locale)} m`;
  if (m >= 0.01) return `${Number((m * 100).toPrecision(3))} cm`;
  return `${Number((m * 1000).toPrecision(2))} mm`;
}

/** A planet with a rope hugging it; the rope ring is drawn a fixed few pixels out so the gap is visible at any size. */
function PlanetIcon({ planet, cx, cy, r, lifted, locale }: { planet: RopePlanet; cx: number; cy: number; r: number; lifted: boolean; locale: SceneLocale }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className={planet.id === "sun" ? "fill-fun-yellow" : planet.id === "earth" ? "fill-primary-300" : "fill-fun-orange"} />
      <circle cx={cx} cy={cy} r={r + (lifted ? 5 : 1.5)} fill="none" className="stroke-amber-700" strokeWidth={2} strokeDasharray={lifted ? "5 2" : undefined} style={{ transition: "r 250ms" }} />
      <text x={cx} y={cy} dy="0.35em" textAnchor="middle" className="text-[20px]">{planet.emoji ?? "●"}</text>
      <text x={cx} y={cy + r + 18} textAnchor="middle" className="fill-gray-600 text-[10px]">{bi(locale, planet.label)}</text>
    </g>
  );
}

/** B3: lengthen a tight rope around any ball by `extra` metres; the gap is extra / 2π every time. */
export default function CircleRopeScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<CircleRopeConfig>) {
  const planets = config.planets ?? DEFAULT_PLANETS;
  const events = useSceneEvents(onEvent);
  const [planetId, setPlanetId] = useState(planets.find((p) => p.id === "earth")?.id ?? planets[0].id);
  const [extra, setExtra] = useState(0);
  const [tried, setTried] = useState<string[]>([]);
  const proposed = useRef(false);
  const completed = useRef(false);
  const planet = planets.find((p) => p.id === planetId) ?? planets[0];

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  // The reveal always uses the question's canonical extra rope, not wherever the slider was left.
  const canonicalExtra = config.revealExtraMeters ?? 1;
  const shownExtra = phase === "explore" ? extra : canonicalExtra;
  const gap = ropeGap(shownExtra);
  const hook = phase === "hook";
  const triedOther = phase === "reveal" && extra > 0 && Math.abs(extra - canonicalExtra) > 1e-9;

  const update = (nextExtra: number, nextPlanet: string) => {
    if (phase !== "explore") return;
    events.interact();
    setExtra(nextExtra);
    setPlanetId(nextPlanet);
    const nextTried = nextExtra > 0 && !tried.includes(nextPlanet) ? [...tried, nextPlanet] : tried;
    setTried(nextTried);
    // Goal: the same extra rope tried on every ball (that's when the invariance shows).
    if (nextTried.length === planets.length && !completed.current) {
      completed.current = true;
      events.emit("completed", { moves: nextTried.length });
    }
    const fits = biggestThatFits(ropeGap(nextExtra));
    events.state({ planet: nextPlanet, extra: nextExtra, gap: Number(ropeGap(nextExtra).toFixed(4)), fits: fits?.id ?? null });
    if (Math.abs(nextExtra - 1) < 1e-9 && !proposed.current) {
      proposed.current = true;
      onProposeAnswer?.(String(Math.round(ropeGap(1) * 100)));
    }
  };

  const fits = biggestThatFits(gap);
  const tooBig = GAP_THINGS.find((t) => t.metres > gap + 1e-12) ?? null;
  const label = tr(locale, "A rope hugs a ball. Make it longer: how big is the gap?", "绳子紧贴着球。把绳子加长，缝有多大？");

  const message = (() => {
    if (hook) return tr(locale, `Add ${formatNumber(canonicalExtra, locale)} m to a rope around the Earth. What fits under it?`, `绕地球一圈的绳子加长 ${formatNumber(canonicalExtra, locale)} 米，下面能钻过什么？`);
    if (phase === "reveal")
      return progress > 0.6
        ? tr(locale, `Rope = 2π × radius, so 2π × (radius + gap) = rope + ${formatNumber(shownExtra, locale)}: gap = ${formatNumber(shownExtra, locale)} ÷ 2π ≈ ${formatMetres(gap, locale)}. The radius cancels out!`, `绳长 = 2π × 半径，所以 2π ×（半径 + 缝）= 绳长 + ${formatNumber(shownExtra, locale)}：缝 = ${formatNumber(shownExtra, locale)} ÷ 2π ≈ ${formatMetres(gap, locale)}。半径被消掉了！`)
        : tr(locale, "Same extra rope on all three…", "三个球加同样长的绳子……");
    if (extra === 0) return tr(locale, "Slide to add rope. Try different balls too.", "拖滑块加长绳子，也换几个球试试。");
    const what = fits ? bi(locale, fits.label) : tr(locale, "nothing", "什么都");
    return tr(locale, `Gap ${formatMetres(gap, locale)}: ${what} fits under.${tried.length > 1 ? " Notice anything?" : ""}`, `缝 ${formatMetres(gap, locale)}：${what}能钻过去。${tried.length > 1 ? "发现了什么？" : ""}`);
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex min-h-0 flex-1 gap-2">
        {phase === "reveal" ? (
          <svg viewBox="0 0 360 200" role="img" aria-label={tr(locale, `Every ball gets the same gap: ${formatMetres(gap, locale)}`, `每个球的缝都一样：${formatMetres(gap, locale)}`)} className="h-full w-full">
            {planets.slice(0, 4).map((p, i, arr) => {
              const cx = ((i + 0.5) * 360) / arr.length;
              const appear = segment(progress, i * 0.15, i * 0.15 + 0.2);
              return (
                <g key={p.id} opacity={appear}>
                  <PlanetIcon planet={p} cx={cx} cy={80} r={14 + i * 12} lifted locale={locale} />
                  <text x={cx} y={150} textAnchor="middle" className="fill-gray-500 text-[9px]">r = {formatMetres(p.radiusM, locale)}</text>
                  <text x={cx} y={170} textAnchor="middle" className="fill-fun-pink text-[13px] font-bold">{tr(locale, "gap", "缝")} {formatMetres(gap, locale)}</text>
                </g>
              );
            })}
            <text x={180} y={194} textAnchor="middle" className="fill-gray-700 text-[12px] font-bold" opacity={segment(progress, 0.6, 0.8)}>
              {tr(locale, "gap", "缝")} = {formatNumber(shownExtra, locale)} ÷ 2π
            </text>
            {triedOther && (
              <text x={180} y={12} textAnchor="middle" className="fill-gray-500 text-[10px]" opacity={segment(progress, 0.6, 0.8)}>
                {tr(locale, `You tried: ${formatNumber(extra, locale)} m → gap ${formatMetres(ropeGap(extra), locale)}`, `你刚才试的：${formatNumber(extra, locale)} 米 → 缝 ${formatMetres(ropeGap(extra), locale)}`)}
              </text>
            )}
          </svg>
        ) : (
          <>
            <svg viewBox="0 0 120 200" role="img" aria-label={bi(locale, planet.label)} className="h-full w-[34%] shrink-0">
              <PlanetIcon planet={planet} cx={60} cy={82} r={38} lifted={shownExtra > 0} locale={locale} />
              <text x={60} y={160} textAnchor="middle" className="fill-gray-500 text-[9px]">{tr(locale, "rope", "绳长")} {formatMetres(circumference(planet.radiusM), locale)}</text>
              <text x={60} y={174} textAnchor="middle" className="fill-fun-pink text-[10px] font-bold">+ {formatNumber(shownExtra, locale)} m</text>
            </svg>
            <CloseUp gap={gap} fits={hook ? null : fits} tooBig={hook ? null : tooBig} hidden={hook} locale={locale} />
          </>
        )}
      </div>
      <SceneMessage>{message}</SceneMessage>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
        {phase === "explore" && (
          <>
            {planets.map((p) => (
              <SceneButton key={p.id} onClick={() => update(extra, p.id)} variant={p.id === planetId ? "primary" : "ghost"} ariaPressed={p.id === planetId} ariaLabel={bi(locale, p.label)}>
                {p.emoji ?? bi(locale, p.label)}
              </SceneButton>
            ))}
            <label className="flex min-h-[44px] items-center gap-1 text-xs text-gray-600">
              {tr(locale, "extra rope", "加长")}
              <input
                type="range"
                min={0}
                max={config.extraMetersMax}
                step={STEP}
                value={extra}
                onChange={(e) => update(Math.round(Number(e.target.value) / STEP) * STEP, planetId)}
                aria-label={tr(locale, "Extra rope in metres", "绳子加长多少米")}
                aria-valuetext={`${formatNumber(extra, locale)} m`}
                className="h-11 w-28 accent-fun-pink sm:w-40"
              />
            </label>
          </>
        )}
        <Counter label={tr(locale, "gap", "缝")} value={hook ? "?" : formatMetres(gap, locale)} tone="pink" />
      </div>
    </SceneFrame>
  );
}

/** Close-up of the ground: the rope at the gap height, with the biggest thing that fits and the next one that doesn't. */
function CloseUp({ gap, fits, tooBig, hidden, locale }: { gap: number; fits: GapThing | null; tooBig: GapThing | null; hidden: boolean; locale: SceneLocale }) {
  const groundY = 180;
  const plotH = 150;
  // Scale to the gap and the thing that fits; a much taller thing is only named, not drawn.
  const top = Math.max(gap * 1.6, (fits?.metres ?? 0) * 1.3, 0.001);
  const px = (m: number) => (m / top) * plotH;
  const ropeY = groundY - px(gap);
  const thing = (t: GapThing, x: number, ok: boolean) => {
    const h = px(t.metres);
    if (t.id === "hair" || h < 6) return <line key={t.id} x1={x} x2={x + 30} y1={groundY - Math.max(1, h)} y2={groundY - Math.max(1, h)} className={ok ? "stroke-green-600" : "stroke-fun-red"} strokeWidth={Math.max(1, h)} />;
    return (
      <text key={t.id} x={x} y={groundY} fontSize={h} className={ok ? "" : "opacity-60"}>
        {t.emoji}
      </text>
    );
  };
  return (
    <svg viewBox="0 0 240 200" role="img" aria-label={hidden ? tr(locale, "Close-up: how big is the gap?", "放大看：缝有多大？") : tr(locale, `Close-up: the gap is ${formatMetres(gap, locale)}`, `放大看：缝是 ${formatMetres(gap, locale)}`)} className="h-full min-w-0 flex-1">
      <rect x={0} y={groundY} width={240} height={20} className="fill-green-200" />
      {fits && thing(fits, 20, true)}
      {tooBig && tooBig.metres <= top && thing(tooBig, 110, false)}
      <line x1={0} x2={240} y1={ropeY} y2={ropeY} className="stroke-amber-700" strokeWidth={3} strokeDasharray="8 3" style={{ transition: "y1 250ms, y2 250ms" }} />
      <line x1={226} x2={226} y1={ropeY} y2={groundY} className="stroke-fun-pink" strokeWidth={1.5} />
      <text x={222} y={Math.max(12, (ropeY + groundY) / 2)} textAnchor="end" className="fill-fun-pink text-[11px] font-bold">{hidden ? "?" : formatMetres(gap, locale)}</text>
      <text x={4} y={12} className="fill-gray-400 text-[9px]">🔍 {tr(locale, "close-up", "放大")}</text>
      {fits && <text x={20} y={196} className="fill-green-700 text-[9px] font-bold">✓ {bi(locale, fits.label)}</text>}
      {tooBig && <text x={120} y={196} className="fill-red-600 text-[9px]">✗ {bi(locale, tooBig.label)}</text>}
    </svg>
  );
}
