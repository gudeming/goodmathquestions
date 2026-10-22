/** Pure helpers for frog_puzzle (E9): n green frogs (moving right) swap with n brown frogs (moving left). */

export type Frog = "G" | "B" | null;
export type Pads = readonly Frog[];
/** A move is the index of the pad the frog leaves and the pad it lands on. */
export interface FrogMove {
  from: number;
  to: number;
}

/** G G G _ B B B */
export function initialPads(perSide: number): Frog[] {
  return [...Array<Frog>(perSide).fill("G"), null, ...Array<Frog>(perSide).fill("B")];
}

export function goalPads(perSide: number): Frog[] {
  return [...Array<Frog>(perSide).fill("B"), null, ...Array<Frog>(perSide).fill("G")];
}

export function isFrogSolved(pads: Pads): boolean {
  const n = (pads.length - 1) / 2;
  return goalPads(n).every((f, i) => f === pads[i]);
}

/**
 * The single move the frog on `from` can make (it only goes forward: a step into the empty pad,
 * or a jump over exactly one frog into it), or null.
 */
export function frogMoveFrom(pads: Pads, from: number): FrogMove | null {
  const f = pads[from];
  if (!f) return null;
  const dir = f === "G" ? 1 : -1;
  const step = from + dir;
  if (step >= 0 && step < pads.length && pads[step] === null) return { from, to: step };
  const jump = from + 2 * dir;
  if (jump >= 0 && jump < pads.length && pads[jump] === null && pads[step] !== null) return { from, to: jump };
  return null;
}

export function isLegalFrogMove(pads: Pads, move: FrogMove): boolean {
  const m = frogMoveFrom(pads, move.from);
  return m !== null && m.to === move.to;
}

export function legalFrogMoves(pads: Pads): FrogMove[] {
  return pads.flatMap((_, i) => {
    const m = frogMoveFrom(pads, i);
    return m ? [m] : [];
  });
}

export function applyFrogMove(pads: Pads, move: FrogMove): Frog[] {
  const next = [...pads];
  next[move.to] = next[move.from];
  next[move.from] = null;
  return next;
}

/** No legal move left but not solved. */
export function isFrogDeadEnd(pads: Pads): boolean {
  return !isFrogSolved(pads) && legalFrogMoves(pads).length === 0;
}

/** Minimum number of moves for n frogs a side: n(n + 2) (3 → 15). */
export function frogMinMoves(n: number): number {
  return n * (n + 2);
}

/** A shortest solution, by breadth-first search (≤ 630 states for n = 4). */
export function frogSolution(n: number): FrogMove[] {
  const start = initialPads(n);
  const key = (p: Pads) => p.map((f) => f ?? "_").join("");
  const prev = new Map<string, { parent: string; move: FrogMove } | null>([[key(start), null]]);
  const queue: Frog[][] = [start];
  const goal = key(goalPads(n));
  while (queue.length) {
    const cur = queue.shift() as Frog[];
    const k = key(cur);
    if (k === goal) break;
    for (const m of legalFrogMoves(cur)) {
      const next = applyFrogMove(cur, m);
      const nk = key(next);
      if (!prev.has(nk)) {
        prev.set(nk, { parent: k, move: m });
        queue.push(next);
      }
    }
  }
  const moves: FrogMove[] = [];
  for (let k = goal, step = prev.get(k); step; k = step.parent, step = prev.get(k)) moves.unshift(step.move);
  return moves;
}
