/** Pure helpers for halving_bar (A10): 1/2 + 1/4 + 1/8 + … and the 1/3 + 1/9 + … extension. */

/** Accepted ratios, as denominators: 0.5 → 2, 1/3 → 3. */
export const HALVING_DENOMINATORS = [2, 3] as const;
export type HalvingDenominator = (typeof HALVING_DENOMINATORS)[number];

/** Map a configured ratio (0.5 or 1/3, within 1e-6) to its denominator; null if neither. */
export function ratioDenominator(ratio: number): HalvingDenominator | null {
  for (const d of HALVING_DENOMINATORS) if (Math.abs(ratio - 1 / d) < 1e-6) return d;
  return null;
}

/** k-th term (k >= 1) of the series r + r^2 + …, r = 1/d. */
export function seriesTerm(k: number, d: HalvingDenominator): number {
  return 1 / d ** k;
}

/** Sum after n terms: r(1 - r^n)/(1 - r). For d = 2 that is 1 - 1/2^n. */
export function partialSum(n: number, d: HalvingDenominator): number {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`n must be a non-negative integer, got ${n}`);
  const r = 1 / d;
  return (r * (1 - r ** n)) / (1 - r);
}

/** Where the series ends up: 1 for halves, 1/2 for thirds. */
export function seriesLimit(d: HalvingDenominator): number {
  return 1 / (d - 1);
}

/** Exact partial sum as a reduced fraction [numerator, denominator] (exact up to n = 30). */
export function partialSumFraction(n: number, d: HalvingDenominator): [number, number] {
  if (n === 0) return [0, 1];
  const den = d ** n;
  // (d^n - 1) / ((d - 1) d^n): for d = 2 the (d - 1) is 1; for d = 3, d^n - 1 is even.
  return [(den - 1) / (d - 1), den];
}

/** How far is left after n steps (in metres, 1 m to start), when walking halves. */
export function remainingAfter(n: number, d: HalvingDenominator): number {
  return seriesLimit(d) - partialSum(n, d);
}

export interface TinyThing {
  metres: number;
  emoji: string;
  en: string;
  zh: string;
}

/** Real sizes, so notes stay true: a hair is reached at step 14, a bacterium at 20, an atom only at 34. */
export const TINY_THINGS: TinyThing[] = [
  { metres: 1e-2, emoji: "🐜", en: "an ant", zh: "一只蚂蚁" },
  { metres: 1e-4, emoji: "➰", en: "the width of a hair", zh: "一根头发的粗细" },
  { metres: 2e-6, emoji: "🦠", en: "a bacterium", zh: "一个细菌" },
  { metres: 1e-7, emoji: "🧬", en: "a virus", zh: "一个病毒" },
  { metres: 1e-10, emoji: "⚛️", en: "an atom", zh: "一个原子" },
];

/** The smallest thing the gap has already shrunk below (null if still bigger than an ant). */
export function smallerThan(gapMetres: number): TinyThing | null {
  let found: TinyThing | null = null;
  for (const t of TINY_THINGS) if (gapMetres < t.metres) found = t;
  return found;
}

/** First step after which the gap (halves) is smaller than `metres`. */
export function stepsToShrinkBelow(metres: number, d: HalvingDenominator = 2): number {
  let n = 0;
  while (remainingAfter(n, d) >= metres && n < 200) n++;
  return n;
}
