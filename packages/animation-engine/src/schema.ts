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
import { thicknessAfter } from "./scenes/doubling";
import { birthdayThreshold } from "./scenes/birthday";
import { RIVER_MAX_ITEMS, shortestSolution } from "./scenes/river";
import { countAtStep, cellKey } from "./scenes/pattern";
import { weighableSet } from "./scenes/balance";

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


/** A2: rice on a chessboard, doubling every square. */
const ChessboardDoublingBase = z.object({
  type: z.literal("chessboard_doubling"),
  squares: num.int().min(8).max(64),
  /** What is on the squares ("grains of rice" / "粒米"). */
  unitLabel: Bi,
  startAmount: num.int().min(1).max(1000).default(1),
  showLogScale: z.boolean().default(true),
  /** Square whose count the question asks for; reaching it proposes the answer (A2: 21). */
  askSquare: num.int().min(1).max(64).optional(),
});

const FoldReference = z.object({ heightMm: num.positive(), label: Bi, emoji: z.string().min(1).max(8).optional() });

/** A3: fold a sheet of paper again and again; compare its thickness to references. */
const FoldPaperBase = z.object({
  type: z.literal("fold_paper"),
  thicknessMm: num.positive().max(10).default(0.1),
  maxFolds: num.int().min(10).max(50).default(42),
  references: z.array(FoldReference).min(1).max(8),
});

/** C3 / C6 / C8: roll dice and watch the histogram. */
const DiceLabBase = z.object({
  type: z.literal("dice_lab"),
  mode: z.enum(["sum", "product", "until_target"]),
  dice: num.int().min(1).max(3),
  /** Face to wait for (until_target only). */
  target: num.int().min(1).max(6).optional(),
  /** Size of the big "roll many" button. */
  rolls: num.int().min(10).max(1000).default(300),
  seed: num.int().optional(),
});

/** C1 / C9: simulate rooms of people and look for shared birthdays. */
const BirthdayRoomBase = z.object({
  type: z.literal("birthday_room"),
  mode: z.enum(["any_pair", "match_me"]),
  /** Slider maximum; defaults to 60 (any_pair) / 500 (match_me) via `birthdayMaxPeople`. */
  maxPeople: num.int().min(10).max(2000).optional(),
  trials: num.int().min(10).max(1000).default(200),
  seed: num.int().optional(),
});

/** E1: the tower of Hanoi. */
const TowerOfHanoiBase = z.object({
  type: z.literal("tower_of_hanoi"),
  discs: num.int().min(3).max(6),
  /** Disc count the question asks about (E1: 4); the reveal plays its optimal solution. */
  askDiscs: num.int().min(3).max(8).optional(),
});

const RiverItem = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,24}$/, "id must be lowercase letters, digits, _ or -"),
  emoji: z.string().min(1).max(8),
  label: Bi,
});

/** F1: ferry everything across without leaving a conflicting pair alone. */
const RiverCrossingBase = z.object({
  type: z.literal("river_crossing"),
  items: z.array(RiverItem).min(2).max(RIVER_MAX_ITEMS),
  /** Pairs that can't be left alone on a bank without the farmer. */
  conflicts: z.array(z.tuple([z.string(), z.string()])).max(28),
  boatCapacity: num.int().min(1).max(3).default(1),
});

/** B4: a fixed length of fence; find the rectangle with the most area. */
const FenceShaperBase = z.object({
  type: z.literal("fence_shaper"),
  perimeter: num.int().min(8).max(200),
  integerOnly: z.boolean().default(true),
  /** One long side against a wall (only three sides fenced). */
  wallSide: z.boolean().default(false),
});

const PatternCell = z.tuple([num.int().min(-30).max(30), num.int().min(-30).max(30)]);
const PatternRuleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("linear"), a: num.int(), b: num.int() }),
  z.object({ kind: z.literal("quadratic"), a: num.int(), b: num.int(), c: num.int() }),
]);

/** E3 (and any "find the rule" picture): given steps, an explicit rule, build the next step. */
const VisualPatternBase = z.object({
  type: z.literal("visual_pattern"),
  steps: z.array(z.object({ cells: z.array(PatternCell).min(1).max(400) })).min(3).max(6),
  /** The rule is given explicitly; the scene never guesses it (catalog §2). */
  rule: PatternRuleSchema,
  askStep: num.int().min(4).max(30),
  colorRule: z.enum(["arm", "ring", "none"]).optional(),
});

/** B2: cut a pizza with straight cuts; most pieces? */
const PizzaCutsBase = z.object({
  type: z.literal("pizza_cuts"),
  maxCuts: num.int().min(2).max(6),
});

/** F2 / E10: a two-pan balance. */
const BalanceLabBase = z.object({
  type: z.literal("balance_lab"),
  mode: z.enum(["find_heavy", "weights"]),
  /** Number of balls, one of them heavy (find_heavy). */
  items: num.int().min(3).max(27).optional(),
  /** Available weights (weights mode), e.g. [1, 3, 9, 27]. */
  weights: z.array(num.int().min(1).max(1000)).min(1).max(6).optional(),
  /** Starting object weight on the slider (weights mode); must be measurable. */
  target: num.int().min(1).optional(),
  seed: num.int().optional(),
});

const AssetName = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "asset must be kebab-case without slashes or extension");

/** Fallback: a static SVG from /public/scenes/<asset>.svg; reveal may swap the picture. */
const IllustrationBase = z.object({
  type: z.literal("illustration"),
  asset: AssetName,
  caption: Bi,
  revealAsset: AssetName.optional(),
  revealCaption: Bi.optional(),
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


const issue = (ctx: z.RefinementCtx, path: Array<string | number>, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

const checkChessboard: Check<z.infer<typeof ChessboardDoublingBase>> = (c, ctx) => {
  if (c.askSquare !== undefined && c.askSquare > c.squares) issue(ctx, ["askSquare"], "askSquare must be on the board (<= squares)");
};

const checkFold: Check<z.infer<typeof FoldPaperBase>> = (c, ctx) => {
  const top = thicknessAfter(c.maxFolds, c.thicknessMm);
  c.references.forEach((r, i) => {
    if (r.heightMm > top) issue(ctx, ["references", i, "heightMm"], `unreachable: ${c.maxFolds} folds only reach ${top} mm`);
  });
};

const checkDice: Check<z.infer<typeof DiceLabBase>> = (c, ctx) => {
  if (c.mode === "until_target" && c.target === undefined) issue(ctx, ["target"], "until_target needs a target face");
  if (c.mode !== "until_target" && c.target !== undefined) issue(ctx, ["target"], "target is only used by until_target");
  if (c.mode === "product" && c.dice < 2) issue(ctx, ["dice"], "product mode needs at least 2 dice");
};

const checkBirthday: Check<z.infer<typeof BirthdayRoomBase>> = (c, ctx) => {
  if (c.maxPeople === undefined) return;
  // The reveal marks the 50% crossing, so the slider must reach it.
  const need = birthdayThreshold(c.mode);
  if (c.maxPeople < need) issue(ctx, ["maxPeople"], `maxPeople must be >= ${need} so the 50% point is on the curve`);
  if (c.mode === "any_pair" && c.maxPeople > 366) issue(ctx, ["maxPeople"], "any_pair maxPeople must be <= 366");
};

const checkRiver: Check<z.infer<typeof RiverCrossingBase>> = (c, ctx) => {
  const ids = c.items.map((i) => i.id);
  if (new Set(ids).size !== ids.length) {
    issue(ctx, ["items"], "item ids must be unique");
    return;
  }
  let ok = true;
  c.conflicts.forEach(([a, b], i) => {
    if (!ids.includes(a) || !ids.includes(b)) {
      issue(ctx, ["conflicts", i], `unknown item in conflict [${a}, ${b}]`);
      ok = false;
    } else if (a === b) {
      issue(ctx, ["conflicts", i], "an item can't conflict with itself");
      ok = false;
    }
  });
  if (ok && shortestSolution(c) === null) issue(ctx, ["conflicts"], "this puzzle has no solution");
};

const checkFence: Check<z.infer<typeof FenceShaperBase>> = (c, ctx) => {
  if (c.perimeter % 2 !== 0) issue(ctx, ["perimeter"], "perimeter must be even");
};

const checkPattern: Check<z.infer<typeof VisualPatternBase>> = (c, ctx) => {
  c.steps.forEach((s, i) => {
    if (new Set(s.cells.map(cellKey)).size !== s.cells.length) issue(ctx, ["steps", i, "cells"], "duplicate cells");
    const want = countAtStep(c.rule, i + 1);
    if (s.cells.length !== want) issue(ctx, ["steps", i, "cells"], `step ${i + 1} has ${s.cells.length} cells but the rule gives ${want}`);
  });
  for (let n = 1; n <= c.askStep; n++) {
    const v = countAtStep(c.rule, n);
    if (v < 1 || v > 5000) {
      issue(ctx, ["rule"], `rule gives ${v} cells at step ${n} (must be 1..5000)`);
      break;
    }
  }
};

const checkBalance: Check<z.infer<typeof BalanceLabBase>> = (c, ctx) => {
  if (c.mode === "find_heavy") {
    if (c.items === undefined) issue(ctx, ["items"], "find_heavy needs items");
    if (c.weights !== undefined || c.target !== undefined) issue(ctx, ["weights"], "weights/target are only used by the weights mode");
    return;
  }
  if (!c.weights) {
    issue(ctx, ["weights"], "weights mode needs weights");
    return;
  }
  if (c.items !== undefined) issue(ctx, ["items"], "items is only used by find_heavy");
  if (c.target !== undefined && !weighableSet(c.weights).includes(c.target)) issue(ctx, ["target"], `target ${c.target} can't be weighed with ${c.weights.join(", ")}`);
};

/** Per-type consistency checks, applied to the per-scene schemas and to the union. */
const SCENE_REFINEMENTS: Partial<Record<string, Check<never>>> = {
  gauss_pairing: checkGauss as Check<never>,
  handshake_graph: checkHandshake as Check<never>,
  number_trick_stepper: checkTrick as Check<never>,
  chessboard_doubling: checkChessboard as Check<never>,
  fold_paper: checkFold as Check<never>,
  dice_lab: checkDice as Check<never>,
  birthday_room: checkBirthday as Check<never>,
  river_crossing: checkRiver as Check<never>,
  fence_shaper: checkFence as Check<never>,
  visual_pattern: checkPattern as Check<never>,
  balance_lab: checkBalance as Check<never>,
};

// Refined per-scene schemas (use these when validating a single known type).
export const GaussPairingSchema = GaussPairingBase.superRefine(checkGauss);
export const HandshakeGraphSchema = HandshakeGraphBase.superRefine(checkHandshake);
export const GridSquaresSchema = GridSquaresBase;
export const NumberTrickStepperSchema = NumberTrickStepperBase.superRefine(checkTrick);
export const MontyHallSchema = MontyHallBase;
export const ChessboardDoublingSchema = ChessboardDoublingBase.superRefine(checkChessboard);
export const FoldPaperSchema = FoldPaperBase.superRefine(checkFold);
export const DiceLabSchema = DiceLabBase.superRefine(checkDice);
export const BirthdayRoomSchema = BirthdayRoomBase.superRefine(checkBirthday);
export const TowerOfHanoiSchema = TowerOfHanoiBase;
export const RiverCrossingSchema = RiverCrossingBase.superRefine(checkRiver);
export const FenceShaperSchema = FenceShaperBase.superRefine(checkFence);
export const VisualPatternSchema = VisualPatternBase.superRefine(checkPattern);
export const PizzaCutsSchema = PizzaCutsBase;
export const BalanceLabSchema = BalanceLabBase.superRefine(checkBalance);
export const IllustrationSchema = IllustrationBase;

export const NEW_SCENE_TYPES = [
  "gauss_pairing",
  "handshake_graph",
  "grid_squares",
  "number_trick_stepper",
  "monty_hall",
  "chessboard_doubling",
  "fold_paper",
  "dice_lab",
  "birthday_room",
  "tower_of_hanoi",
  "river_crossing",
  "fence_shaper",
  "visual_pattern",
  "pizza_cuts",
  "balance_lab",
  "illustration",
] as const;

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
    ChessboardDoublingBase,
    FoldPaperBase,
    DiceLabBase,
    BirthdayRoomBase,
    TowerOfHanoiBase,
    RiverCrossingBase,
    FenceShaperBase,
    VisualPatternBase,
    PizzaCutsBase,
    BalanceLabBase,
    IllustrationBase,
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
export type ChessboardDoublingConfig = SceneConfigOf<"chessboard_doubling">;
export type FoldPaperConfig = SceneConfigOf<"fold_paper">;
export type DiceLabConfig = SceneConfigOf<"dice_lab">;
export type BirthdayRoomConfig = SceneConfigOf<"birthday_room">;
export type TowerOfHanoiConfig = SceneConfigOf<"tower_of_hanoi">;
export type RiverCrossingConfig = SceneConfigOf<"river_crossing">;
export type FenceShaperConfig = SceneConfigOf<"fence_shaper">;
export type VisualPatternConfig = SceneConfigOf<"visual_pattern">;
export type PizzaCutsConfig = SceneConfigOf<"pizza_cuts">;
export type BalanceLabConfig = SceneConfigOf<"balance_lab">;
export type IllustrationConfig = SceneConfigOf<"illustration">;
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
