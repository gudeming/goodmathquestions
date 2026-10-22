import { mulberry32, randomInt, shuffle, type Rng } from "./random";
import type { Bilingual } from "../core/contract";

/** Operations a number trick step can apply. `x` is the running value, `start` the child's number. */
export const TRICK_OPS = [
  "double", //               x * 2
  "add", //                  x + arg
  "halve", //                x / 2
  "subtract_original", //    x - start
  "reverse", //              digits of x reversed (zero-padded to the input width)
  "sort_desc_minus_asc", //  digits sorted high->low minus low->high (Kaprekar step, zero-padded)
  "scramble_minus", //       |x - (x with its digits shuffled)|
  "add_reverse", //          x + reverse(x)
  "abs_diff_reverse", //     |x - reverse(x)|
] as const;
export type TrickOp = (typeof TRICK_OPS)[number];

export const TRICK_CONSTRAINTS = ["distinct_ends_diff_ge_2", "not_all_same", "none"] as const;
export type TrickConstraint = (typeof TRICK_CONSTRAINTS)[number];

export interface TrickStepSpec {
  op: TrickOp;
  arg?: number;
  label: Bilingual;
}

/** Structural subset of the number_trick_stepper config that the pure runner needs. */
export interface TrickConfigLike {
  input: { digits?: number; min?: number; max?: number; constraint?: TrickConstraint };
  steps: readonly TrickStepSpec[];
  loopUntilFixed?: boolean;
  maxLoops?: number;
}

export interface TrickStepResult {
  /** 0-based round (always 0 unless `loopUntilFixed`). */
  loop: number;
  stepIndex: number;
  op: TrickOp;
  before: number;
  after: number;
  /** For scramble_minus: the scrambled number that was subtracted. */
  operand?: number;
}

export interface TrickRun {
  start: number;
  steps: TrickStepResult[];
  final: number;
  /** Loop mode: a full round left the value unchanged. Non-loop mode: always true. */
  fixedPointReached: boolean;
  /** Loop mode: rounds that changed the value before it settled (Kaprekar: <= 7). */
  loopsToFixed: number | null;
}

export interface RunTrickOptions {
  /** Used only by `scramble_minus`; defaults to a PRNG seeded by the start value. */
  rng?: Rng;
}

const DEFAULT_MAX_LOOPS = 7;

/** Width used for zero-padding digit operations. */
export function trickWidth(start: number, config: TrickConfigLike): number {
  return Math.max(config.input.digits ?? 0, digitsOf(start, 0).length);
}

/** Digits of |n| (integer part), left-padded with zeros to `width`. */
export function digitsOf(n: number, width: number): number[] {
  const s = String(Math.trunc(Math.abs(n))).padStart(width, "0");
  return s.split("").map(Number);
}

function fromDigits(d: readonly number[]): number {
  return d.reduce((acc, x) => acc * 10 + x, 0);
}

export function reverseNumber(n: number, width = 0): number {
  return fromDigits(digitsOf(n, width).reverse());
}

function applyOp(step: TrickStepSpec, x: number, start: number, width: number, rng: Rng): { value: number; operand?: number } {
  switch (step.op) {
    case "double":
      return { value: x * 2 };
    case "add":
      return { value: x + (step.arg ?? 0) };
    case "halve":
      return { value: x / 2 };
    case "subtract_original":
      return { value: x - start };
    case "reverse":
      return { value: reverseNumber(x, width) };
    case "sort_desc_minus_asc": {
      const d = digitsOf(x, width);
      const desc = fromDigits([...d].sort((a, b) => b - a));
      const asc = fromDigits([...d].sort((a, b) => a - b));
      return { value: desc - asc };
    }
    case "scramble_minus": {
      const d = digitsOf(x, 0);
      let scrambled = d;
      // Try a few shuffles to get a genuinely different order when one exists.
      for (let i = 0; i < 8 && fromDigits(scrambled) === x && new Set(d).size > 1; i++) scrambled = shuffle(d, rng);
      const operand = fromDigits(scrambled);
      return { value: Math.abs(x - operand), operand };
    }
    case "add_reverse":
      return { value: x + reverseNumber(x, width) };
    case "abs_diff_reverse":
      return { value: Math.abs(x - reverseNumber(x, width)) };
  }
}

/**
 * Run a number trick from `start`. Pure and deterministic (given `options.rng`).
 * In loop mode the whole step list repeats until a round leaves the value unchanged,
 * for at most `maxLoops + 1` rounds (the extra round confirms the fixed point).
 */
export function runTrick(start: number, config: TrickConfigLike, options: RunTrickOptions = {}): TrickRun {
  const rng = options.rng ?? mulberry32(Math.trunc(start) * 2654435761);
  const width = trickWidth(start, config);
  const steps: TrickStepResult[] = [];
  let x = start;

  if (!config.loopUntilFixed) {
    config.steps.forEach((step, stepIndex) => {
      const { value, operand } = applyOp(step, x, start, width, rng);
      steps.push({ loop: 0, stepIndex, op: step.op, before: x, after: value, operand });
      x = value;
    });
    return { start, steps, final: x, fixedPointReached: true, loopsToFixed: null };
  }

  const maxLoops = config.maxLoops ?? DEFAULT_MAX_LOOPS;
  let changedRounds = 0;
  let fixed = false;
  for (let loop = 0; loop <= maxLoops; loop++) {
    const roundStart = x;
    config.steps.forEach((step, stepIndex) => {
      const { value, operand } = applyOp(step, x, start, width, rng);
      steps.push({ loop, stepIndex, op: step.op, before: x, after: value, operand });
      x = value;
    });
    if (x === roundStart) {
      fixed = true;
      break;
    }
    changedRounds++;
  }
  return { start, steps, final: x, fixedPointReached: fixed, loopsToFixed: fixed ? changedRounds : null };
}

export type TrickInputCheck = { ok: true } | { ok: false; reason: "not_integer" | "out_of_range" | "constraint" };

/** Inclusive input range implied by the config (digits wins over min/max defaults). */
export function trickInputRange(config: TrickConfigLike): { min: number; max: number } {
  const { digits, min, max } = config.input;
  if (digits) {
    const lo = digits === 1 ? 1 : 10 ** (digits - 1);
    return { min: min ?? lo, max: max ?? 10 ** digits - 1 };
  }
  return { min: min ?? 1, max: max ?? 100 };
}

/** Validate a child's starting number against digits/min/max and the constraint. */
export function checkTrickInput(n: number, config: TrickConfigLike): TrickInputCheck {
  if (!Number.isInteger(n)) return { ok: false, reason: "not_integer" };
  const { min, max } = trickInputRange(config);
  if (n < min || n > max) return { ok: false, reason: "out_of_range" };
  const d = digitsOf(n, 0);
  switch (config.input.constraint ?? "none") {
    case "distinct_ends_diff_ge_2":
      if (Math.abs(d[0] - d[d.length - 1]) < 2) return { ok: false, reason: "constraint" };
      break;
    case "not_all_same":
      if (new Set(digitsOf(n, trickWidth(n, config))).size < 2) return { ok: false, reason: "constraint" };
      break;
    case "none":
      break;
  }
  return { ok: true };
}

/** Draw a valid starting number (rejection sampling); null if none found in 2000 tries. */
export function randomTrickInput(config: TrickConfigLike, rng: Rng): number | null {
  const { min, max } = trickInputRange(config);
  for (let i = 0; i < 2000; i++) {
    const n = randomInt(rng, min, max);
    if (checkTrickInput(n, config).ok) return n;
  }
  return null;
}

/**
 * Deterministic edge inputs that random sampling tends to miss: the range ends, repdigits
 * (111, 2222) and equal-ended numbers (101, 2002). Only those passing the constraint are kept.
 */
export function trickEdgeInputs(config: TrickConfigLike): number[] {
  const { min, max } = trickInputRange(config);
  const candidates = new Set<number>([min, max]);
  for (let len = String(Math.max(1, min)).length; len <= String(max).length; len++) {
    for (let d = 1; d <= 9; d++) {
      candidates.add(Number(String(d).repeat(len)));
      if (len >= 2) candidates.add(Number(`${d}${"0".repeat(len - 2)}${d}`));
    }
  }
  return [...candidates].filter((n) => checkTrickInput(n, config).ok).sort((a, b) => a - b);
}

/** Linear form a*x + b of a step chain, or null once a digit operation appears. */
export interface LinearForm {
  a: number;
  b: number;
}

/** Symbolic trace of a trick made only of linear ops (used by the reveal's algebra view). */
export function linearTrace(steps: readonly TrickStepSpec[]): LinearForm[] | null {
  const out: LinearForm[] = [{ a: 1, b: 0 }];
  let cur: LinearForm = { a: 1, b: 0 };
  for (const s of steps) {
    switch (s.op) {
      case "double":
        cur = { a: cur.a * 2, b: cur.b * 2 };
        break;
      case "add":
        cur = { a: cur.a, b: cur.b + (s.arg ?? 0) };
        break;
      case "halve":
        cur = { a: cur.a / 2, b: cur.b / 2 };
        break;
      case "subtract_original":
        cur = { a: cur.a - 1, b: cur.b };
        break;
      default:
        return null;
    }
    out.push(cur);
  }
  return out;
}

/** Render a*x + b as text, e.g. "2x + 10", "x + 5", "5". */
export function formatLinear({ a, b }: LinearForm, variable = "x"): string {
  const ax = a === 0 ? "" : a === 1 ? variable : a === -1 ? `-${variable}` : `${a}${variable}`;
  if (!ax) return String(b);
  if (b === 0) return ax;
  return `${ax} ${b > 0 ? "+" : "−"} ${Math.abs(b)}`;
}

/**
 * Human-readable arithmetic for one executed step, e.g. "532 − 235 = 297" or
 * "9990 − 0999 = 8991" (digit operations keep their zero padding).
 */
export function formatTrickStep(r: TrickStepResult, start: number, width: number): string {
  const pad = (v: number) => String(Math.trunc(Math.abs(v))).padStart(width, "0");
  const minus = (a: number, b: number, sa = String(a), sb = String(b)) => (a >= b ? `${sa} − ${sb}` : `${sb} − ${sa}`);
  switch (r.op) {
    case "double":
      return `${r.before} × 2 = ${r.after}`;
    case "add": {
      const d = r.after - r.before;
      return `${r.before} ${d >= 0 ? "+" : "−"} ${Math.abs(d)} = ${r.after}`;
    }
    case "halve":
      return `${r.before} ÷ 2 = ${r.after}`;
    case "subtract_original":
      return `${r.before} − ${start} = ${r.after}`;
    case "reverse":
      return `${pad(r.before)} → ${pad(r.after)}`;
    case "sort_desc_minus_asc": {
      const d = digitsOf(r.before, width);
      const desc = [...d].sort((a, b) => b - a).join("");
      const asc = [...d].sort((a, b) => a - b).join("");
      return `${desc} − ${asc} = ${pad(r.after)}`;
    }
    case "scramble_minus": {
      const o = r.operand ?? r.before;
      return `${minus(r.before, o)} = ${r.after}`;
    }
    case "add_reverse": {
      const rev = reverseNumber(r.before, width);
      return `${pad(r.before)} + ${pad(rev)} = ${r.after}`;
    }
    case "abs_diff_reverse": {
      const rev = reverseNumber(r.before, width);
      return `${minus(r.before, rev, pad(r.before), pad(rev))} = ${pad(r.after)}`;
    }
  }
}
