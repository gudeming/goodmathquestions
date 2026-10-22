/** Pure helpers for dice_lab (C3 sum / C6 product parity / C8 rolls until a target). */
import { randomInt, type Rng } from "./random";

export type DiceMode = "sum" | "product" | "until_target";

/** Number of ways to roll each sum with `dice` six-sided dice; index = sum (0..6*dice). */
export function sumCounts(dice: number): number[] {
  assertDice(dice);
  let counts = [1];
  for (let d = 0; d < dice; d++) {
    const next = Array.from({ length: counts.length + 6 }, () => 0);
    counts.forEach((c, s) => {
      for (let f = 1; f <= 6; f++) next[s + f] += c;
    });
    counts = next;
  }
  return counts.slice(0, 6 * dice + 1);
}

/** Exact probability of each sum; index = sum. sumDistribution(2)[7] = 6/36. */
export function sumDistribution(dice: number): number[] {
  const total = 6 ** dice;
  return sumCounts(dice).map((c) => c / total);
}

/** The most likely sums (7 for two dice; 10 and 11 for three). */
export function modeSums(dice: number): number[] {
  const counts = sumCounts(dice);
  const best = Math.max(...counts);
  return counts.flatMap((c, s) => (c === best ? [s] : []));
}

/** Product is odd only if every die is odd: P(odd) = (1/2)^dice. productParity(2) = { even: 27/36, odd: 9/36 }. */
export function productParity(dice: number): { even: number; odd: number; evenOutcomes: number; oddOutcomes: number; outcomes: number } {
  assertDice(dice);
  const outcomes = 6 ** dice;
  const oddOutcomes = 3 ** dice;
  return { even: (outcomes - oddOutcomes) / outcomes, odd: oddOutcomes / outcomes, evenOutcomes: outcomes - oddOutcomes, oddOutcomes, outcomes };
}

/** Probability that at least one of `dice` dice shows the target face in one throw. */
export function targetHitProbability(dice: number): number {
  assertDice(dice);
  return 1 - (5 / 6) ** dice;
}

/** Mean of a geometric distribution: expected throws until a success of probability p. expectedRollsUntil(1/6) = 6. */
export function expectedRollsUntil(p: number): number {
  if (!(p > 0 && p <= 1)) throw new RangeError(`p must be in (0, 1], got ${p}`);
  return 1 / p;
}

export function rollDice(rng: Rng, dice: number): number[] {
  return Array.from({ length: dice }, () => randomInt(rng, 1, 6));
}

/** Throws needed until any die shows `target` (capped so a broken RNG can't hang the page). */
export function rollsUntilTarget(rng: Rng, dice: number, target: number, cap = 1000): number {
  for (let i = 1; i <= cap; i++) if (rollDice(rng, dice).includes(target)) return i;
  return cap;
}

/**
 * One experiment's outcome: the sum, the product, or (until_target) the number of throws.
 * `faces` is the last throw so the scene can draw the dice.
 */
export function diceTrial(rng: Rng, mode: DiceMode, dice: number, target = 6): { value: number; faces: number[] } {
  if (mode === "until_target") {
    let faces: number[] = [];
    for (let i = 1; i <= 1000; i++) {
      faces = rollDice(rng, dice);
      if (faces.includes(target)) return { value: i, faces };
    }
    return { value: 1000, faces };
  }
  const faces = rollDice(rng, dice);
  return { value: mode === "sum" ? faces.reduce((a, b) => a + b, 0) : faces.reduce((a, b) => a * b, 1), faces };
}

/** Run `count` trials; values only. */
export function simulateDice(rng: Rng, mode: DiceMode, dice: number, count: number, target = 6): number[] {
  return Array.from({ length: count }, () => diceTrial(rng, mode, dice, target).value);
}

function assertDice(dice: number) {
  if (!Number.isInteger(dice) || dice < 1 || dice > 6) throw new RangeError(`dice must be an integer 1..6, got ${dice}`);
}
