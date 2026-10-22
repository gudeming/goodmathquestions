/** Pure helpers for pi_darts (C7): random points in a square; the share inside the circle is π/4. */
import type { Rng } from "./random";

/** A dart in the unit square [0, 1)²; the circle has centre (0.5, 0.5) and radius 0.5. */
export interface Dart {
  x: number;
  y: number;
  inside: boolean;
}

export function isInsideCircle(x: number, y: number): boolean {
  return (x - 0.5) ** 2 + (y - 0.5) ** 2 <= 0.25;
}

export function throwDarts(rng: Rng, count: number): Dart[] {
  return Array.from({ length: count }, () => {
    const x = rng();
    const y = rng();
    return { x, y, inside: isInsideCircle(x, y) };
  });
}

/** 4 × inside / total (NaN before the first dart). */
export function piEstimate(inside: number, total: number): number {
  return total === 0 ? Number.NaN : (4 * inside) / total;
}

/** Running estimate after each checkpoint: every dart up to 100, then every `stride` darts. */
export function convergence(darts: readonly Dart[], stride = 10): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let inside = 0;
  darts.forEach((d, i) => {
    if (d.inside) inside++;
    const n = i + 1;
    if (n <= 100 || n % stride === 0 || n === darts.length) out.push([n, piEstimate(inside, n)]);
  });
  return out;
}

/** Seeded estimate from `count` darts. */
export function simulatePi(rng: Rng, count: number): number {
  let inside = 0;
  for (let i = 0; i < count; i++) if (isInsideCircle(rng(), rng())) inside++;
  return piEstimate(inside, count);
}
