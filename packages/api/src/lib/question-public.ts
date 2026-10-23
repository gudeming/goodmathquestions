import type { Prisma } from "@gmq/db";
import { publicSceneConfig } from "@gmq/animation-engine";
import {
  ChoicesSchema,
  GuessConfigSchema,
  SolutionTagsSchema,
  type GuessConfig,
  type SolutionTag,
} from "@gmq/math-engine";

/**
 * Fields a client may see (`animationConfig` minus its answer fields, see toPublicQuestion). Never add `answer`, `answerRule`, `wrongAnswerFeedback`,
 * `answerExplain*` or `aha*` here: they give away the answer (aha and the
 * explanation are returned by checkAnswer / submitAnswer after a correct answer).
 */
export const publicQuestionSelect = {
  id: true,
  titleEn: true,
  titleZh: true,
  contentEn: true,
  contentZh: true,
  difficulty: true,
  category: true,
  ageGroup: true,
  hints: true,
  animationConfig: true,
  funFactEn: true,
  funFactZh: true,
  isPublished: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  // v2
  kind: true,
  answerType: true,
  slug: true,
  collectionId: true,
  hookEn: true,
  hookZh: true,
  guessConfig: true,
  choices: true,
  extensionEn: true,
  extensionZh: true,
  discussionPromptEn: true,
  discussionPromptZh: true,
  solutionTags: true,
  // How many "try another number" variants exist (the variants themselves hold answers: question.variants).
  variantCount: true,
  tags: { include: { tag: true } },
  _count: {
    select: {
      submissions: true,
      comments: true,
      likes: true,
    },
  },
} satisfies Prisma.QuestionSelect;

export type PublicQuestionRow = Prisma.QuestionGetPayload<{ select: typeof publicQuestionSelect }>;

/** A CHOICE option as the client sees it: `isCorrect` is stripped. */
export interface PublicChoice {
  id: string;
  en: string;
  zh: string;
}

export type PublicQuestion = Omit<PublicQuestionRow, "guessConfig" | "choices" | "solutionTags"> & {
  guessConfig: GuessConfig | null;
  choices: PublicChoice[] | null;
  solutionTags: SolutionTag[];
};

function parseOrNull<T>(
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } },
  value: unknown,
  label: string,
  questionId: string
): T | null {
  if (value === null || value === undefined) return null;
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  console.error(`[question] invalid ${label} on question ${questionId}; hiding it from the client`);
  return null;
}

/** Validates the v2 JSON columns and strips anything the client must not see. */
export function toPublicQuestion(row: PublicQuestionRow): PublicQuestion {
  const choices = parseOrNull(ChoicesSchema, row.choices, "choices", row.id);
  const solutionTags = parseOrNull(SolutionTagsSchema, row.solutionTags, "solutionTags", row.id);
  return {
    ...row,
    // The scene's answer fields (e.g. clock_overlap.overlaps) only come with the reveal.
    animationConfig: publicSceneConfig(row.animationConfig),
    guessConfig: parseOrNull(GuessConfigSchema, row.guessConfig, "guessConfig", row.id),
    choices: choices ? choices.map(({ id, en, zh }) => ({ id, en, zh })) : null,
    solutionTags: solutionTags ?? [],
  };
}
