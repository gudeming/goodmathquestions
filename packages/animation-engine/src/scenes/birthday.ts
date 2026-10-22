/** Pure helpers for birthday_room (C1 any pair / C9 someone matches me). */
import { randomInt, type Rng } from "./random";

export type BirthdayMode = "any_pair" | "match_me";
export const DAYS_IN_YEAR = 365;
export const BIRTHDAY_DEFAULT_MAX: Record<BirthdayMode, number> = { any_pair: 60, match_me: 500 };

/** P(at least two of n people share a birthday) = 1 - prod_{i<n} (365 - i)/365. pAnyPair(23) ~ 0.507. */
export function pAnyPair(n: number, days = DAYS_IN_YEAR): number {
  assertPeople(n);
  if (n > days) return 1;
  let none = 1;
  for (let i = 0; i < n; i++) none *= (days - i) / days;
  return 1 - none;
}

/** P(at least one of n *other* people shares my birthday) = 1 - (364/365)^n. pMatchMe(253) ~ 0.500. */
export function pMatchMe(n: number, days = DAYS_IN_YEAR): number {
  assertPeople(n);
  return 1 - ((days - 1) / days) ** n;
}

export function birthdayProbability(mode: BirthdayMode, n: number): number {
  return mode === "any_pair" ? pAnyPair(n) : pMatchMe(n);
}

/** Smallest n with probability >= p (23 for any_pair, 253 for match_me at p = 0.5). */
export function birthdayThreshold(mode: BirthdayMode, p = 0.5): number {
  for (let n = 1; n < 10_000; n++) if (birthdayProbability(mode, n) >= p) return n;
  return 10_000;
}

/** Max people on the slider: the config's value, or the mode default (60 / 500). */
export function birthdayMaxPeople(config: { mode: BirthdayMode; maxPeople?: number }): number {
  return config.maxPeople ?? BIRTHDAY_DEFAULT_MAX[config.mode];
}

export interface BirthdayRoom {
  /** Day of year (0..364) per person; for match_me, index 0 is "me". */
  birthdays: number[];
  /** The first matching pair (indices), or null. For match_me the pair always includes 0. */
  pair: [number, number] | null;
}

/**
 * One random room. any_pair: n people, look for any shared birthday.
 * match_me: me + n others, look for someone sharing my birthday.
 */
export function randomRoom(rng: Rng, mode: BirthdayMode, n: number): BirthdayRoom {
  const size = mode === "match_me" ? n + 1 : n;
  const birthdays = Array.from({ length: size }, () => randomInt(rng, 0, DAYS_IN_YEAR - 1));
  if (mode === "match_me") {
    const j = birthdays.indexOf(birthdays[0], 1);
    return { birthdays, pair: j > 0 ? [0, j] : null };
  }
  const seen = new Map<number, number>();
  for (let i = 0; i < birthdays.length; i++) {
    const prev = seen.get(birthdays[i]);
    if (prev !== undefined) return { birthdays, pair: [prev, i] };
    seen.set(birthdays[i], i);
  }
  return { birthdays, pair: null };
}

/** Simulate `trials` rooms of n people; returns hits and the last room (for drawing). */
export function simulateBirthdays(rng: Rng, mode: BirthdayMode, n: number, trials: number): { hits: number; trials: number; rate: number; example: BirthdayRoom } {
  let hits = 0;
  let example: BirthdayRoom = { birthdays: [], pair: null };
  for (let t = 0; t < trials; t++) {
    const room = randomRoom(rng, mode, n);
    if (room.pair) hits++;
    // Prefer showing a room with a match: it's the interesting picture.
    if (t === 0 || (room.pair && !example.pair)) example = room;
  }
  return { hits, trials, rate: trials ? hits / trials : 0, example };
}

function assertPeople(n: number) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`people must be a non-negative integer, got ${n}`);
}
