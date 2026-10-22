/** Pure helpers for balance_lab (F2 find the heavy ball / E10 weights on two pans). */
import { randomInt, type Rng } from "./random";

/**
 * Every positive whole weight measurable with these weights. With two pans a weight can sit
 * opposite the object (+w), beside it (-w) or stay off (0). weighableSet([1, 3, 9, 27]) = 1..40.
 */
export function weighableSet(weights: readonly number[], twoPan = true): number[] {
  let sums = new Set<number>([0]);
  for (const w of weights) {
    const next = new Set<number>();
    for (const s of sums) {
      next.add(s);
      next.add(s + w);
      if (twoPan) next.add(s - w);
    }
    sums = next;
  }
  return [...sums].filter((s) => s > 0).sort((a, b) => a - b);
}

/** Largest n such that every weight 1..n is measurable (the "1 to 40" answer). */
export function contiguousReach(weights: readonly number[], twoPan = true): number {
  const set = new Set(weighableSet(weights, twoPan));
  let n = 0;
  while (set.has(n + 1)) n++;
  return n;
}

/**
 * One way to weigh `target`: weights on the opposite pan and on the object's pan.
 * Returns null if impossible. Prefers using fewer weights beside the object.
 */
export function weighingFor(target: number, weights: readonly number[], twoPan = true): { opposite: number[]; beside: number[] } | null {
  const n = weights.length;
  const choices = twoPan ? [0, 1, -1] : [0, 1];
  const coef = Array.from({ length: n }, () => 0);
  let found: number[] | null = null;
  const go = (i: number, sum: number) => {
    if (found) return;
    if (i === n) {
      if (sum === target) found = [...coef];
      return;
    }
    for (const c of choices) {
      coef[i] = c;
      go(i + 1, sum + c * weights[i]);
      if (found) return;
    }
  };
  go(0, 0);
  if (!found) return null;
  const f: number[] = found;
  return { opposite: weights.filter((_, i) => f[i] === 1), beside: weights.filter((_, i) => f[i] === -1) };
}

/** Balanced-ternary digits of n, least significant first, each -1 / 0 / 1 (for the reveal table). */
export function balancedTernary(n: number): number[] {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`n must be a non-negative integer, got ${n}`);
  const out: number[] = [];
  let v = n;
  while (v > 0) {
    let r = v % 3;
    v = Math.floor(v / 3);
    if (r === 2) {
      r = -1;
      v += 1;
    }
    out.push(r);
  }
  return out;
}

/** Fewest weighings that always find one heavy ball among `items`: ceil(log3 items). minWeighings(9) = 2. */
export function minWeighings(items: number): number {
  if (!Number.isInteger(items) || items < 1) throw new RangeError(`items must be a positive integer, got ${items}`);
  let k = 0;
  for (let reach = 1; reach < items; reach *= 3) k++;
  return k;
}

/** Seeded position of the heavy ball (0-based). */
export function placeHeavy(rng: Rng, items: number): number {
  return randomInt(rng, 0, items - 1);
}

export type Tilt = "left" | "right" | "balanced";

/** Which pan goes down, by number of balls (all equal) plus the heavy ball's extra weight. */
export function weighBalls(left: readonly number[], right: readonly number[], heavy: number): Tilt {
  const l = left.length + (left.includes(heavy) ? 0.5 : 0);
  const r = right.length + (right.includes(heavy) ? 0.5 : 0);
  return l > r ? "left" : r > l ? "right" : "balanced";
}

/** Tilt for the weights mode: object (target) + `beside` on the left, `opposite` on the right. */
export function weighWeights(target: number, beside: readonly number[], opposite: readonly number[]): Tilt {
  const l = target + beside.reduce((a, b) => a + b, 0);
  const r = opposite.reduce((a, b) => a + b, 0);
  return l > r ? "left" : r > l ? "right" : "balanced";
}

/** The 3-3-3 strategy: split `candidates` into three near-equal groups (left pan, right pan, off). */
export function splitThree<T>(candidates: readonly T[]): [T[], T[], T[]] {
  const k = Math.ceil(candidates.length / 3);
  // Pans must hold the same count; the remainder stays off the scale.
  const pan = candidates.length - k * 2 >= 0 ? k : Math.floor(candidates.length / 2);
  return [candidates.slice(0, pan), candidates.slice(pan, pan * 2), candidates.slice(pan * 2)];
}
