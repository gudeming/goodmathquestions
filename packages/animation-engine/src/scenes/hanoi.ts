/** Pure helpers for tower_of_hanoi (E1). Discs are sizes 1 (smallest) .. n; pegs list bottom -> top. */

export type HanoiState = [number[], number[], number[]];
export type HanoiMove = [from: number, to: number];

/** Fewest moves for n discs: 2^n - 1. minMoves(4) = 15. */
export function minMoves(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`discs must be a non-negative integer, got ${n}`);
  return 2 ** n - 1;
}

/** The optimal move list moving n discs from `from` to `to` (2^n - 1 moves). */
export function optimalSequence(n: number, from = 0, to = 2): HanoiMove[] {
  const via = 3 - from - to;
  const out: HanoiMove[] = [];
  const solve = (k: number, a: number, b: number, c: number) => {
    if (k === 0) return;
    solve(k - 1, a, c, b);
    out.push([a, b]);
    solve(k - 1, c, b, a);
  };
  solve(n, from, to, via);
  return out;
}

export function initialHanoi(n: number, peg = 0): HanoiState {
  const state: HanoiState = [[], [], []];
  state[peg] = Array.from({ length: n }, (_, i) => n - i);
  return state;
}

export function topDisc(state: HanoiState, peg: number): number | undefined {
  const p = state[peg];
  return p[p.length - 1];
}

/** A move is legal when `from` has a disc and it is smaller than `to`'s top disc. */
export function isLegalMove(state: HanoiState, from: number, to: number): boolean {
  if (from === to || from < 0 || from > 2 || to < 0 || to > 2) return false;
  const disc = topDisc(state, from);
  if (disc === undefined) return false;
  const under = topDisc(state, to);
  return under === undefined || disc < under;
}

/** Apply a legal move (returns a new state); throws on an illegal one. */
export function applyHanoiMove(state: HanoiState, from: number, to: number): HanoiState {
  if (!isLegalMove(state, from, to)) throw new Error(`illegal move ${from} -> ${to}`);
  const next = state.map((p) => [...p]) as HanoiState;
  next[to].push(next[from].pop() as number);
  return next;
}

/** Solved when every disc sits on one peg other than the start peg. */
export function isHanoiSolved(state: HanoiState, n: number, startPeg = 0): boolean {
  return state.some((p, i) => i !== startPeg && p.length === n);
}
