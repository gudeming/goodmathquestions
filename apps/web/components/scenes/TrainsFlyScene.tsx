"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flyLegs, flyTotal, meetingTime, trainsAt, type SceneProps, type TrainsFlyConfig } from "@gmq/animation-engine";
import { Counter, SceneButton, SceneFrame, SceneMessage, formatNumber, tr, type SceneLocale } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";
import { segment, useRevealProgress } from "./useRevealProgress";

const W = 360;
const H = 140;
const X0 = 30;
const X1 = 330;
const RAIL_Y = 108;
const FLY_Y = 40;
const SLIDER_STEPS = 400;
const PLAY_MS = 6000;
const REVEAL_MS = 6000;
const SERIES_TERMS = 4;

const km = (v: number, locale: SceneLocale) => formatNumber(Math.round(v * 100) / 100, locale);
const kmUnit = (locale: SceneLocale) => tr(locale, "km", "千米");
const clock = (h: number, locale: SceneLocale) => {
  const mins = Math.round(h * 60 * 10) / 10;
  return mins < 60 ? tr(locale, `${formatNumber(mins, locale)} min`, `${formatNumber(mins, locale)} 分钟`) : tr(locale, `${formatNumber(Math.round(h * 100) / 100, locale)} h`, `${formatNumber(Math.round(h * 100) / 100, locale)} 小时`);
};

/** F11: scrub time; the trains close in, the fly zigzags, and its distance only depends on the time. */
export default function TrainsFlyScene({ config, phase, locale, reducedMotion, onEvent, onProposeAnswer }: SceneProps<TrainsFlyConfig>) {
  const events = useSceneEvents(onEvent);
  const T = meetingTime(config.distanceKm, config.trainSpeed);
  const total = flyTotal(config);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const doneRef = useRef(false);
  const explore = phase === "explore";
  const legs = useMemo(() => flyLegs(40, config), [config]);

  const progress = useRevealProgress(phase === "reveal", REVEAL_MS, reducedMotion, () => events.emit("reveal_done"));
  const t = phase === "reveal" ? T * segment(progress, 0, 0.6) : phase === "hook" ? 0 : (step / SLIDER_STEPS) * T;
  const at = trainsAt(t, config);
  const x = (pos: number) => X0 + (pos / config.distanceKm) * (X1 - X0);

  const setTime = (s: number) => {
    const clamped = Math.max(0, Math.min(SLIDER_STEPS, Math.round(s)));
    setStep(clamped);
    const now = trainsAt((clamped / SLIDER_STEPS) * T, config);
    events.state({ hours: (clamped / SLIDER_STEPS) * T, gapKm: now.b - now.a, flyKm: now.flown });
    if (clamped === SLIDER_STEPS && !doneRef.current) {
      doneRef.current = true;
      events.emit("completed", { moves: 1, flyKm: total });
      onProposeAnswer?.(String(Math.round(total * 1e6) / 1e6));
    }
  };
  const scrub = (s: number) => {
    if (!explore) return;
    events.interact();
    setPlaying(false);
    setTime(s);
  };

  // Play: run the clock forward with requestAnimationFrame until the trains meet.
  const setTimeRef = useRef(setTime);
  useEffect(() => {
    setTimeRef.current = setTime;
  });
  useEffect(() => {
    if (!playing || !explore) return;
    let raf = 0;
    const start = performance.now();
    const from = step;
    const tick = (now: number) => {
      const s = from + ((now - start) / PLAY_MS) * SLIDER_STEPS;
      setTimeRef.current(Math.min(SLIDER_STEPS, s));
      if (s < SLIDER_STEPS) raf = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `step` is read once when playing starts.
  }, [playing, explore]); // eslint-disable-line react-hooks/exhaustive-deps

  // The fly's zigzag so far: one arc per leg between the train noses (the current leg up to the fly).
  const trail = useMemo(() => {
    const arcs: string[] = [];
    for (const leg of legs) {
      if (leg.start >= t) break;
      const s = trainsAt(leg.start, config).fly;
      const e = leg.end <= t ? trainsAt(leg.end, config).fly : at.fly;
      const lift = Math.min(22, Math.abs(x(e) - x(s)) / 3);
      arcs.push(`M ${x(s)} ${FLY_Y + 6} Q ${(x(s) + x(e)) / 2} ${FLY_Y + 6 + (leg.from === "A" ? -lift : lift)} ${x(e)} ${FLY_Y + 6}`);
    }
    return arcs.join(" ");
  }, [legs, t, config, at.fly]); // eslint-disable-line react-hooks/exhaustive-deps
  const legsDone = Number.isFinite(at.legsDone) ? at.legsDone : legs.length;

  const label = tr(locale, `Two trains ${km(config.distanceKm, locale)} km apart and a fly`, `相距 ${km(config.distanceKm, locale)} 千米的两列火车和一只苍蝇`);
  const msg = (() => {
    if (phase === "hook") return tr(locale, "The fly zooms from train to train until they meet. How far does it fly?", "苍蝇在两车之间来回飞，直到两车相遇。它一共飞了多远？");
    if (phase === "reveal") {
      if (progress < 0.6) return tr(locale, `Each train covers ${km(config.trainSpeed, locale)} km an hour, so the gap closes at ${km(2 * config.trainSpeed, locale)} km/h.`, `每列车每小时开 ${km(config.trainSpeed, locale)} 千米，距离每小时缩短 ${km(2 * config.trainSpeed, locale)} 千米。`);
      return tr(locale, `They meet after ${clock(T, locale)}. The fly flew the whole time: ${clock(T, locale)} × ${km(config.flySpeed, locale)} km/h = ${km(total, locale)} km.`, `${clock(T, locale)}后相遇。苍蝇一直在飞：${clock(T, locale)} × ${km(config.flySpeed, locale)} 千米/时 = ${km(total, locale)} 千米。`);
    }
    if (step === SLIDER_STEPS) return tr(locale, `The trains meet. The fly flew ${km(total, locale)} km, back and forth more times than you can count.`, `两车相遇了。苍蝇一共飞了 ${km(total, locale)} 千米，来回的次数多得数不清。`);
    return tr(locale, "Drag the clock (or press Play) and watch the fly's distance.", "拖动时间（或点「播放」），看苍蝇飞了多远。");
  })();

  return (
    <SceneFrame label={label} inert={phase === "hook"}>
      <div className="flex justify-center">
        <Counter label={tr(locale, "the fly has flown", "苍蝇已经飞了")} value={phase === "hook" ? `? ${kmUnit(locale)}` : `${km(at.flown, locale)} ${kmUnit(locale)}`} tone={t >= T - 1e-9 && phase !== "hook" ? "green" : "pink"} />
      </div>
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label={label} className="h-full w-full">
          <line x1={X0 - 20} x2={X1 + 20} y1={RAIL_Y + 8} y2={RAIL_Y + 8} className="stroke-gray-400" strokeWidth={3} />
          {Array.from({ length: 11 }, (_, i) => (
            <line key={i} x1={X0 + (i * (X1 - X0)) / 10} x2={X0 + (i * (X1 - X0)) / 10} y1={RAIL_Y + 4} y2={RAIL_Y + 12} className="stroke-gray-300" strokeWidth={2} />
          ))}
          <text x={X0} y={H - 2} textAnchor="middle" className="fill-gray-400 text-[8px]">0</text>
          <text x={X1} y={H - 2} textAnchor="middle" className="fill-gray-400 text-[8px]">{km(config.distanceKm, locale)} {kmUnit(locale)}</text>
          <text x={4} y={12} className="fill-gray-600 text-[11px] font-bold">
            ⏱ {clock(t, locale)}
          </text>
          {at.b - at.a > 1e-9 && (
            <g className="fill-gray-500 stroke-gray-400">
              <line x1={x(at.a)} x2={x(at.b)} y1={RAIL_Y + 22} y2={RAIL_Y + 22} strokeWidth={1} />
              <text x={(x(at.a) + x(at.b)) / 2} y={RAIL_Y + 19} textAnchor="middle" stroke="none" className="text-[9px]">
                {tr(locale, `gap ${km(at.b - at.a, locale)} km`, `相距 ${km(at.b - at.a, locale)} 千米`)}
              </text>
            </g>
          )}
          <path d={trail} fill="none" className="stroke-fun-purple/60" strokeWidth={1.5} strokeDasharray="3 2" />
          {phase !== "hook" &&
            legs.slice(0, Math.min(legsDone, 6)).map((leg, i) => {
              const s = trainsAt(leg.start, config).fly;
              const e = trainsAt(leg.end, config).fly;
              // Only legs wide enough to hold their label get one (the tiny ones bunch up at the middle).
              if (Math.abs(x(e) - x(s)) < 26) return null;
              return (
                <text key={i} x={x((s + e) / 2)} y={FLY_Y - 12 - (i % 2) * 9} textAnchor="middle" className="fill-fun-purple text-[8px] font-bold">
                  {km(leg.km, locale)}
                </text>
              );
            })}
          <line x1={x(at.fly)} x2={x(at.fly)} y1={FLY_Y + 6} y2={RAIL_Y - 10} className="stroke-fun-purple/30" strokeDasharray="2 3" />
          <text x={x(at.fly)} y={FLY_Y} textAnchor="middle" dy="0.35em" className="text-[16px]">🪰</text>
          <text x={x(at.a) - 14} y={RAIL_Y} textAnchor="middle" className="text-[26px]">🚂</text>
          <g transform={`translate(${x(at.b) + 14},${RAIL_Y}) scale(-1,1)`}>
            <text textAnchor="middle" className="text-[26px]">🚂</text>
          </g>
          {t >= T - 1e-9 && phase !== "hook" && (
            <text x={x(at.a)} y={RAIL_Y - 30} textAnchor="middle" className="text-[16px]">💥</text>
          )}
        </svg>
      </div>
      {phase === "reveal" && <Series legs={legs} total={total} show={segment(progress, 0.6, 0.95)} locale={locale} />}
      <SceneMessage>{msg}</SceneMessage>
      {explore && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <SceneButton onClick={() => scrub(step - SLIDER_STEPS / 20)} variant="ghost" disabled={step === 0} className="hidden min-[340px]:inline-block" ariaLabel={tr(locale, "Back in time", "时间后退")}>−</SceneButton>
          <input
            type="range"
            min={0}
            max={SLIDER_STEPS}
            value={step}
            onChange={(e) => scrub(Number(e.target.value))}
            aria-label={tr(locale, "Time", "时间")}
            aria-valuetext={clock(t, locale)}
            className="h-11 w-32 accent-fun-purple sm:w-56"
          />
          <SceneButton onClick={() => scrub(step + SLIDER_STEPS / 20)} variant="ghost" disabled={step === SLIDER_STEPS} className="hidden min-[340px]:inline-block" ariaLabel={tr(locale, "Forward in time", "时间前进")}>+</SceneButton>
          <SceneButton
            onClick={() => {
              events.interact();
              if (step >= SLIDER_STEPS) setTime(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? tr(locale, "Pause", "暂停") : step >= SLIDER_STEPS ? tr(locale, "Replay", "重播") : tr(locale, "Play", "播放")}
          </SceneButton>
        </div>
      )}
    </SceneFrame>
  );
}

/** Reveal: the long way, leg by leg, converging on the short way's answer. */
function Series({ legs, total, show, locale }: { legs: ReturnType<typeof flyLegs>; total: number; show: number; locale: SceneLocale }) {
  const terms = legs.slice(0, SERIES_TERMS);
  const visible = Math.ceil(show * (SERIES_TERMS + 1));
  return (
    <p className="text-center font-mono text-[11px] text-gray-700 sm:text-sm" aria-label={tr(locale, "The fly's legs add up", "苍蝇每一段加起来")}>
      {terms.map((l, i) => (
        <span key={i} className={`transition-opacity duration-300 ${i < visible ? "opacity-100" : "opacity-0"}`}>
          {i > 0 ? " + " : ""}
          {km(l.km, locale)}
        </span>
      ))}
      <span className={`transition-opacity duration-300 ${visible > SERIES_TERMS ? "opacity-100" : "opacity-0"}`}>
        {" + … = "}
        <b className="text-fun-pink">{km(total, locale)} {kmUnit(locale)}</b>
      </span>
    </p>
  );
}
