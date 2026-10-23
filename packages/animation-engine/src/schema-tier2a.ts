/**
 * Tier-2 scene schemas, batch 3a (03-scene-catalog.md §3). Same conventions as schema.ts:
 * plain object bases (for the discriminated union) + per-type consistency checks, applied
 * both to the exported per-scene schemas and to the union via `superRefine`.
 */
import { z } from "zod";
import { ratioDenominator } from "./scenes/halving";
import { integerHypotenuse } from "./scenes/pythagoras";
import { degrees, hasEulerPath, isEdgeConnected } from "./scenes/bridges";
import { overlapTimes } from "./scenes/clock";
import { classify } from "./scenes/number-play";

const Bi = z.object({ en: z.string().min(1), zh: z.string().min(1) });
const num = z.number().finite();
const int = num.int();
const Id = z.string().regex(/^[a-z0-9_-]{1,24}$/, "id must be lowercase letters, digits, _ or -");
const Emoji = z.string().min(1).max(8);

type Check<T> = (c: T, ctx: z.RefinementCtx) => void;
const issue = (ctx: z.RefinementCtx, path: Array<string | number>, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

/**
 * A4 / A5 / A9: a ladder of unit conversions (time, heartbeats) or two powers of ten (powers).
 * - time:       `start` = seconds (default 1,000,000); references in seconds.
 * - heartbeats: `start` = beats a minute (default 70), `target` = beats to reach (default 10^9); references in years of age.
 * - powers:     `start` / `target` = number of zeros of the two numbers (default 80 and 100); references in zeros.
 */
export const ScaleLadderBase = z.object({
  type: z.literal("scale_ladder"),
  mode: z.enum(["time", "heartbeats", "powers"]),
  start: num.positive().optional(),
  target: num.positive().optional(),
  /** Names of the two numbers (powers) or of the start quantity. */
  labels: z.object({ start: Bi.optional(), target: Bi.optional() }).optional(),
  references: z.array(z.object({ value: num.positive(), label: Bi, emoji: Emoji.optional() })).max(6).optional(),
});

/** A10: walk half (or a third) of what is left, again and again. */
export const HalvingBarBase = z.object({
  type: z.literal("halving_bar"),
  /** 0.5 (A10) or 1/3 (the extension: 1/3 + 1/9 + … = 1/2). */
  ratio: num.default(0.5),
  maxSteps: int.min(5).max(60).default(20),
});

/** B3: a rope hugging a ball, the Earth or the Sun, made `extra` metres longer. */
export const CircleRopeBase = z.object({
  type: z.literal("circle_rope"),
  extraMetersMax: num.min(1).max(100).default(10),
  /** Extra rope the reveal uses for every ball (the question's canonical value; default 1 m). */
  revealExtraMeters: num.positive().max(100).optional(),
  planets: z.array(z.object({ id: Id, label: Bi, radiusM: num.positive().max(1e13), emoji: Emoji.optional() })).min(1).max(4).optional(),
});

/** B6: squares on the sides of a (right) triangle. a² + b² must be a perfect square so the tile reveal fills exactly. */
export const PythagorasSquaresBase = z.object({
  type: z.literal("pythagoras_squares"),
  a: int.min(1).max(12).default(6),
  b: int.min(1).max(12).default(8),
  lockRightAngle: z.boolean().default(true),
});

/** B7 and any one-stroke puzzle: walk every edge (bridge) exactly once. Coordinates are 0..100. */
export const BridgesTraceBase = z.object({
  type: z.literal("bridges_trace"),
  nodes: z.array(z.object({ id: Id, x: num.min(0).max(100), y: num.min(0).max(100), label: Bi.optional() })).min(2).max(12),
  edges: z.array(z.tuple([z.string(), z.string()])).min(1).max(20),
  /** Background art: the river Pregel and its islands. */
  layout: z.enum(["konigsberg"]).optional(),
  /** Answer-bearing: when given, must agree with Euler's rule. */
  solvable: z.boolean().optional(),
});

/** B8: drag the minute hand; count the overlaps. */
export const ClockOverlapBase = z.object({
  type: z.literal("clock_overlap"),
  /** Half a day to two days, in 12-hour steps (24 = the classic whole day). */
  hours: z.union([z.literal(12), z.literal(24), z.literal(36), z.literal(48)]).default(24),
  /** Answer-bearing: when given, must equal the number of overlaps in `hours` (11 per 12 hours). */
  overlaps: int.optional(),
});

/** C4: flip until a streak; the next flip is still 50/50. */
export const CoinFlipsBase = z.object({
  type: z.literal("coin_flips"),
  streak: int.min(2).max(12).default(10),
  seed: int.optional(),
});

/** C5: socks in the dark (pigeonhole principle). */
export const SockDrawerBase = z.object({
  type: z.literal("sock_drawer"),
  colors: int.min(3).max(5).default(3),
  /** Ask for two pairs instead of one (extension: 6 socks for three colours). */
  guaranteeTwoPairs: z.boolean().optional(),
  seed: int.optional(),
});

/** C7: random dots in a square; 4 × (share inside the circle) ≈ π. */
export const PiDartsBase = z.object({
  type: z.literal("pi_darts"),
  maxDrops: int.min(100).max(20_000).default(5000),
  seed: int.optional(),
});

/** D5: the 3n + 1 game. */
export const CollatzPathBase = z.object({
  type: z.literal("collatz_path"),
  maxStart: int.min(10).max(1000).default(200),
  /** Starts compared in the reveal's bar chart (D5: 1..9). */
  highlightRange: z.tuple([int.min(1), int.min(1)]).default([1, 9]),
});

/** D6: the × 11 shortcut for two-digit numbers. */
export const DigitSlideBase = z.object({
  type: z.literal("digit_slide"),
  multiplier: z.literal(11).default(11),
  /** Quick-pick numbers (two-digit). */
  examples: z.array(int.min(10).max(99)).min(1).max(6).optional(),
  /** Optional scene copy; the hook line defaults to the first examples worked out ("45 × 11 = 495. …"). */
  labels: z.object({ hook: Bi.optional() }).optional(),
});

/** D8: Fibonacci squares and the golden spiral. */
export const FibSpiralBase = z.object({
  type: z.literal("fib_spiral"),
  terms: int.min(5).max(14).default(10),
});

/** D9: proper divisors stacked against the number itself. */
export const DivisorBlocksBase = z.object({
  type: z.literal("divisor_blocks"),
  max: int.min(10).max(100).default(40),
  /** Answer-bearing: the perfect numbers the reveal shows; each must be perfect and <= max. */
  highlight: z.array(int.min(2)).min(1).max(3).default([6, 28]),
});

// ---------------------------------------------------------------------------
// Consistency checks
// ---------------------------------------------------------------------------

const checkScale: Check<z.infer<typeof ScaleLadderBase>> = (c, ctx) => {
  const { mode, start, target } = c;
  if (mode === "time") {
    if (target !== undefined) issue(ctx, ["target"], "time mode has no target");
    if (start !== undefined && (!Number.isInteger(start) || start > 1e12)) issue(ctx, ["start"], "time start must be a whole number of seconds <= 10^12");
  } else if (mode === "heartbeats") {
    if (start !== undefined && (start < 20 || start > 600)) issue(ctx, ["start"], "heartbeats start is beats a minute (20..600)");
    if (target !== undefined && (target < 1000 || target > 1e13)) issue(ctx, ["target"], "heartbeats target must be 1,000..10^13 beats");
  } else {
    for (const [k, v] of [["start", start], ["target", target]] as const) {
      if (v !== undefined && (!Number.isInteger(v) || v > 200)) issue(ctx, [k], "powers counts zeros: a whole number 1..200");
    }
    if ((start ?? 80) === (target ?? 100)) issue(ctx, ["target"], "the two numbers must have different numbers of zeros");
    c.references?.forEach((r, i) => {
      if (!Number.isInteger(r.value) || r.value > 300) issue(ctx, ["references", i, "value"], "powers references count zeros (whole number <= 300)");
    });
  }
};

const checkHalving: Check<z.infer<typeof HalvingBarBase>> = (c, ctx) => {
  if (ratioDenominator(c.ratio) === null) issue(ctx, ["ratio"], "ratio must be 0.5 or 1/3");
};

const checkRope: Check<z.infer<typeof CircleRopeBase>> = (c, ctx) => {
  const ids = c.planets?.map((p) => p.id) ?? [];
  if (new Set(ids).size !== ids.length) issue(ctx, ["planets"], "planet ids must be unique");
};

const checkPythagoras: Check<z.infer<typeof PythagorasSquaresBase>> = (c, ctx) => {
  if (integerHypotenuse(c.a, c.b) === null) issue(ctx, ["b"], `${c.a}² + ${c.b}² = ${c.a * c.a + c.b * c.b} is not a perfect square (use a triple like 3-4-5, 6-8-10, 5-12-13)`);
};

const checkBridges: Check<z.infer<typeof BridgesTraceBase>> = (c, ctx) => {
  const ids = c.nodes.map((n) => n.id);
  if (new Set(ids).size !== ids.length) {
    issue(ctx, ["nodes"], "node ids must be unique");
    return;
  }
  let ok = true;
  c.edges.forEach(([a, b], i) => {
    if (!ids.includes(a) || !ids.includes(b)) {
      issue(ctx, ["edges", i], `unknown node in edge [${a}, ${b}]`);
      ok = false;
    } else if (a === b) {
      issue(ctx, ["edges", i], "an edge must join two different nodes");
      ok = false;
    }
  });
  if (!ok) return;
  const d = degrees(c);
  const lonely = ids.filter((id) => d[id] === 0);
  if (lonely.length) issue(ctx, ["nodes"], `nodes without edges: ${lonely.join(", ")}`);
  if (!isEdgeConnected(c)) issue(ctx, ["edges"], "the graph must be in one piece");
  if (c.solvable !== undefined && c.solvable !== hasEulerPath(c))
    issue(ctx, ["solvable"], `solvable is ${c.solvable} but Euler's rule says ${hasEulerPath(c)}`);
};

const checkClock: Check<z.infer<typeof ClockOverlapBase>> = (c, ctx) => {
  const n = overlapTimes(c.hours).length;
  if (c.overlaps !== undefined && c.overlaps !== n) issue(ctx, ["overlaps"], `the hands overlap ${n} times in ${c.hours} hours, not ${c.overlaps}`);
};

const checkCollatz: Check<z.infer<typeof CollatzPathBase>> = (c, ctx) => {
  const [lo, hi] = c.highlightRange;
  if (lo >= hi) issue(ctx, ["highlightRange"], "highlightRange must be [low, high] with low < high");
  if (hi > c.maxStart) issue(ctx, ["highlightRange"], "highlightRange must be within 1..maxStart");
  if (hi - lo > 29) issue(ctx, ["highlightRange"], "highlightRange can span at most 30 starts");
};

const checkDigitSlide: Check<z.infer<typeof DigitSlideBase>> = (c, ctx) => {
  if (c.examples && new Set(c.examples).size !== c.examples.length) issue(ctx, ["examples"], "examples must be different numbers");
};

const checkDivisors: Check<z.infer<typeof DivisorBlocksBase>> = (c, ctx) => {
  if (new Set(c.highlight).size !== c.highlight.length) issue(ctx, ["highlight"], "highlight numbers must be different");
  c.highlight.forEach((n, i) => {
    if (n > c.max) issue(ctx, ["highlight", i], `${n} is beyond max (${c.max})`);
    else if (classify(n) !== "perfect") issue(ctx, ["highlight", i], `${n} is not a perfect number`);
  });
};

export const TIER2A_REFINEMENTS = {
  scale_ladder: checkScale as Check<never>,
  halving_bar: checkHalving as Check<never>,
  circle_rope: checkRope as Check<never>,
  pythagoras_squares: checkPythagoras as Check<never>,
  bridges_trace: checkBridges as Check<never>,
  clock_overlap: checkClock as Check<never>,
  collatz_path: checkCollatz as Check<never>,
  digit_slide: checkDigitSlide as Check<never>,
  divisor_blocks: checkDivisors as Check<never>,
} satisfies Record<string, Check<never>>;

export const ScaleLadderSchema = ScaleLadderBase.superRefine(checkScale);
export const HalvingBarSchema = HalvingBarBase.superRefine(checkHalving);
export const CircleRopeSchema = CircleRopeBase.superRefine(checkRope);
export const PythagorasSquaresSchema = PythagorasSquaresBase.superRefine(checkPythagoras);
export const BridgesTraceSchema = BridgesTraceBase.superRefine(checkBridges);
export const ClockOverlapSchema = ClockOverlapBase.superRefine(checkClock);
export const CoinFlipsSchema = CoinFlipsBase;
export const SockDrawerSchema = SockDrawerBase;
export const PiDartsSchema = PiDartsBase;
export const CollatzPathSchema = CollatzPathBase.superRefine(checkCollatz);
export const DigitSlideSchema = DigitSlideBase.superRefine(checkDigitSlide);
export const FibSpiralSchema = FibSpiralBase;
export const DivisorBlocksSchema = DivisorBlocksBase.superRefine(checkDivisors);

export const TIER2A_SCENE_TYPES = [
  "scale_ladder",
  "halving_bar",
  "circle_rope",
  "pythagoras_squares",
  "bridges_trace",
  "clock_overlap",
  "coin_flips",
  "sock_drawer",
  "pi_darts",
  "collatz_path",
  "digit_slide",
  "fib_spiral",
  "divisor_blocks",
] as const;
