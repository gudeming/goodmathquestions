/**
 * Blueprint -> Prisma `Question` columns. Pure (no client is created), so tests can pin it.
 */
import { Prisma, type AnswerType } from "@prisma/client";
import { expandHeroVariants, type AnswerSpec, type HeroQuestionBlueprint } from "./_template";
import { resolveChoiceOptions } from "./validate";

/** Hero sortOrders start here so they never collide with the legacy rows (1..567) that `questions_only` matches by sortOrder. */
export const HERO_SORT_ORDER_BASE = 10_000;
/** Room for 99 questions per world. */
export const HERO_SORT_ORDER_WORLD_STRIDE = 100;

export function heroSortOrder(worldSortOrder: number, blueprintSortOrder: number): number {
  return HERO_SORT_ORDER_BASE + worldSortOrder * HERO_SORT_ORDER_WORLD_STRIDE + blueprintSortOrder;
}

/** AnswerSpec.type -> AnswerType column. SCENE_COMPLETION has no column value yet; OPEN is the closest. */
export function answerTypeFor(spec: AnswerSpec): AnswerType {
  return spec.type === "SCENE_COMPLETION" ? "OPEN" : spec.type;
}

/** Text for the legacy `answer` column (v1 fallback, admin views). CHOICE stores the correct id. */
export function canonicalAnswerText(spec: AnswerSpec): string {
  switch (spec.type) {
    case "NUMERIC":
      return String(spec.value);
    case "ESTIMATE":
      return String(spec.truth);
    case "CHOICE":
      return spec.correctId;
    case "MULTI_VALUE":
      return spec.values.join(", ");
    case "ORDERING":
      return spec.correctOrder.join(" > ");
    case "EXPRESSION":
      return String(spec.target);
    case "SCENE_COMPLETION":
      return "completed";
  }
}

const json = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

/**
 * The `variants` column: each "try another number" version fully expanded, with the answer
 * text for "show me" and the CHOICE options resolved. Server-only, like `answerRule`.
 */
export function heroVariantsData(bp: HeroQuestionBlueprint) {
  return expandHeroVariants(bp).map((v) => ({
    id: v.id,
    params: v.params,
    prompt: v.prompt,
    scene: v.scene,
    answer: v.answer,
    answerText: canonicalAnswerText(v.answer),
    choices: v.answer.type === "CHOICE" ? (resolveChoiceOptions({ choices: v.choices ?? bp.choices, guess: bp.guess }) ?? null) : null,
    hints: v.hints,
    wrongAnswers: v.wrongAnswers,
    explanation: v.explanation,
    aha: v.aha,
  }));
}

/**
 * Every column a hero question owns. Absent optional JSON (guess, choices) is written as SQL NULL
 * explicitly so re-seeding after removing a guess clears it.
 */
export function heroQuestionData(bp: HeroQuestionBlueprint, opts: { collectionId: string; worldSortOrder: number }) {
  const options = bp.answer.type === "CHOICE" ? resolveChoiceOptions(bp) : null;
  const correctId = bp.answer.type === "CHOICE" ? bp.answer.correctId : null;
  const variants = heroVariantsData(bp);
  return {
    slug: bp.slug,
    kind: bp.kind,
    answerType: answerTypeFor(bp.answer),
    titleEn: bp.title.en,
    titleZh: bp.title.zh,
    hookEn: bp.hook.en,
    hookZh: bp.hook.zh,
    contentEn: bp.prompt.en,
    contentZh: bp.prompt.zh,
    difficulty: bp.difficulty,
    category: bp.category,
    ageGroup: bp.ageGroup,
    answer: canonicalAnswerText(bp.answer),
    answerRule: json(bp.answer),
    answerExplainEn: bp.explanation.en,
    answerExplainZh: bp.explanation.zh,
    guessConfig: bp.guess ? json(bp.guess) : Prisma.DbNull,
    choices: options ? json(options.map((o) => ({ id: o.id, en: o.en, zh: o.zh, isCorrect: o.id === correctId }))) : Prisma.DbNull,
    wrongAnswerFeedback: json(bp.wrongAnswers),
    hints: json(bp.hints),
    animationConfig: json(bp.scene),
    ahaEn: bp.aha.en,
    ahaZh: bp.aha.zh,
    extensionEn: bp.extension.en,
    extensionZh: bp.extension.zh,
    discussionPromptEn: bp.discussionPrompt.en,
    discussionPromptZh: bp.discussionPrompt.zh,
    solutionTags: json(bp.solutionTags),
    funFactEn: bp.funFact?.en ?? null,
    funFactZh: bp.funFact?.zh ?? null,
    variants: json(variants),
    variantCount: variants.length,
    collectionId: opts.collectionId,
    isPublished: true,
    sortOrder: heroSortOrder(opts.worldSortOrder, bp.sortOrder),
  } satisfies Prisma.QuestionUncheckedCreateInput & Prisma.QuestionUncheckedUpdateInput;
}

export type HeroQuestionData = ReturnType<typeof heroQuestionData>;
