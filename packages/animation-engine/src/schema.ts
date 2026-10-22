/**
 * Scene config schemas (engine v2). Binding conventions: 03-scene-catalog.md §1.4.
 *
 * - Every scene type has a Zod object schema with a `type` literal.
 * - Redundant answer-bearing fields are intentional and checked for self-consistency.
 * - Zod 3 discriminated unions only accept plain objects, so consistency checks live in
 *   `SCENE_REFINEMENTS` and are applied both to each exported per-scene schema and to
 *   the union (`SceneConfigSchema`) via `superRefine`.
 */
import { z } from "zod";
import { mulberry32 } from "./scenes/random";
import { TRICK_CONSTRAINTS, TRICK_OPS, randomTrickInput, runTrick, trickEdgeInputs } from "./scenes/number-trick";

const Bi = z.object({ en: z.string().min(1), zh: z.string().min(1) });
const num = z.number().finite();

// ---------------------------------------------------------------------------
// Legacy v1 types (DRILL questions only; frozen). Permissive: they mirror what
// SceneBuilder reads and pass unknown keys through, so the 39 authored configs
// and the inferred ones still parse.
// ---------------------------------------------------------------------------
export const LEGACY_SCENE_TYPES = [
  "pizza_slice",
  "balance_scale",
  "number_journey",
  "triangle_angles",
  "staircase",
  "candy_jar",
  "magic_square",
  "number_combine",
] as const;
export type LegacySceneType = (typeof LEGACY_SCENE_TYPES)[number];

export const PizzaSliceSchema = z
  .object({ type: z.literal("pizza_slice"), totalSlices: num.int().min(1).max(64).optional(), eatenSlices: num.int().min(0).optional() })
  .passthrough();
export const BalanceScaleSchema = z
  .object({
    type: z.literal("balance_scale"),
    leftSide: z.object({ expression: z.string().optional() }).passthrough().optional(),
    // SceneBuilder treats a non-numeric value (seed has `"4 coins"`) as unknown.
    rightSide: z.object({ value: z.union([num, z.string()]).optional() }).passthrough().optional(),
  })
  .passthrough();
export const NumberJourneySchema = z
  .object({ type: z.literal("number_journey"), range: z.tuple([num, num]).optional(), highlights: z.array(num).optional() })
  .passthrough();
export const TriangleAnglesSchema = z.object({ type: z.literal("triangle_angles"), angles: z.array(num).optional() }).passthrough();
export const StaircaseSchema = z
  .object({ type: z.literal("staircase"), totalStairs: num.int().min(1).max(50).optional(), stepOptions: z.array(num.int()).optional() })
  .passthrough();
/** Colour counts are free-form keys (`red: 9, blue: 15`), so anything else passes through. */
export const CandyJarSchema = z.object({ type: z.literal("candy_jar") }).passthrough();
export const MagicSquareSchema = z
  .object({
    type: z.literal("magic_square"),
    size: num.int().min(2).max(8).optional(),
    targetSum: num.optional(),
    known: z.record(num).optional(),
  })
  .passthrough();
export const NumberCombineSchema = z
  .object({ type: z.literal("number_combine"), numbers: z.array(num).optional(), operation: z.string().optional() })
  .passthrough();

// ---------------------------------------------------------------------------
// Tier 1 scenes
// ---------------------------------------------------------------------------

/** A1: pair 1..n from both ends. `pairSum`/`pairCount` are redundant on purpose (= n + 1, n / 2). */
const GaussPairingBase = z.object({
  type: z.literal("gauss_pairing"),
  n: num.int().min(4).max(1000),
  visibleHead: num.int().min(3).max(10).default(6),
  visibleTail: num.int().min(3).max(10).default(6),
  pairSum: num.int(),
  pairCount: num.int(),
  seed: num.int().optional(),
});

/** A8: n people on a circle; each pair shakes once. */
const HandshakeGraphBase = z.object({
  type: z.literal("handshake_graph"),
  people: num.int().min(3).max(12),
  /** Optional display names, one per person (defaults to 1..n). */
  names: z.array(Bi).max(12).optional(),
});

/** B1: count k x k squares on an n x n grid. */
const GridSquaresBase = z.object({
  type: z.literal("grid_squares"),
  size: num.int().min(3).max(8),
});

const TrickStep = z.object({
  op: z.enum(TRICK_OPS),
  /** Required for `add`. */
  arg: num.optional(),
  label: Bi,
});

/** D1-D4: the child picks a number and steps through a trick. */
const NumberTrickStepperBase = z.object({
  type: z.literal("number_trick_stepper"),
  input: z.object({
    digits: num.int().min(1).max(4).optional(),
    min: num.int().optional(),
    max: num.int().optional(),
    constraint: z.enum(TRICK_CONSTRAINTS).optional(),
  }),
  steps: z.array(TrickStep).min(1).max(8),
  /** Repeat all steps until a round leaves the value unchanged (Kaprekar). */
  loopUntilFixed: z.boolean().optional(),
  maxLoops: num.int().min(1).max(20).default(7),
  /** Answer-bearing: every valid input must end here. Verified by running 20 seeded inputs. */
  expectFixedPoint: num.optional(),
  /** Answer-bearing (D3): every valid input's result must be divisible by this. Verified like the above. */
  expectDivisibleBy: num.int().min(2).optional(),
  /** Extra reveal panel; when omitted, a linear-only trick shows its algebra automatically. */
  revealExtra: z.enum(["nines_table", "algebra", "none"]).optional(),
  seed: num.int().optional(),
});

/** C2: pick a door, the host opens the empty ones, switch or stay. */
const MontyHallBase = z.object({
  type: z.literal("monty_hall"),
  doors: num.int().min(3).max(100),
  /** Manual rounds before the scene reports `completed`. */
  rounds: num.int().min(1).max(200).default(20),
  seed: num.int().optional(),
});

// ---------------------------------------------------------------------------
// Self-consistency checks (catalog §1.4)
// ---------------------------------------------------------------------------
type Check<T> = (c: T, ctx: z.RefinementCtx) => void;

const checkGauss: Check<z.infer<typeof GaussPairingBase>> = (c, ctx) => {
  if (c.n % 2 !== 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["n"], message: "n must be even so every number has a partner" });
  if (c.pairSum !== c.n + 1 || c.pairCount !== c.n / 2)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pairSum"], message: "pairSum/pairCount inconsistent with n" });
  if (c.visibleHead + c.visibleTail > c.n)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["visibleHead"], message: "visibleHead + visibleTail must not exceed n" });
};

const checkHandshake: Check<z.infer<typeof HandshakeGraphBase>> = (c, ctx) => {
  if (c.names && c.names.length !== c.people)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["names"], message: "names must have exactly one entry per person" });
};

const TRICK_SAMPLE_COUNT = 20;
const TRICK_SAMPLE_SEED = 20261022;

const checkTrick: Check<z.infer<typeof NumberTrickStepperBase>> = (c, ctx) => {
  const { min, max } = c.input;
  if (min !== undefined && max !== undefined && min > max)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["input", "min"], message: "input.min must be <= input.max" });
  c.steps.forEach((s, i) => {
    if (s.op === "add" && s.arg === undefined)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["steps", i, "arg"], message: "add needs an arg" });
  });
  if (c.expectFixedPoint === undefined && c.expectDivisibleBy === undefined) return;

  // 20 seeded random valid inputs (catalog §2) plus deterministic edge probes.
  const rng = mulberry32(TRICK_SAMPLE_SEED);
  const inputs: number[] = [];
  for (let i = 0; i < TRICK_SAMPLE_COUNT; i++) {
    const start = randomTrickInput(c, rng);
    if (start === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["input"], message: "no valid input satisfies input constraints" });
      return;
    }
    inputs.push(start);
  }
  inputs.push(...trickEdgeInputs(c));
  for (const start of inputs) {
    const run = runTrick(start, c, { rng });
    if (c.expectFixedPoint !== undefined && (run.final !== c.expectFixedPoint || !run.fixedPointReached)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectFixedPoint"],
        message: `input ${start} ends at ${run.final}${run.fixedPointReached ? "" : " (not settled)"}, expected ${c.expectFixedPoint}`,
      });
      return;
    }
    if (c.expectDivisibleBy !== undefined && run.final % c.expectDivisibleBy !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectDivisibleBy"],
        message: `input ${start} ends at ${run.final}, not divisible by ${c.expectDivisibleBy}`,
      });
      return;
    }
  }
};

/** Per-type consistency checks, applied to the per-scene schemas and to the union. */
const SCENE_REFINEMENTS: Partial<Record<string, Check<never>>> = {
  gauss_pairing: checkGauss as Check<never>,
  handshake_graph: checkHandshake as Check<never>,
  number_trick_stepper: checkTrick as Check<never>,
};

// Refined per-scene schemas (use these when validating a single known type).
export const GaussPairingSchema = GaussPairingBase.superRefine(checkGauss);
export const HandshakeGraphSchema = HandshakeGraphBase.superRefine(checkHandshake);
export const GridSquaresSchema = GridSquaresBase;
export const NumberTrickStepperSchema = NumberTrickStepperBase.superRefine(checkTrick);
export const MontyHallSchema = MontyHallBase;

export const NEW_SCENE_TYPES = ["gauss_pairing", "handshake_graph", "grid_squares", "number_trick_stepper", "monty_hall"] as const;

export const SceneConfigSchema = z
  .discriminatedUnion("type", [
    PizzaSliceSchema,
    BalanceScaleSchema,
    NumberJourneySchema,
    TriangleAnglesSchema,
    StaircaseSchema,
    CandyJarSchema,
    MagicSquareSchema,
    NumberCombineSchema,
    GaussPairingBase,
    HandshakeGraphBase,
    GridSquaresBase,
    NumberTrickStepperBase,
    MontyHallBase,
  ])
  .superRefine((c, ctx) => {
    const check = SCENE_REFINEMENTS[c.type] as Check<typeof c> | undefined;
    check?.(c, ctx);
  });

export type SceneConfig = z.infer<typeof SceneConfigSchema>;
export type SceneConfigInput = z.input<typeof SceneConfigSchema>;
export type SceneConfigType = SceneConfig["type"];
export type SceneConfigOf<T extends SceneConfigType> = Extract<SceneConfig, { type: T }>;

export type GaussPairingConfig = SceneConfigOf<"gauss_pairing">;
export type HandshakeGraphConfig = SceneConfigOf<"handshake_graph">;
export type GridSquaresConfig = SceneConfigOf<"grid_squares">;
export type NumberTrickStepperConfig = SceneConfigOf<"number_trick_stepper">;
export type MontyHallConfig = SceneConfigOf<"monty_hall">;
export type LegacySceneConfig = SceneConfigOf<LegacySceneType>;

export const SCENE_TYPES: readonly SceneConfigType[] = [...LEGACY_SCENE_TYPES, ...NEW_SCENE_TYPES];

export function isLegacySceneType(type: unknown): type is LegacySceneType {
  return typeof type === "string" && (LEGACY_SCENE_TYPES as readonly string[]).includes(type);
}

export type ParseSceneResult = { ok: true; config: SceneConfig } | { ok: false; error: string };

/** Format Zod issues as `path: message; path: message`. */
function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`).join("; ");
}

/** Parse untrusted JSON (DB / admin editor) into a typed scene config. Never throws. */
export function parseSceneConfig(input: unknown): ParseSceneResult {
  const result = SceneConfigSchema.safeParse(input);
  return result.success ? { ok: true, config: result.data } : { ok: false, error: formatIssues(result.error) };
}
