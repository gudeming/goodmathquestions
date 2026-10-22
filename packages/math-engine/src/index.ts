export { validateAnswer } from "./validator";
export { generateHints } from "./hints";
export {
  buildAdaptiveQuestion,
  recommendNextLevel,
  inferDomainFromTag,
  KNOWLEDGE_POINT_TAXONOMY,
  type MasteryDomain,
  type MasteryProfile,
  type AdaptiveQuestion,
  type KnowledgePointDef,
} from "./adaptive";
export type { MathCategory, DifficultyLevel, AgeGroup } from "./types";
export {
  scoreQuestionHeuristically,
  isEmptyNumberLine,
  countNumbers,
  countOperators,
  countSentences,
  RUBRIC_FLAGS,
  RUBRIC_MAX_SCORE,
  RUBRIC_PENALTIES,
  DEFAULT_HINT_TEXTS,
  DEFAULT_FUN_FACT_PREFIX,
  HERO_KEYWORD_PATTERN,
  type RubricFlag,
  type RubricQuestionInput,
  type RubricResult,
  type SceneSource,
} from "./rubric";
