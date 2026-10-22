/** Pure helpers for queens_board (F7): n queens, none attacking another. A board is `cols[row]` (−1 = empty row). */

export type Queen = readonly [number, number];

export function attacks(a: Queen, b: Queen): boolean {
  return a[0] === b[0] || a[1] === b[1] || Math.abs(a[0] - b[0]) === Math.abs(a[1] - b[1]);
}

/** Squares attacked by at least one queen (row*n + col), queens' own squares excluded. */
export function attackedSquares(queens: readonly Queen[], n: number): Set<number> {
  const out = new Set<number>();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (queens.some(([qr, qc]) => qr === r && qc === c)) continue;
      if (queens.some((q) => attacks(q, [r, c]))) out.add(r * n + c);
    }
  }
  return out;
}

/** Queens that are attacked by another queen. */
export function clashingQueens(queens: readonly Queen[]): Set<number> {
  const out = new Set<number>();
  queens.forEach((a, i) => queens.forEach((b, j) => i !== j && attacks(a, b) && out.add(i)));
  return out;
}

export function isQueensSolution(queens: readonly Queen[], n: number): boolean {
  return queens.length === n && clashingQueens(queens).size === 0;
}

/** Every solution as `cols[row]`, in lexicographic order (4 → 2, 5 → 10, 6 → 4, 8 → 92). */
export function queensSolutions(n: number): number[][] {
  const out: number[][] = [];
  const cols: number[] = [];
  const place = (r: number) => {
    if (r === n) {
      out.push([...cols]);
      return;
    }
    for (let c = 0; c < n; c++) {
      if (cols.every((qc, qr) => qc !== c && Math.abs(qc - c) !== r - qr)) {
        cols.push(c);
        place(r + 1);
        cols.pop();
      }
    }
  };
  place(0);
  return out;
}

export function queensFromCols(cols: readonly number[]): Queen[] {
  return cols.flatMap((c, r) => (c >= 0 ? [[r, c] as const] : []));
}

/** `cols[row]` of a full board of queens (one per row), or null. */
export function colsFromQueens(queens: readonly Queen[], n: number): number[] | null {
  const cols = Array<number>(n).fill(-1);
  for (const [r, c] of queens) {
    if (cols[r] !== -1) return null;
    cols[r] = c;
  }
  return cols.includes(-1) ? null : cols;
}

export const solutionKey = (cols: readonly number[]) => cols.join("");

/** Mirror image (left ↔ right) of a solution. */
export function mirrorCols(cols: readonly number[]): number[] {
  return cols.map((c) => cols.length - 1 - c);
}

/** Same key for a solution and its mirror image (for "count mirror pairs once"). */
export function mirrorKey(cols: readonly number[]): string {
  const a = solutionKey(cols);
  const b = solutionKey(mirrorCols(cols));
  return a < b ? a : b;
}
