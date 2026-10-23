/**
 * Hero questions (Phase 3). seed.ts calls `buildHeroQuestions()`, which validates every
 * blueprint first and throws an aggregated error, so a bad blueprint aborts the seed
 * before any database write.
 */
import type { HeroQuestionBlueprint } from "./_template";
import { validateAllHeroBlueprints } from "./validate";
import { ALL_HERO_BLUEPRINTS, HERO_WORLDS } from "./worlds";

export * from "./_template";
export { HERO_WORLDS, ALL_HERO_BLUEPRINTS, type HeroWorld } from "./worlds";
export {
  validateHeroBlueprint,
  validateAllHeroBlueprints,
  collectHeroBlueprintErrors,
  HeroBlueprintValidationError,
  canonicalCorrectInput,
  resolveChoiceOptions,
  HERO_LIMITS,
} from "./validate";
export { heroQuestionData, heroVariantsData, heroSortOrder, canonicalAnswerText, answerTypeFor, HERO_SORT_ORDER_BASE, type HeroQuestionData } from "./to-prisma";

/** All hero blueprints, validated. Throws `HeroBlueprintValidationError` on any problem. */
export function buildHeroQuestions(): HeroQuestionBlueprint[] {
  validateAllHeroBlueprints(ALL_HERO_BLUEPRINTS, HERO_WORLDS);
  return [...ALL_HERO_BLUEPRINTS];
}
