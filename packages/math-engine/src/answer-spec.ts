import { z } from "zod";
import { normalizeAnswer, parseNumberLike } from "./validator";
import { evaluateExpression, sameMultiset, type ExprErrorCode, type ExprOp } from "./expr";

/**
 * Question v2 answer model (docs/plans/good-questions-overhaul/01-question-rubric.md §4).
 *
 * These schemas describe what the JSON columns on `Question` hold:
 *   guessConfig          -> GuessConfigSchema
 *   choices              -> ChoicesSchema
 *   answerRule           -> AnswerSpecSchema
 *   wrongAnswerFeedback  -> WrongAnswerRulesSchema
 *   solutionTags         -> SolutionTagsSchema
 *
 * validateAnswerV2() dispatches on AnswerSpec.type. validateAnswer() (v1) stays the
 * checker for legacy DRILL questions.
 */

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

export const BiSchema = z.object({
  en: z.string().min(1),
  zh: z.string().min(1),
});
export type Bi = z.infer<typeof BiSchema>;

const OptionIdSchema = z.string().min(1).max(64);

const finite = () => z.number().finite();

function hasUniqueIds(items: ReadonlyArray<{ id: string }>): boolean {
  return new Set(items.map((i) => i.id)).size === items.length;
}

// ---------------------------------------------------------------------------
// GuessConfig (Act 1)
// ---------------------------------------------------------------------------

export const GuessOptionSchema = z.object({ id: OptionIdSchema }).merge(BiSchema);
export type GuessOption = z.infer<typeof GuessOptionSchema>;

const SliderGuessSchema = z.object({
  type: z.literal("slider"),
  min: finite(),
  max: finite(),
  step: finite().positive(),
  unit: BiSchema.optional(),
  logScale: z.boolean().optional(),
});

const ChoiceGuessSchema = z.object({
  type: z.literal("choice"),
  options: z.array(GuessOptionSchema).min(2).max(12),
});

/** "Which is bigger / more?" A guess value is one of COMPARE_GUESS_VALUES. */
const CompareGuessSchema = z.object({
  type: z.literal("compare"),
  left: BiSchema,
  right: BiSchema,
});

export const COMPARE_GUESS_VALUES = ["left", "right", "same"] as const;
export type CompareGuessValue = (typeof COMPARE_GUESS_VALUES)[number];

export const GuessConfigSchema = z
  .discriminatedUnion("type", [SliderGuessSchema, ChoiceGuessSchema, CompareGuessSchema])
  .superRefine((cfg, ctx) => {
    if (cfg.type === "slider") {
      if (!(cfg.min < cfg.max)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "slider min must be < max" });
      }
      if (cfg.logScale && cfg.min <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "logScale slider needs min > 0" });
      }
    }
    if (cfg.type === "choice" && !hasUniqueIds(cfg.options)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "choice option ids must be unique" });
    }
  });
export type GuessConfig = z.infer<typeof GuessConfigSchema>;

// ---------------------------------------------------------------------------
// Choices (CHOICE answer options; isCorrect is server-only)
// ---------------------------------------------------------------------------

export const ChoiceOptionSchema = GuessOptionSchema.extend({
  isCorrect: z.boolean().optional(),
});
export type ChoiceOption = z.infer<typeof ChoiceOptionSchema>;

export const ChoicesSchema = z
  .array(ChoiceOptionSchema)
  .min(2)
  .max(12)
  .refine(hasUniqueIds, { message: "choice ids must be unique" });

// ---------------------------------------------------------------------------
// AnswerSpec (Act 2)
// ---------------------------------------------------------------------------

export const EXPRESSION_OPS = ["+", "-", "*", "/", "^", "!", "sqrt", "concat"] as const;

const NumericSpecSchema = z.object({
  type: z.literal("NUMERIC"),
  value: finite(),
  tolerance: finite().nonnegative().optional(),
  unit: BiSchema.optional(),
});

const EstimateSpecSchema = z.object({
  type: z.literal("ESTIMATE"),
  min: finite(),
  max: finite(),
  truth: finite(),
  unit: BiSchema.optional(),
});

const ChoiceSpecSchema = z.object({
  type: z.literal("CHOICE"),
  correctId: OptionIdSchema,
});

const MultiValueSpecSchema = z.object({
  type: z.literal("MULTI_VALUE"),
  values: z.array(z.string().min(1)).min(1).max(20),
  orderMatters: z.boolean().optional(),
});

const OrderingSpecSchema = z.object({
  type: z.literal("ORDERING"),
  correctOrder: z.array(OptionIdSchema).min(2).max(20),
});

/** Checked by validateAnswerV2 with the safe parser in expr.ts. */
const ExpressionSpecSchema = z.object({
  type: z.literal("EXPRESSION"),
  target: finite(),
  allowedNumbers: z.array(finite()),
  allowedOps: z.array(z.enum(EXPRESSION_OPS)),
});

/** Declared for authoring; the scene reports completion (Phase 4). */
const SceneCompletionSpecSchema = z.object({
  type: z.literal("SCENE_COMPLETION"),
  minimalMoves: z.number().int().positive().optional(),
});

export const AnswerSpecSchema = z
  .discriminatedUnion("type", [
    NumericSpecSchema,
    EstimateSpecSchema,
    ChoiceSpecSchema,
    MultiValueSpecSchema,
    OrderingSpecSchema,
    ExpressionSpecSchema,
    SceneCompletionSpecSchema,
  ])
  .superRefine((spec, ctx) => {
    if (spec.type === "ESTIMATE" && !(spec.min <= spec.truth && spec.truth <= spec.max)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ESTIMATE needs min <= truth <= max" });
    }
    if (spec.type === "ORDERING" && new Set(spec.correctOrder).size !== spec.correctOrder.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ORDERING ids must be unique" });
    }
  });
export type AnswerSpec = z.infer<typeof AnswerSpecSchema>;
export type AnswerSpecType = AnswerSpec["type"];

/** Spec types validateAnswerV2 can check today. */
export const SUPPORTED_ANSWER_SPEC_TYPES = [
  "NUMERIC",
  "ESTIMATE",
  "CHOICE",
  "MULTI_VALUE",
  "ORDERING",
  "EXPRESSION",
] as const satisfies ReadonlyArray<AnswerSpecType>;

// ---------------------------------------------------------------------------
// Wrong-answer rules
// ---------------------------------------------------------------------------

/**
 * Parsed form of WrongAnswerRule.match:
 *   "10100"            exact value (numbers compared numerically)
 *   "regex:^1\d{4}$"   regex tested against the trimmed raw input
 *   "gt:correct"       above the correct value (ESTIMATE: above max)
 *   "lt:correct"       below the correct value (ESTIMATE: below min)
 *   "gt:500" / "lt:1000"  above / below a literal number
 *   "offByFactor:2"    input × n or input ÷ n would have been correct
 *   "choice:B"         picked option B
 */
export type MatchRule =
  | { kind: "exact"; value: string }
  | { kind: "regex"; regex: RegExp }
  | { kind: "gt" | "lt"; than: "correct" | number }
  | { kind: "offByFactor"; factor: number }
  | { kind: "choice"; id: string };

export function parseMatchRule(match: string): MatchRule | null {
  const m = match.match(/^(regex|gt|lt|offByFactor|choice):(.*)$/s);
  if (!m) {
    return match.trim() === "" ? null : { kind: "exact", value: match };
  }
  const [, prefix, rest] = m;
  switch (prefix) {
    case "regex":
      try {
        return { kind: "regex", regex: new RegExp(rest) };
      } catch {
        return null;
      }
    case "gt":
    case "lt": {
      if (rest === "correct") return { kind: prefix, than: "correct" };
      const n = Number(rest);
      return rest.trim() !== "" && Number.isFinite(n) ? { kind: prefix, than: n } : null;
    }
    case "offByFactor": {
      const n = Number(rest);
      return Number.isFinite(n) && n > 0 && n !== 1 ? { kind: "offByFactor", factor: n } : null;
    }
    case "choice":
      return rest.length > 0 ? { kind: "choice", id: rest } : null;
    default:
      return null;
  }
}

const MatchSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((m) => parseMatchRule(m) !== null, { message: "invalid wrong-answer match rule" });

const NestedRuleSchema = z.object({ match: MatchSchema, feedback: BiSchema });

/**
 * Canonical shape is the rubric's `{ match, feedback: { en, zh } }`. The README sketch
 * wrote `{ match, en, zh }`; that flat form is accepted and normalised.
 */
export const WrongAnswerRuleSchema = z.union([
  NestedRuleSchema,
  z
    .object({ match: MatchSchema, en: z.string().min(1), zh: z.string().min(1) })
    .transform((r) => ({ match: r.match, feedback: { en: r.en, zh: r.zh } })),
]);
export type WrongAnswerRule = z.infer<typeof NestedRuleSchema>;

export const WrongAnswerRulesSchema = z.array(WrongAnswerRuleSchema).max(30);

// ---------------------------------------------------------------------------
// Solution tags
// ---------------------------------------------------------------------------

export const SOLUTION_TAGS = [
  "draw",
  "pair",
  "table",
  "guess_check",
  "simulate",
  "algebra",
  "pattern",
  "work_backwards",
  "other",
] as const;
export const SolutionTagSchema = z.enum(SOLUTION_TAGS);
export type SolutionTag = z.infer<typeof SolutionTagSchema>;
export const SolutionTagsSchema = z.array(SolutionTagSchema).max(SOLUTION_TAGS.length);

// ---------------------------------------------------------------------------
// validateAnswerV2
// ---------------------------------------------------------------------------

export type AnswerInput = string | readonly string[];

export type AnswerV2FailureReason = "unsupported" | "empty" | "unparseable";

export type AnswerV2Detail =
  | {
      type: "ESTIMATE";
      value: number;
      truth: number;
      min: number;
      max: number;
      /** |value − truth| / |truth| (absolute difference when truth is 0). */
      distance: number;
      direction: "low" | "inside" | "high";
    }
  | { type: "MULTI_VALUE"; expectedCount: number; givenCount: number }
  | {
      type: "EXPRESSION";
      /** Parse / evaluation error, when the expression could not be read. */
      error: ExprErrorCode | null;
      value: number | null;
      numbersUsed: number[];
      /** Did it use exactly `allowedNumbers` (each once)? */
      numbersOk: boolean;
      /** Operators used that are not in `allowedOps`. */
      disallowedOps: ExprOp[];
    };

export interface AnswerV2Result {
  isCorrect: boolean;
  /** Set when the input could not be judged at all. */
  reason?: AnswerV2FailureReason;
  detail?: AnswerV2Detail;
}

/** EXPRESSION answers compare the evaluated value with the target within this. */
export const EXPRESSION_TOLERANCE = 1e-9;

/** v1 numeric tolerance, kept for NUMERIC specs without an explicit tolerance. */
export const DEFAULT_NUMERIC_TOLERANCE = 0.0001;

const UNICODE_MINUS = /[−‒–﹣－]/g;
const ESTIMATE_PREFIX = /^(?:~|≈|about|around|approx\.?|approximately|roughly|大约|大概|约)\s*/i;

/** v2 pre-normalisation applied before the v1 helpers: Unicode minus → "-". */
function preNormalise(s: string): string {
  return s.trim().replace(UNICODE_MINUS, "-");
}

/** Parses one number for v2. Empty input and non-finite values are rejected. */
export function parseNumberV2(raw: string): number | null {
  const s = preNormalise(raw);
  if (s === "") return null;
  const n = parseNumberLike(s);
  return n !== null && Number.isFinite(n) ? n : null;
}

function parseEstimate(raw: string): number | null {
  return parseNumberV2(preNormalise(raw).replace(ESTIMATE_PREFIX, ""));
}

function singleInput(input: AnswerInput): string | null {
  if (typeof input === "string") return input;
  return input.length === 1 ? input[0] : null;
}

/** Explicit list separators. Whitespace is only a separator when none of these occur. */
const LIST_SEPARATOR = /\s*(?:(?<![a-z])and(?![a-z])|和|&|,|，|;|；|、)\s*/i;

/**
 * Splits a multi-value answer: "1 and 5", "1和5", "1, 5", "5 & 1", "1 5".
 * Explicit separators win, so "1 3/4 and 2" keeps the mixed number intact.
 */
export function splitMultiValue(input: AnswerInput): string[] {
  const parts =
    typeof input === "string"
      ? LIST_SEPARATOR.test(input)
        ? input.split(new RegExp(LIST_SEPARATOR.source, "gi"))
        : input.trim().split(/\s+/)
      : [...input];
  return parts.map((p) => preNormalise(p)).filter((p) => p !== "");
}

/** Splits an ordering answer: array, "A > B > C" or "A, B, C". */
export function splitOrdering(input: AnswerInput): string[] {
  const parts = typeof input === "string" ? input.split(/[>,，]/) : [...input];
  return parts.map((p) => p.trim()).filter((p) => p !== "");
}

/** Equality for one multi-value token: numerically when both parse, else normalised text. */
function sameValue(a: string, b: string): boolean {
  const na = parseNumberV2(a);
  const nb = parseNumberV2(b);
  if (na !== null && nb !== null) return Math.abs(na - nb) < DEFAULT_NUMERIC_TOLERANCE;
  return normalizeAnswer(preNormalise(a)) === normalizeAnswer(preNormalise(b));
}

function sameValueList(given: string[], expected: readonly string[], orderMatters: boolean): boolean {
  if (given.length !== expected.length) return false;
  if (orderMatters) return given.every((g, i) => sameValue(g, expected[i]));
  const used = new Array<boolean>(given.length).fill(false);
  return expected.every((e) => {
    const idx = given.findIndex((g, i) => !used[i] && sameValue(g, e));
    if (idx === -1) return false;
    used[idx] = true;
    return true;
  });
}

function isNumberCorrect(n: number, spec: AnswerSpec): boolean {
  if (spec.type === "NUMERIC") {
    return Math.abs(n - spec.value) <= (spec.tolerance ?? DEFAULT_NUMERIC_TOLERANCE);
  }
  if (spec.type === "ESTIMATE") return spec.min <= n && n <= spec.max;
  return false;
}

/**
 * Checks an answer against a v2 AnswerSpec.
 *
 * Never throws for user input: SCENE_COMPLETION (judged by the scene) comes back as
 * `{ isCorrect: false, reason: "unsupported" }`; blank input as `reason: "empty"`.
 * EXPRESSION is correct when the value equals `target` (±1e-9), the literals are
 * exactly `allowedNumbers` (each once) and every operator is in `allowedOps`.
 */
export function validateAnswerV2(input: AnswerInput, spec: AnswerSpec): AnswerV2Result {
  const isBlank = typeof input === "string" ? input.trim() === "" : input.every((s) => s.trim() === "");
  if (isBlank) return { isCorrect: false, reason: "empty" };

  switch (spec.type) {
    case "NUMERIC": {
      const one = singleInput(input);
      const n = one === null ? null : parseNumberV2(one);
      if (n === null) return { isCorrect: false, reason: "unparseable" };
      return { isCorrect: isNumberCorrect(n, spec) };
    }

    case "ESTIMATE": {
      const one = singleInput(input);
      const n = one === null ? null : parseEstimate(one);
      if (n === null) return { isCorrect: false, reason: "unparseable" };
      const isCorrect = isNumberCorrect(n, spec);
      const diff = Math.abs(n - spec.truth);
      return {
        isCorrect,
        detail: {
          type: "ESTIMATE",
          value: n,
          truth: spec.truth,
          min: spec.min,
          max: spec.max,
          distance: spec.truth === 0 ? diff : diff / Math.abs(spec.truth),
          direction: isCorrect ? "inside" : n < spec.min ? "low" : "high",
        },
      };
    }

    case "CHOICE": {
      const one = singleInput(input);
      return { isCorrect: one !== null && one.trim() === spec.correctId };
    }

    case "MULTI_VALUE": {
      const given = splitMultiValue(input);
      return {
        isCorrect: sameValueList(given, spec.values, spec.orderMatters === true),
        detail: { type: "MULTI_VALUE", expectedCount: spec.values.length, givenCount: given.length },
      };
    }

    case "ORDERING": {
      const given = splitOrdering(input);
      const isCorrect =
        given.length === spec.correctOrder.length && given.every((g, i) => g === spec.correctOrder[i]);
      return { isCorrect };
    }

    case "EXPRESSION": {
      const one = singleInput(input);
      if (one === null) return { isCorrect: false, reason: "unparseable" };
      const parsed = evaluateExpression(one, { allowedOps: spec.allowedOps });
      if (!parsed.ok) {
        return {
          isCorrect: false,
          reason: "unparseable",
          detail: {
            type: "EXPRESSION",
            error: parsed.error.code,
            value: null,
            numbersUsed: [],
            numbersOk: false,
            disallowedOps: [],
          },
        };
      }
      const numbersOk = sameMultiset(parsed.numbersUsed, spec.allowedNumbers);
      const disallowedOps = parsed.opsUsed.filter((op) => !spec.allowedOps.includes(op));
      const valueOk = Math.abs(parsed.value - spec.target) <= EXPRESSION_TOLERANCE;
      return {
        isCorrect: valueOk && numbersOk && disallowedOps.length === 0,
        detail: {
          type: "EXPRESSION",
          error: null,
          value: parsed.value,
          numbersUsed: parsed.numbersUsed,
          numbersOk,
          disallowedOps,
        },
      };
    }

    case "SCENE_COMPLETION":
      return { isCorrect: false, reason: "unsupported" };
  }
}

// ---------------------------------------------------------------------------
// wrongAnswerFeedbackFor
// ---------------------------------------------------------------------------

function inputNumber(input: AnswerInput, spec: AnswerSpec): number | null {
  const one = singleInput(input);
  if (one === null) return null;
  if (spec.type === "EXPRESSION") {
    const r = evaluateExpression(one, { allowedOps: spec.allowedOps });
    return r.ok ? r.value : null;
  }
  return spec.type === "ESTIMATE" ? parseEstimate(one) : parseNumberV2(one);
}

function ruleMatches(rule: MatchRule, input: AnswerInput, spec: AnswerSpec): boolean {
  switch (rule.kind) {
    case "regex": {
      const raw = typeof input === "string" ? input.trim() : input.join(", ");
      return rule.regex.test(raw);
    }

    case "choice": {
      const one = singleInput(input);
      return one !== null && one.trim() === rule.id;
    }

    case "exact": {
      if (spec.type === "MULTI_VALUE") {
        return sameValueList(splitMultiValue(input), splitMultiValue(rule.value), spec.orderMatters === true);
      }
      if (spec.type === "ORDERING") {
        const given = splitOrdering(input);
        const want = splitOrdering(rule.value);
        return given.length === want.length && given.every((g, i) => g === want[i]);
      }
      if (spec.type === "CHOICE") {
        const one = singleInput(input);
        return one !== null && one.trim() === rule.value.trim();
      }
      const one = singleInput(input);
      return one !== null && sameValue(one, rule.value);
    }

    case "gt":
    case "lt": {
      const n = inputNumber(input, spec);
      if (n === null) return false;
      let bound: number;
      if (rule.than !== "correct") {
        bound = rule.than;
      } else if (spec.type === "NUMERIC") {
        bound = spec.value;
      } else if (spec.type === "ESTIMATE") {
        bound = rule.kind === "gt" ? spec.max : spec.min;
      } else if (spec.type === "EXPRESSION") {
        bound = spec.target;
      } else {
        return false;
      }
      return rule.kind === "gt" ? n > bound : n < bound;
    }

    case "offByFactor": {
      const n = inputNumber(input, spec);
      if (n === null) return false;
      return isNumberCorrect(n / rule.factor, spec) || isNumberCorrect(n * rule.factor, spec);
    }
  }
}

/**
 * Returns the first rule whose `match` fits a WRONG answer, or null. A correct answer
 * never gets wrong-answer feedback, and unparseable rules are skipped.
 */
export function wrongAnswerFeedbackFor(
  input: AnswerInput,
  spec: AnswerSpec,
  rules: readonly WrongAnswerRule[]
): WrongAnswerRule | null {
  if (validateAnswerV2(input, spec).isCorrect) return null;
  for (const rule of rules) {
    const parsed = parseMatchRule(rule.match);
    if (parsed && ruleMatches(parsed, input, spec)) return rule;
  }
  return null;
}
