/**
 * Machine pre-screen for the "good question" rubric.
 *
 * Spec: docs/plans/good-questions-overhaul/01-question-rubric.md §3.1–3.2.
 * This only catches what a machine can judge (default hints, inferred scenes,
 * "Compute ..." openers, one-step arithmetic, age range, fun-fact length).
 * The 10-item human rubric score is the one that counts; this is triage.
 */

/** Every flag the heuristic can raise, in the canonical output order. */
export const RUBRIC_FLAGS = [
  "DEFAULT_HINTS",
  "INFERRED_SCENE",
  "EMPTY_NUMBER_LINE",
  "COMPUTE_PREFIX",
  "NUMBERS_FIRST",
  "ONE_STEP",
  "AGE_OUT_OF_RANGE",
  "LONG_FUN_FACT",
  "DEFAULT_FUN_FACT",
  "NO_WRONG_FEEDBACK",
  "HERO_CANDIDATE",
] as const;

export type RubricFlag = (typeof RUBRIC_FLAGS)[number];

/** Where a question's scene config came from. Only the audit tooling sets this. */
export type SceneSource = "explicit" | "inferred";

/**
 * Minimal structural view of a question. Matches the current `SeedQuestion`
 * shape and leaves room for v2 fields (`wrongAnswerFeedback`) without
 * depending on either.
 */
export interface RubricQuestionInput {
  titleEn?: string;
  contentEn: string;
  ageGroup: string;
  hints?: ReadonlyArray<{ readonly en?: string; readonly zh?: string }>;
  animationConfig?: Readonly<Record<string, unknown>> | null;
  /** Set by the audit when it can tell whether the blueprint had an explicit config. */
  sceneSource?: SceneSource;
  answerExplainEn?: string | null;
  funFactEn?: string | null;
  wrongAnswerFeedback?: ReadonlyArray<unknown> | null;
}

export interface RubricResult {
  /** 0–20; 20 minus penalties, clamped. */
  score: number;
  /** Raised flags in `RUBRIC_FLAGS` order. */
  flags: RubricFlag[];
}

export const RUBRIC_MAX_SCORE = 20;

/** §3.2 penalties. Flags not listed carry no score penalty. */
export const RUBRIC_PENALTIES = {
  DEFAULT_HINTS: 2,
  /** Shared by INFERRED_SCENE and EMPTY_NUMBER_LINE: both zero the same "hands-on" item, so it is charged once. */
  SCENE: 2,
  COMPUTE_PREFIX: 2,
  NUMBERS_FIRST: 1,
  ONE_STEP: 4,
  LONG_FUN_FACT: 1,
  DEFAULT_FUN_FACT: 1,
  AGE_OUT_OF_RANGE: 20,
} as const;

/** The generic hints every seed question currently ships with (mirrors `DEFAULT_HINTS` in the seed bank). */
export const DEFAULT_HINT_TEXTS: ReadonlyArray<{ readonly en: string; readonly zh: string }> = [
  { en: "Break the problem into smaller steps.", zh: "把问题拆成更小的步骤。" },
  { en: "Check whether your final answer is reasonable.", zh: "检查你的最终答案是否合理。" },
];

/** Placeholder fun fact the seed bank uses when a blueprint has none. */
export const DEFAULT_FUN_FACT_PREFIX = "This skill appears in US K-12 pathways";

export const OUT_OF_RANGE_AGE_GROUPS: ReadonlySet<string> = new Set(["AGE_14_16", "AGE_16_18"]);

export const COMPUTE_PREFIX_PATTERN =
  /^(compute|calculate|solve|simplify|find|what is|evaluate|write|round|fill in)\b/i;

/** Words in the stem that suggest hidden structure worth a human look. */
export const HERO_KEYWORD_PATTERN =
  /\b(trick|always|no matter|impossible|how many ways|pattern|magic|fold|double)/i;

export const NUMBERS_FIRST_WINDOW = 40;
export const LONG_FUN_FACT_MAX_CHARS = 300;
export const LONG_FUN_FACT_MAX_SENTENCES = 2;
const ONE_STEP_MAX_NUMBERS = 2;

/** "3,648" and "0.1" are one number each; "3/4" is two. */
const NUMBER_PATTERN = /\d+(?:[.,]\d+)*/g;

/**
 * Arithmetic operators in an explanation. ASCII "-" and "/" are only counted
 * between operands so that "km/h" and "well-known" are not operators.
 */
const OPERATOR_PATTERNS: readonly RegExp[] = [
  /[+−×÷·*^]/g, // + − × ÷ · * ^
  /\\(?:times|div|cdot|frac|sqrt)\b/g,
  /(?<=\s)-(?=\s)|(?<=\d)-(?=\d)/g,
  /(?<=[\d)])\s*\/\s*(?=[\d(])/g,
];

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

const DEFAULT_HINT_SET: ReadonlySet<string> = new Set(
  DEFAULT_HINT_TEXTS.flatMap((h) => [normalizeText(h.en), normalizeText(h.zh)])
);

function hasDefaultHints(hints: RubricQuestionInput["hints"]): boolean {
  if (!hints) return false;
  return hints.some(
    (h) =>
      (h.en !== undefined && DEFAULT_HINT_SET.has(normalizeText(h.en))) ||
      (h.zh !== undefined && DEFAULT_HINT_SET.has(normalizeText(h.zh)))
  );
}

/**
 * The renderer defaults a missing range to [0, 20] and missing highlights to [],
 * so those count as the same empty line.
 */
export function isEmptyNumberLine(config: RubricQuestionInput["animationConfig"]): boolean {
  if (!config || config.type !== "number_journey") return false;
  const { range, highlights } = config;
  const rangeIsDefault =
    range === undefined ||
    (Array.isArray(range) && range.length === 2 && range[0] === 0 && range[1] === 20);
  const highlightsEmpty =
    highlights === undefined || (Array.isArray(highlights) && highlights.length === 0);
  return rangeIsDefault && highlightsEmpty;
}

export function countNumbers(text: string): number {
  return (text.match(NUMBER_PATTERN) ?? []).length;
}

export function countOperators(text: string): number {
  return OPERATOR_PATTERNS.reduce((sum, pattern) => sum + (text.match(pattern) ?? []).length, 0);
}

/** Counts sentence terminators followed by whitespace or end; "44.7" is not a break. */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  const terminators = (trimmed.match(/[.!?。！？]+(?=\s|$)/g) ?? []).length;
  const endsWithTerminator = /[.!?。！？]$/.test(trimmed);
  return terminators + (endsWithTerminator ? 0 : 1);
}

/**
 * Score a question against the machine-checkable parts of the rubric.
 *
 * @returns `score` = 20 − penalties (clamped to 0–20) and the raised flags.
 */
export function scoreQuestionHeuristically(q: RubricQuestionInput): RubricResult {
  const raised = new Set<RubricFlag>();
  const content = q.contentEn.trim();
  const explanation = q.answerExplainEn ?? "";
  const funFact = q.funFactEn ?? "";

  if (hasDefaultHints(q.hints)) raised.add("DEFAULT_HINTS");
  if (q.sceneSource === "inferred") raised.add("INFERRED_SCENE");
  if (isEmptyNumberLine(q.animationConfig)) raised.add("EMPTY_NUMBER_LINE");
  if (COMPUTE_PREFIX_PATTERN.test(content)) raised.add("COMPUTE_PREFIX");
  if (/\d/.test(content.slice(0, NUMBERS_FIRST_WINDOW))) raised.add("NUMBERS_FIRST");
  if (countNumbers(content) <= ONE_STEP_MAX_NUMBERS && countOperators(explanation) === 1) {
    raised.add("ONE_STEP");
  }
  if (OUT_OF_RANGE_AGE_GROUPS.has(q.ageGroup)) raised.add("AGE_OUT_OF_RANGE");
  if (
    funFact.length > LONG_FUN_FACT_MAX_CHARS ||
    countSentences(funFact) > LONG_FUN_FACT_MAX_SENTENCES
  ) {
    raised.add("LONG_FUN_FACT");
  }
  if (funFact.includes(DEFAULT_FUN_FACT_PREFIX)) raised.add("DEFAULT_FUN_FACT");
  if (!q.wrongAnswerFeedback || q.wrongAnswerFeedback.length === 0) raised.add("NO_WRONG_FEEDBACK");
  if (
    !raised.has("COMPUTE_PREFIX") &&
    !raised.has("ONE_STEP") &&
    !raised.has("AGE_OUT_OF_RANGE") &&
    HERO_KEYWORD_PATTERN.test(content)
  ) {
    raised.add("HERO_CANDIDATE");
  }

  let penalty = 0;
  if (raised.has("DEFAULT_HINTS")) penalty += RUBRIC_PENALTIES.DEFAULT_HINTS;
  if (raised.has("INFERRED_SCENE") || raised.has("EMPTY_NUMBER_LINE")) penalty += RUBRIC_PENALTIES.SCENE;
  if (raised.has("COMPUTE_PREFIX")) penalty += RUBRIC_PENALTIES.COMPUTE_PREFIX;
  if (raised.has("NUMBERS_FIRST")) penalty += RUBRIC_PENALTIES.NUMBERS_FIRST;
  if (raised.has("ONE_STEP")) penalty += RUBRIC_PENALTIES.ONE_STEP;
  if (raised.has("LONG_FUN_FACT")) penalty += RUBRIC_PENALTIES.LONG_FUN_FACT;
  if (raised.has("DEFAULT_FUN_FACT")) penalty += RUBRIC_PENALTIES.DEFAULT_FUN_FACT;
  if (raised.has("AGE_OUT_OF_RANGE")) penalty += RUBRIC_PENALTIES.AGE_OUT_OF_RANGE;

  return {
    score: Math.max(0, RUBRIC_MAX_SCORE - penalty),
    flags: RUBRIC_FLAGS.filter((flag) => raised.has(flag)),
  };
}
