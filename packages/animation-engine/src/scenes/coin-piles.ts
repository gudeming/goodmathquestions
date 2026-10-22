/** Pure helpers for coin_piles (F10): split blindfolded, flip the small pile, the heads match. */
import { mulberry32, shuffle } from "./random";

/** `coins` faces (true = heads) with exactly `heads` heads, shuffled by `seed`. */
export function dealCoins(coins: number, heads: number, seed: number): boolean[] {
  const faces = Array.from({ length: coins }, (_, i) => i < heads);
  return shuffle(faces, mulberry32(seed));
}

export interface SplitResult {
  /** Heads in the small (right) pile before flipping: k. */
  k: number;
  /** Heads left behind in the big pile: heads − k. */
  leftHeads: number;
  /** Heads in the small pile after flipping it: size − k. */
  rightHeadsAfterFlip: number;
}

/**
 * Move the coins at `picked` (indices) into the right pile and flip them all. With
 * picked.length === heads, the two piles always end with the same number of heads.
 */
export function splitAndFlip(faces: readonly boolean[], picked: readonly number[]): SplitResult {
  const set = new Set(picked);
  let k = 0;
  let total = 0;
  faces.forEach((h, i) => {
    if (h) total++;
    if (h && set.has(i)) k++;
  });
  return { k, leftHeads: total - k, rightHeadsAfterFlip: set.size - k };
}

/** `count` distinct random indices in 0..coins−1. */
export function randomPick(coins: number, count: number, seed: number): number[] {
  return shuffle(
    Array.from({ length: coins }, (_, i) => i),
    mulberry32(seed),
  ).slice(0, count);
}
