/** Pure helpers for guess_game (F12): higher / lower and binary search. */

/** Guesses that always suffice for 1..max: the smallest k with 2^k > max (100 → 7, 1000 → 10). */
export function binarySearchSteps(max: number): number {
  if (!Number.isInteger(max) || max < 1) throw new RangeError(`max must be a whole number >= 1, got ${max}`);
  return Math.ceil(Math.log2(max + 1) - 1e-12);
}

/** Halving the range, rounding up, until one number is left: 100 → 50 → 25 → 13 → 7 → 4 → 2 → 1. */
export function halvingStrip(max: number): number[] {
  const out = [max];
  while (out[out.length - 1] > 1) out.push(Math.ceil(out[out.length - 1] / 2));
  return out;
}

export type GuessReply = "higher" | "lower" | "correct";

/** The host's reply to `guess` when the secret is `secret`. */
export function replyTo(secret: number, guess: number): GuessReply {
  return guess === secret ? "correct" : guess < secret ? "higher" : "lower";
}

/** Range still possible after a reply (inclusive bounds); empty when lo > hi (someone fibbed). */
export function narrow(lo: number, hi: number, guess: number, reply: GuessReply): [number, number] {
  if (reply === "correct") return [guess, guess];
  return reply === "higher" ? [Math.max(lo, guess + 1), hi] : [lo, Math.min(hi, guess - 1)];
}

/** The computer's guess: the middle of what is left. */
export function middleGuess(lo: number, hi: number): number {
  return Math.floor((lo + hi) / 2);
}

/** The guesses binary search makes to find `secret` in 1..max. */
export function binarySearchPath(secret: number, max: number): number[] {
  const out: number[] = [];
  let lo = 1;
  let hi = max;
  while (lo <= hi) {
    const g = middleGuess(lo, hi);
    out.push(g);
    const reply = replyTo(secret, g);
    if (reply === "correct") break;
    [lo, hi] = narrow(lo, hi, g, reply);
  }
  return out;
}
