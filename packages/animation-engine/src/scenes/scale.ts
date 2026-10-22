/** Pure helpers for scale_ladder (A4 million seconds, A5 billion heartbeats, A9 googol vs atoms). */
import type { Bilingual } from "../core/contract";

export type ScaleMode = "time" | "heartbeats" | "powers";

/** One climb of the ladder: how to get from the previous rung to this one. */
export interface LadderStep {
  /** Unit of the rung reached by this step. */
  unit: Bilingual;
  /** `mul`: value × factor; `div`: value ÷ factor; `into`: factor ÷ value (how many fit into a total). */
  op: "mul" | "div" | "into";
  factor: number;
  /** Why the factor is what it is ("60 seconds in a minute"). */
  why: Bilingual;
}

export interface Ladder {
  startUnit: Bilingual;
  steps: LadderStep[];
}

export const SECONDS_PER_DAY = 86_400;
export const DAYS_PER_YEAR = 365;
export const MINUTES_PER_YEAR = 60 * 24 * DAYS_PER_YEAR;

/** Defaults per mode: time starts at one million seconds; heartbeats at 70 a minute towards a billion; powers compare 10^80 with 10^100. */
export const SCALE_DEFAULTS: Record<ScaleMode, { start: number; target?: number }> = {
  time: { start: 1_000_000 },
  heartbeats: { start: 70, target: 1_000_000_000 },
  powers: { start: 80, target: 100 },
};

const U = {
  seconds: { en: "seconds", zh: "秒" },
  minutes: { en: "minutes", zh: "分钟" },
  hours: { en: "hours", zh: "小时" },
  days: { en: "days", zh: "天" },
  years: { en: "years", zh: "年" },
  perMinute: { en: "beats a minute", zh: "次 / 分钟" },
  perHour: { en: "beats an hour", zh: "次 / 小时" },
  perDay: { en: "beats a day", zh: "次 / 天" },
  perYear: { en: "beats a year", zh: "次 / 年" },
} satisfies Record<string, Bilingual>;

/** The rungs for a mode (powers has no ladder: it compares exponents). */
export function ladderFor(mode: Exclude<ScaleMode, "powers">, target = SCALE_DEFAULTS.heartbeats.target ?? 1e9): Ladder {
  if (mode === "time") {
    return {
      startUnit: U.seconds,
      steps: [
        { unit: U.minutes, op: "div", factor: 60, why: { en: "60 seconds in a minute", zh: "1 分钟 = 60 秒" } },
        { unit: U.hours, op: "div", factor: 60, why: { en: "60 minutes in an hour", zh: "1 小时 = 60 分钟" } },
        { unit: U.days, op: "div", factor: 24, why: { en: "24 hours in a day", zh: "1 天 = 24 小时" } },
        { unit: U.years, op: "div", factor: DAYS_PER_YEAR, why: { en: "365 days in a year", zh: "1 年 = 365 天" } },
      ],
    };
  }
  return {
    startUnit: U.perMinute,
    steps: [
      { unit: U.perHour, op: "mul", factor: 60, why: { en: "60 minutes in an hour", zh: "1 小时 = 60 分钟" } },
      { unit: U.perDay, op: "mul", factor: 24, why: { en: "24 hours in a day", zh: "1 天 = 24 小时" } },
      { unit: U.perYear, op: "mul", factor: DAYS_PER_YEAR, why: { en: "365 days in a year", zh: "1 年 = 365 天" } },
      { unit: U.years, op: "into", factor: target, why: { en: "how many years of beats fill the total", zh: "总数里装得下几年的心跳" } },
    ],
  };
}

export function applyLadderStep(value: number, step: Pick<LadderStep, "op" | "factor">): number {
  if (step.op === "mul") return value * step.factor;
  if (step.op === "div") return value / step.factor;
  return value === 0 ? Infinity : step.factor / value;
}

/** Value on every rung, starting with the start value. */
export function ladderValues(start: number, ladder: Ladder): number[] {
  const out = [start];
  for (const s of ladder.steps) out.push(applyLadderStep(out[out.length - 1], s));
  return out;
}

/** Index of the rung that answers the question: days for time (A4), years for heartbeats (A5). */
export function answerRung(mode: Exclude<ScaleMode, "powers">): number {
  return mode === "time" ? 3 : 4;
}

/** The answer each mode builds towards: 11.57 days, 27.2 years, or 20 (10^20 times). */
export function scaleAnswer(mode: ScaleMode, start?: number, target?: number): number {
  const s = start ?? SCALE_DEFAULTS[mode].start;
  if (mode === "powers") return Math.abs((target ?? SCALE_DEFAULTS.powers.target ?? 0) - s);
  const t = target ?? SCALE_DEFAULTS.heartbeats.target;
  return ladderValues(s, ladderFor(mode, t))[answerRung(mode)];
}

/** Express a quantity given in seconds in a ladder unit index (0 = seconds .. 4 = years). */
export function secondsIn(rung: number, seconds: number): number {
  const per = [1, 60, 3600, SECONDS_PER_DAY, SECONDS_PER_DAY * DAYS_PER_YEAR][rung];
  if (per === undefined) throw new RangeError(`rung must be 0..4, got ${rung}`);
  return seconds / per;
}

/** Round for display: 3 significant digits below 100, whole numbers above. */
export function roundForLadder(v: number): number {
  if (!Number.isFinite(v)) return v;
  const a = Math.abs(v);
  if (a >= 100) return Math.round(v);
  if (a >= 10) return Math.round(v * 10) / 10;
  if (a >= 1) return Math.round(v * 100) / 100;
  if (a === 0) return 0;
  const digits = Math.min(12, 2 - Math.floor(Math.log10(a)));
  return Number(v.toFixed(digits));
}
