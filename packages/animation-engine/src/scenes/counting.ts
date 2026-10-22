/** Pure counting helpers for handshake_graph, grid_squares and gauss_pairing. */

/** Number of handshakes when every pair of n people shakes once: n(n - 1) / 2. */
export function handshakes(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`handshakes: n must be a non-negative integer, got ${n}`);
  return (n * (n - 1)) / 2;
}

/** Number of k x k squares on an n x n grid: (n - k + 1)^2 (0 when k > n). */
export function squaresOfSize(size: number, k: number): number {
  if (k < 1 || k > size) return 0;
  return (size - k + 1) ** 2;
}

/** Total number of squares of every size on an n x n grid: 1^2 + 2^2 + ... + n^2. */
export function countSquares(size: number): number {
  if (!Number.isInteger(size) || size < 0) throw new RangeError(`countSquares: size must be a non-negative integer, got ${size}`);
  let total = 0;
  for (let k = 1; k <= size; k++) total += squaresOfSize(size, k);
  return total;
}

/** 1 + 2 + ... + n. */
export function triangular(n: number): number {
  return (n * (n + 1)) / 2;
}

/** Stable key for an unordered pair, so (a, b) and (b, a) dedupe. */
export function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
