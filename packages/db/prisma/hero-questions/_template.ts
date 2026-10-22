/**
 * Authoring template for hero questions (01-question-rubric.md §4).
 *
 * Every hero question is one `HeroQuestionBlueprint` in a `world-*.ts` file. The JSON
 * shapes are typed against the real runtime schemas so a blueprint that compiles is
 * already close to valid; `validate.ts` checks the rest before the seed writes anything.
 */
import type { SceneConfigInput } from "@gmq/animation-engine";
import type { AnswerSpec, Bi, GuessConfig, GuessOption, SolutionTag, WrongAnswerRule } from "@gmq/math-engine";

export type { AnswerSpec, Bi, GuessConfig, GuessOption, SolutionTag, WrongAnswerRule };

/** The six worlds (Collection.slug), in display order. */
export const COLLECTION_SLUGS = [
  "huge-numbers",
  "shapes-that-lie",
  "chance-and-luck",
  "number-magic",
  "patterns-everywhere",
  "impossible-puzzles",
] as const;
export type CollectionSlug = (typeof COLLECTION_SLUGS)[number];

/** Every QuestionKind except DRILL (legacy practice questions). */
export const HERO_KINDS = [
  "PUZZLE",
  "THREE_ACT",
  "ESTIMATION",
  "WODB",
  "WOULD_YOU_RATHER",
  "PATTERN",
  "MAGIC_TRICK",
  "OPEN_MIDDLE",
  "PARADOX",
] as const;
export type HeroKind = (typeof HERO_KINDS)[number];

/** Hero questions are for 8-14 year olds only (rubric anti-pattern 7). */
export const HERO_AGE_GROUPS = ["AGE_8_10", "AGE_10_12", "AGE_12_14"] as const;
export type HeroAgeGroup = (typeof HERO_AGE_GROUPS)[number];

export type HeroDifficulty = "EASY" | "MEDIUM" | "HARD";

export type HeroCategory =
  | "ARITHMETIC"
  | "ALGEBRA"
  | "GEOMETRY"
  | "FRACTIONS"
  | "NUMBER_THEORY"
  | "WORD_PROBLEMS"
  | "LOGIC"
  | "PROBABILITY"
  | "STATISTICS";

export interface HeroQuestionBlueprint {
  /** kebab-case, stable URL (/q/gauss-sum). Unique across all worlds. */
  slug: string;
  collection: CollectionSlug;
  kind: HeroKind;
  ageGroup: HeroAgeGroup;
  difficulty: HeroDifficulty;
  category: HeroCategory;
  /** <= 30 characters; reads like a story title, not a syllabus heading. */
  title: Bi;
  /** Act 1: 1-3 sentences, numbers only when the number is the hook, ends with a question. */
  hook: Bi;
  /** Required for THREE_ACT and ESTIMATION. */
  guess?: GuessConfig;
  /** Must parse with `parseSceneConfig()` and be a v2 (non-legacy) scene type. */
  scene: SceneConfigInput;
  /** Act 2: the formal question. May contain LaTeX. */
  prompt: Bi;
  answer: AnswerSpec;
  /**
   * CHOICE answer options. When omitted, a CHOICE answer reuses `guess.options`
   * (the guess *is* the question, e.g. Monty Hall). `isCorrect` is derived at seed time.
   */
  choices?: GuessOption[];
  /** Progressive: change the angle -> a concrete small move -> almost the method. */
  hints: [Bi, Bi, Bi];
  /** >= 2. Name the likely mistake first, then point the way. Never "wrong". */
  wrongAnswers: WrongAnswerRule[];
  /** <= 4 sentences. */
  explanation: Bi;
  /** <= 2 sentences, <= 240 characters. */
  aha: Bi;
  extension: Bi;
  /** One specific question, not "share your thoughts". */
  discussionPrompt: Bi;
  solutionTags: SolutionTag[];
  /** <= 300 characters. */
  funFact?: Bi;
  /** Order inside the world (1-based). */
  sortOrder: number;
  /** Not stored. "NN/20 — item scores: reason". NN >= 14 to publish. */
  rubricNotes: string;
  /**
   * Exact `titleEn` of a legacy DRILL row this question upgrades. The seed updates that
   * row in place (same id, so links and submissions survive) instead of creating one.
   */
  upgradesLegacyTitleEn?: string;
}
