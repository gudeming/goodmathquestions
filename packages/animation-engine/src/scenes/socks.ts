/** Pure helpers for sock_drawer (C5): the pigeonhole principle. */
import type { Bilingual } from "../core/contract";
import type { Rng } from "./random";

export interface SockColor {
  id: string;
  label: Bilingual;
  /** Tailwind fill class for the sock. */
  fill: string;
}

export const SOCK_COLORS: SockColor[] = [
  { id: "red", label: { en: "red", zh: "红" }, fill: "fill-fun-red" },
  { id: "blue", label: { en: "blue", zh: "蓝" }, fill: "fill-primary-500" },
  { id: "green", label: { en: "green", zh: "绿" }, fill: "fill-fun-green" },
  { id: "yellow", label: { en: "yellow", zh: "黄" }, fill: "fill-fun-yellow" },
  { id: "purple", label: { en: "purple", zh: "紫" }, fill: "fill-fun-purple" },
];

/** Socks needed to be sure of `pairs` matching pairs with `colors` colours: colors + 2·pairs − 1 (4 for one pair of three colours, 6 for two). */
export function socksToGuarantee(colors: number, pairs = 1): number {
  if (!Number.isInteger(colors) || colors < 1) throw new RangeError(`colors must be a positive integer, got ${colors}`);
  if (!Number.isInteger(pairs) || pairs < 1) throw new RangeError(`pairs must be a positive integer, got ${pairs}`);
  return colors + 2 * pairs - 1;
}

/** Counts per colour index. */
export function sockCounts(drawn: readonly number[], colors: number): number[] {
  const c = Array.from({ length: colors }, () => 0);
  for (const d of drawn) c[d]++;
  return c;
}

/** Matching pairs among the drawn socks. */
export function pairsIn(drawn: readonly number[], colors: number): number {
  return sockCounts(drawn, colors).reduce((n, c) => n + Math.floor(c / 2), 0);
}

/**
 * Worst luck: the drawer hands over a colour that doesn't make a new pair whenever it can
 * (an even count, fewest first); only when every colour is odd is a pair forced.
 */
export function worstSock(drawn: readonly number[], colors: number): number {
  const counts = sockCounts(drawn, colors);
  let best = -1;
  counts.forEach((c, i) => {
    if (c % 2 === 0 && (best < 0 || c < counts[best])) best = i;
  });
  return best >= 0 ? best : 0;
}

export function randomSock(rng: Rng, colors: number): number {
  return Math.floor(rng() * colors);
}

/** The worst-luck sequence until `pairs` pairs appear (its length is socksToGuarantee). */
export function worstCaseSequence(colors: number, pairs = 1): number[] {
  const drawn: number[] = [];
  while (pairsIn(drawn, colors) < pairs) drawn.push(worstSock(drawn, colors));
  return drawn;
}
