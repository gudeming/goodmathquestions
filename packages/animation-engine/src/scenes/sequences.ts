/** Pure helpers for staircase_paths (E2), pascal_triangle (E4) and cycle_timeline (E8). */

// ---------------------------------------------------------------------------
// Staircase: hops of 1..maxHop steps.
// ---------------------------------------------------------------------------

/** Ways to climb n steps with hops of 1..maxHop: 1, 1, 2, 3, 5, 8, … (f(10) = 89). Exact up to f(70). */
export function staircaseWays(n: number, maxHop = 2): number {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`n must be a whole number >= 0, got ${n}`);
  const f = [1];
  for (let k = 1; k <= n; k++) {
    let s = 0;
    for (let h = 1; h <= maxHop && h <= k; h++) s += f[k - h];
    f.push(s);
  }
  return f[n];
}

/** Every way up, as hop lists in lexicographic order (n = 3: [1,1,1], [1,2], [2,1]). */
export function enumeratePaths(n: number, maxHop = 2): number[][] {
  const out: number[][] = [];
  const walk = (left: number, acc: number[]) => {
    if (left === 0) {
      out.push(acc);
      return;
    }
    for (let h = 1; h <= maxHop && h <= left; h++) walk(left - h, [...acc, h]);
  };
  walk(n, []);
  return out;
}

export const pathKey = (hops: readonly number[]) => hops.join("+");

// ---------------------------------------------------------------------------
// Pascal's triangle.
// ---------------------------------------------------------------------------

/** Row n of Pascal's triangle (row 0 is [1]). */
export function pascalRow(n: number): number[] {
  const row = [1];
  for (let k = 1; k <= n; k++) row.push((row[k - 1] * (n - k + 1)) / k);
  return row;
}

/** Sum of row n: 2^n (row 10 → 1024). */
export function rowSum(n: number): number {
  return pascalRow(n).reduce((a, b) => a + b, 0);
}

/** Rows 0..rows. */
export function pascalTriangle(rows: number): number[][] {
  return Array.from({ length: rows + 1 }, (_, n) => pascalRow(n));
}

/**
 * Cells [row, position] on the k-th shallow diagonal: start at row k, position 0, then go one
 * row up and one place right each time. Their sums are the Fibonacci numbers 1, 1, 2, 3, 5, 8, …
 */
export function shallowDiagonal(k: number): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let j = 0; j <= k - j; j++) cells.push([k - j, j]);
  return cells;
}

export function diagonalSums(count: number): number[] {
  return Array.from({ length: count }, (_, k) => shallowDiagonal(k).reduce((s, [r, c]) => s + pascalRow(r)[c], 0));
}

// ---------------------------------------------------------------------------
// Cycles: two periodic events, when do they coincide?
// ---------------------------------------------------------------------------

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

/** Least common multiple: lcm(13, 6) = 78, lcm(12, 6) = 12. */
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

/** Years in 1..years when both cycles come round together. */
export function collisions(a: number, b: number, years: number): number[] {
  const step = lcm(a, b);
  const out: number[] = [];
  for (let y = step; y <= years; y += step) out.push(y);
  return out;
}

/** Years in 1..years when a cycle of period p comes round. */
export function cycleYears(p: number, years: number): number[] {
  const out: number[] = [];
  for (let y = p; y <= years; y += p) out.push(y);
  return out;
}
