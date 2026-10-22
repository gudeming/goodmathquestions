/** Pure helpers for domino_tiling (B10): boards with removed cells, colours, and exact tilings. */

export type CellRC = readonly [number, number];
export interface DominoBoard {
  size: number;
  removed: ReadonlyArray<CellRC>;
}
export type Domino = readonly [CellRC, CellRC];
export type CellColour = "black" | "white";

/** Chessboard colouring: (r + c) even is black, so the two classic corners (0,0) and (n−1,n−1) are both black. */
export function cellColour(r: number, c: number): CellColour {
  return (r + c) % 2 === 0 ? "black" : "white";
}

export const rcKey = (r: number, c: number) => `${r},${c}`;

/** Cells still on the board, row by row. */
export function boardCells(board: DominoBoard): Array<[number, number]> {
  const gone = new Set(board.removed.map(([r, c]) => rcKey(r, c)));
  const out: Array<[number, number]> = [];
  for (let r = 0; r < board.size; r++) for (let c = 0; c < board.size; c++) if (!gone.has(rcKey(r, c))) out.push([r, c]);
  return out;
}

/** How many black and white cells remain (the mutilated 8 × 8: 30 black, 32 white). */
export function colourBalance(board: DominoBoard): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (const [r, c] of boardCells(board)) {
    if (cellColour(r, c) === "black") black++;
    else white++;
  }
  return { black, white };
}

/** The colour argument: every domino covers one black and one white, so the counts must match. */
export function dominoTilingPossibleByColour(board: DominoBoard): boolean {
  const { black, white } = colourBalance(board);
  return black === white;
}

/** Are two cells side by side? */
export function areAdjacent(a: CellRC, b: CellRC): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

/**
 * An actual tiling (perfect matching of black to white neighbours, Kuhn's algorithm), or null
 * when none exists. At most 64 cells, so this runs in well under a millisecond.
 */
export function dominoTiling(board: DominoBoard): Domino[] | null {
  const cells = boardCells(board);
  if (cells.length % 2 === 1) return null;
  const present = new Set(cells.map(([r, c]) => rcKey(r, c)));
  const blacks = cells.filter(([r, c]) => cellColour(r, c) === "black");
  if (blacks.length * 2 !== cells.length) return null;
  const neighbours = (r: number, c: number) =>
    ([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as Array<[number, number]>).filter(([y, x]) => present.has(rcKey(y, x)));
  const matchOfWhite = new Map<string, number>();
  const tryAssign = (bi: number, seen: Set<string>): boolean => {
    const [r, c] = blacks[bi];
    for (const [y, x] of neighbours(r, c)) {
      const k = rcKey(y, x);
      if (seen.has(k)) continue;
      seen.add(k);
      const other = matchOfWhite.get(k);
      if (other === undefined || tryAssign(other, seen)) {
        matchOfWhite.set(k, bi);
        return true;
      }
    }
    return false;
  };
  for (let i = 0; i < blacks.length; i++) if (!tryAssign(i, new Set())) return null;
  return [...matchOfWhite.entries()].map(([k, bi]) => {
    const [y, x] = k.split(",").map(Number);
    return [blacks[bi], [y, x] as const] as Domino;
  });
}

/** The classic mutilated chessboard: two opposite corners removed. */
export const MUTILATED_8: DominoBoard = { size: 8, removed: [[0, 0], [7, 7]] };
