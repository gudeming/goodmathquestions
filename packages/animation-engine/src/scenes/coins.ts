/** Pure helpers for coin_flips (C4): streaks are rare, but the coin has no memory. */
import type { Rng } from "./random";

export type Flip = "H" | "T";

/** Probability of `n` heads in a row: 1 / 2^n (1/1024 for ten). */
export function streakProbability(n: number): number {
  return 1 / 2 ** n;
}

/** Expected flips until the first run of `n` heads: 2^(n+1) − 2 (2046 for ten). */
export function expectedFlipsForStreak(n: number): number {
  return 2 ** (n + 1) - 2;
}

export function flip(rng: Rng): Flip {
  return rng() < 0.5 ? "H" : "T";
}

/** Running state of a long flipping session (only aggregates: sessions can reach millions of flips). */
export interface CoinState {
  flips: number;
  heads: number;
  /** Current run of heads. */
  run: number;
  longest: number;
  /** Most recent flips, newest last (at most RECENT_FLIPS). */
  recent: Flip[];
  /** Outcomes of flips that came right after at least `streak` heads in a row. */
  afterHeads: number;
  afterTails: number;
  /** Runs of `streak` heads completed so far. */
  streaks: number;
}

export const RECENT_FLIPS = 24;
/** Safety cap so a broken RNG can't hang the page. */
export const MAX_FLIPS_PER_CALL = 5_000_000;

export const EMPTY_COIN_STATE: CoinState = { flips: 0, heads: 0, run: 0, longest: 0, recent: [], afterHeads: 0, afterTails: 0, streaks: 0 };

/** Add one flip. A flip that follows a run of >= `streak` heads is counted in the after-streak tally. */
export function addFlip(s: CoinState, f: Flip, streak: number): CoinState {
  const tallied = s.run >= streak;
  const run = f === "H" ? s.run + 1 : 0;
  const recent = s.recent.length >= RECENT_FLIPS ? [...s.recent.slice(1), f] : [...s.recent, f];
  return {
    flips: s.flips + 1,
    heads: s.heads + (f === "H" ? 1 : 0),
    run,
    longest: Math.max(s.longest, run),
    recent,
    afterHeads: s.afterHeads + (tallied && f === "H" ? 1 : 0),
    afterTails: s.afterTails + (tallied && f === "T" ? 1 : 0),
    streaks: s.streaks + (run === streak ? 1 : 0),
  };
}

/** Flip until the current run reaches `streak` heads (fast-forward). Returns the new state and flips used. */
export function flipUntilStreak(s: CoinState, rng: Rng, streak: number): { state: CoinState; used: number } {
  // Mutable fast path; `recent` is rebuilt at the end.
  let { flips, heads, run, longest, afterHeads, afterTails, streaks } = s;
  const tail: Flip[] = [...s.recent];
  let used = 0;
  do {
    const f = flip(rng);
    if (run >= streak) {
      if (f === "H") afterHeads++;
      else afterTails++;
    }
    run = f === "H" ? run + 1 : 0;
    if (run === streak) streaks++;
    if (f === "H") heads++;
    longest = Math.max(longest, run);
    flips++;
    used++;
    tail.push(f);
    if (tail.length > RECENT_FLIPS * 4) tail.splice(0, tail.length - RECENT_FLIPS);
  } while (run < streak && used < MAX_FLIPS_PER_CALL);
  return { state: { flips, heads, run, longest, recent: tail.slice(-RECENT_FLIPS), afterHeads, afterTails, streaks }, used };
}

/**
 * Collect `count` "next flips after a streak": reach a streak, flip once more (tallied), repeat.
 * The tally stays close to 50/50.
 */
export function collectAfterStreak(s: CoinState, rng: Rng, streak: number, count: number): CoinState {
  let state = s;
  const target = s.afterHeads + s.afterTails + count;
  while (state.afterHeads + state.afterTails < target) {
    if (state.run < streak) state = flipUntilStreak(state, rng, streak).state;
    state = addFlip(state, flip(rng), streak);
  }
  return state;
}
