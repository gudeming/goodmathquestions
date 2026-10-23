import { z } from "zod";
import {
  AnswerSpecSchema,
  BiSchema,
  GuessOptionSchema,
  WrongAnswerRulesSchema,
  type AnswerInput,
  type Bi,
  type GuessOption,
} from "@gmq/math-engine";
import { publicSceneConfig } from "@gmq/animation-engine";
import { judgeAnswer, type AnswerJudgement } from "./answer-check";

/**
 * "Try another number" variants (Question.variants, written by the seed from hero blueprints).
 * The column holds answers and feedback, so it is only read here: clients get `PublicVariant`.
 */
const StoredVariantSchema = z.object({
  id: z.string().min(1).max(64),
  params: z.record(z.number()),
  prompt: BiSchema,
  scene: z.unknown(),
  answer: AnswerSpecSchema,
  answerText: z.string(),
  choices: z.array(GuessOptionSchema).nullable(),
  hints: z.array(BiSchema),
  wrongAnswers: WrongAnswerRulesSchema,
  explanation: BiSchema,
  aha: BiSchema,
});
export type StoredVariant = z.infer<typeof StoredVariantSchema>;

export const VariantIdSchema = z.string().min(1).max(64);

/** What a client may see of a variant before solving it. */
export interface PublicVariant {
  id: string;
  params: Record<string, number>;
  prompt: Bi;
  scene: unknown;
  hints: Bi[];
  choices: GuessOption[] | null;
}

/** Every valid variant of a question; invalid entries are logged and dropped. */
export function parseVariants(raw: unknown, questionId: string): StoredVariant[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const parsed = StoredVariantSchema.safeParse(entry);
    if (parsed.success) return [parsed.data];
    console.error(`[variant] invalid variant on question ${questionId}; hiding it`);
    return [];
  });
}

export function findVariant(raw: unknown, questionId: string, variantId: string): StoredVariant | null {
  return parseVariants(raw, questionId).find((v) => v.id === variantId) ?? null;
}

export function toPublicVariant(v: StoredVariant): PublicVariant {
  return { id: v.id, params: v.params, prompt: v.prompt, scene: publicSceneConfig(v.scene), hints: v.hints, choices: v.choices };
}

/** Judges an answer to a variant exactly like the standard version (validateAnswerV2 + its wrong-answer rules). */
export function judgeVariant(questionId: string, variant: StoredVariant, input: AnswerInput): AnswerJudgement {
  return judgeAnswer(
    { id: `${questionId}#${variant.id}`, kind: "PUZZLE", answer: variant.answerText, answerRule: variant.answer, wrongAnswerFeedback: variant.wrongAnswers },
    input
  );
}
