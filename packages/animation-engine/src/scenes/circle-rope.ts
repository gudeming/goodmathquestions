/** Pure helpers for circle_rope (B3): add rope to a tight loop; the gap is extra / 2π for any planet. */
import type { Bilingual } from "../core/contract";

export interface RopePlanet {
  id: string;
  label: Bilingual;
  radiusM: number;
  emoji?: string;
}

export const DEFAULT_PLANETS: RopePlanet[] = [
  { id: "basketball", label: { en: "a basketball", zh: "篮球" }, radiusM: 0.12, emoji: "🏀" },
  { id: "earth", label: { en: "the Earth", zh: "地球" }, radiusM: 6_371_000, emoji: "🌍" },
  { id: "sun", label: { en: "the Sun", zh: "太阳" }, radiusM: 696_340_000, emoji: "☀️" },
];

/** Gap between the ground and the lifted rope: (C + extra) / 2π − r = extra / 2π. Independent of r. */
export function ropeGap(extraMetres: number): number {
  return extraMetres / (2 * Math.PI);
}

/** Same thing computed the long way for a given radius (shows the radius cancels). */
export function ropeGapFor(radiusM: number, extraMetres: number): number {
  const c = 2 * Math.PI * radiusM;
  return (c + extraMetres) / (2 * Math.PI) - radiusM;
}

/** Extra rope needed for a given gap: 2π × gap. */
export function extraForGap(gapMetres: number): number {
  return 2 * Math.PI * gapMetres;
}

export function circumference(radiusM: number): number {
  return 2 * Math.PI * radiusM;
}

export interface GapThing {
  id: string;
  /** Height that has to fit under the rope. */
  metres: number;
  emoji: string;
  label: Bilingual;
}

/** What could get under the rope. Heights are rough but honest. */
export const GAP_THINGS: GapThing[] = [
  { id: "hair", metres: 0.0001, emoji: "➰", label: { en: "a hair", zh: "一根头发" } },
  { id: "finger", metres: 0.02, emoji: "☝️", label: { en: "a finger", zh: "一根手指" } },
  { id: "cat", metres: 0.15, emoji: "🐈", label: { en: "a cat (squeezing)", zh: "一只猫（钻过去）" } },
  { id: "car", metres: 1.5, emoji: "🚗", label: { en: "a car", zh: "一辆车" } },
  { id: "person", metres: 1.8, emoji: "🧍", label: { en: "a grown-up", zh: "一个大人" } },
];

/** The biggest thing that fits under a gap (null if not even a hair). */
export function biggestThatFits(gapMetres: number, things: readonly GapThing[] = GAP_THINGS): GapThing | null {
  let best: GapThing | null = null;
  for (const t of things) if (t.metres <= gapMetres + 1e-12 && (!best || t.metres > best.metres)) best = t;
  return best;
}
