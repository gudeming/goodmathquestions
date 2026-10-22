/** Pure helpers for collatz_path (D5), digit_slide (D6), fib_spiral (D8) and divisor_blocks (D9). */

// --- Collatz (D5) -----------------------------------------------------------

/** Hard stop so a bad input can't hang the page (no start below 10^9 needs anywhere near this). */
export const COLLATZ_CAP = 10_000;

/** Hailstone path from n down to 1, both included: 6 → 3 → 10 → 5 → 16 → 8 → 4 → 2 → 1. */
export function collatzPath(n: number): number[] {
  if (!Number.isSafeInteger(n) || n < 1) throw new RangeError(`start must be a positive integer, got ${n}`);
  const path = [n];
  let v = n;
  while (v !== 1 && path.length <= COLLATZ_CAP) {
    v = v % 2 === 0 ? v / 2 : 3 * v + 1;
    path.push(v);
  }
  return path;
}

/** Steps to reach 1: collatzSteps(9) = 19, collatzSteps(27) = 111. */
export function collatzSteps(n: number): number {
  return collatzPath(n).length - 1;
}

export function collatzPeak(n: number): number {
  return Math.max(...collatzPath(n));
}

/** The start in [lo, hi] that takes the most steps (smallest on ties): 9 for 1..9. */
export function longestCollatz(lo: number, hi: number): number {
  let best = lo;
  for (let n = lo; n <= hi; n++) if (collatzSteps(n) > collatzSteps(best)) best = n;
  return best;
}

// --- Times eleven (D6) -------------------------------------------------------

export type ElevenStep =
  | { kind: "split"; left: number; right: number }
  | { kind: "sum"; left: number; middle: number; right: number }
  | { kind: "carry"; left: number; middle: number; right: number }
  | { kind: "result"; value: number };

/** The trick for a two-digit n: split the digits, drop their sum in the middle, carry if it is 10 or more. 85 → 8|5 → 8|13|5 → 9|3|5 → 935. */
export function timesElevenSteps(n: number): ElevenStep[] {
  if (!Number.isInteger(n) || n < 10 || n > 99) throw new RangeError(`n must be a two-digit whole number, got ${n}`);
  const left = Math.floor(n / 10);
  const right = n % 10;
  const middle = left + right;
  const steps: ElevenStep[] = [
    { kind: "split", left, right },
    { kind: "sum", left, middle, right },
  ];
  if (middle >= 10) steps.push({ kind: "carry", left: left + 1, middle: middle - 10, right });
  const value = middle >= 10 ? (left + 1) * 100 + (middle - 10) * 10 + right : left * 100 + middle * 10 + right;
  steps.push({ kind: "result", value });
  return steps;
}

// --- Fibonacci (D8) -----------------------------------------------------------

export const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

/** First n terms: fibonacci(10) = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]. */
export function fibonacci(n: number): number[] {
  if (!Number.isInteger(n) || n < 0 || n > 70) throw new RangeError(`n must be an integer 0..70, got ${n}`);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(i < 2 ? 1 : out[i - 1] + out[i - 2]);
  return out;
}

/** Ratios of neighbours: F(k+1) / F(k) for k = 1..n−1. */
export function fibRatios(n: number): number[] {
  const f = fibonacci(n);
  return f.slice(1).map((v, i) => v / f[i]);
}

export interface FibSquare {
  x: number;
  y: number;
  size: number;
  /** This square's quarter of the spiral: from `start` to `end`, radius = size; `sweep` is the SVG arc sweep flag. */
  arc: { start: [number, number]; end: [number, number]; sweep: 0 | 1 };
}

/** Outward direction of each new square (y down): right, up, left, down. */
const FIB_DIRS: Array<[number, number]> = [
  [1, 0],
  [0, -1],
  [-1, 0],
  [0, 1],
];

/**
 * The classic tiling, y pointing down: each new square goes right, up, left, down in turn and
 * spans the long side of the rectangle so far. Each square carries its quarter of the spiral;
 * consecutive quarters meet with a shared tangent, so the spiral is smooth.
 */
export function fibSquares(n: number): FibSquare[] {
  const sizes = fibonacci(n);
  const out: FibSquare[] = [];
  let [minX, minY, maxX, maxY] = [0, 0, 0, 0];
  let prevEnd: [number, number] = [1, 1];
  sizes.forEach((s, i) => {
    if (i === 0) {
      out.push({ x: 0, y: 0, size: s, arc: { start: [0, 0], end: [1, 1], sweep: 0 } });
      [maxX, maxY] = [1, 1];
      return;
    }
    const dir = (i - 1) % 4;
    const [x, y] = [[maxX, minY], [minX, minY - s], [minX - s, minY], [minX, maxY]][dir] as [number, number];
    // The edge shared with the rectangle so far; the spiral's last end point is one of its corners.
    const shared: Array<[number, number]> = [
      [[x, y], [x, y + s]],
      [[x, y + s], [x + s, y + s]],
      [[x + s, y], [x + s, y + s]],
      [[x, y], [x + s, y]],
    ][dir] as Array<[number, number]>;
    const near = (a: [number, number], b: [number, number]) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
    const centre = near(shared[0], prevEnd) ? shared[1] : shared[0];
    const [ox, oy] = FIB_DIRS[dir];
    const end: [number, number] = [centre[0] + ox * s, centre[1] + oy * s];
    const u = [prevEnd[0] - centre[0], prevEnd[1] - centre[1]];
    const v = [end[0] - centre[0], end[1] - centre[1]];
    const sweep = u[0] * v[1] - u[1] * v[0] > 0 ? 1 : 0;
    out.push({ x, y, size: s, arc: { start: prevEnd, end, sweep } });
    prevEnd = end;
    [minX, minY, maxX, maxY] = [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x + s), Math.max(maxY, y + s)];
  });
  return out;
}

/** Bounding box [minX, minY, maxX, maxY] of a list of squares. */
export function fibBounds(squares: readonly FibSquare[]): [number, number, number, number] {
  if (squares.length === 0) return [0, 0, 1, 1];
  return [
    Math.min(...squares.map((q) => q.x)),
    Math.min(...squares.map((q) => q.y)),
    Math.max(...squares.map((q) => q.x + q.size)),
    Math.max(...squares.map((q) => q.y + q.size)),
  ];
}

/** Sunflower seeds (Vogel's model): seed k at angle k × 137.5°, radius ∝ √k. Unit disc. */
export function sunflowerSeeds(count: number): Array<[number, number]> {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, k) => {
    const r = Math.sqrt((k + 0.5) / count);
    const a = k * golden;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
}

// --- Divisors (D9) ------------------------------------------------------------

/** Divisors of n smaller than n: properDivisors(28) = [1, 2, 4, 7, 14]. */
export function properDivisors(n: number): number[] {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`n must be a positive integer, got ${n}`);
  const out: number[] = [];
  for (let d = 1; d < n; d++) if (n % d === 0) out.push(d);
  return out;
}

export function aliquotSum(n: number): number {
  return properDivisors(n).reduce((a, b) => a + b, 0);
}

export type DivisorClass = "deficient" | "perfect" | "abundant";

/** Short of n, exactly n, or more than n. classify(12) = "abundant". */
export function classify(n: number): DivisorClass {
  const s = aliquotSum(n);
  return s < n ? "deficient" : s === n ? "perfect" : "abundant";
}

export function perfectNumbersUpTo(max: number): number[] {
  const out: number[] = [];
  for (let n = 2; n <= max; n++) if (classify(n) === "perfect") out.push(n);
  return out;
}
