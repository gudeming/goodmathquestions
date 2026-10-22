import type { Prisma, QuestionKind } from "@gmq/db";
import {
  AnswerSpecSchema,
  WrongAnswerRulesSchema,
  validateAnswer,
  validateAnswerV2,
  wrongAnswerFeedbackFor,
  type AnswerInput,
  type Bi,
} from "@gmq/math-engine";
import { z } from "zod";

/** Answer payload accepted by checkAnswer / submitAnswer. Arrays are for MULTI_VALUE / ORDERING. */
export const AnswerInputSchema = z.union([
  z.string().max(500),
  z.array(z.string().max(100)).min(1).max(20),
]);

/** Text form of an answer, for v1 and for Submission.answer. */
export function answerToText(input: AnswerInput): string {
  return typeof input === "string" ? input : input.join(", ");
}

export type EstimateFeedback =
  | { direction: "low" | "high" }
  // The truth is only revealed once the estimate is accepted.
  | { direction: "inside"; truth: number; distance: number };

export interface AnswerJudgement {
  isCorrect: boolean;
  engine: "v1" | "v2";
  feedback: Bi | null;
  estimate: EstimateFeedback | null;
}

export interface JudgeableQuestion {
  id: string;
  kind: QuestionKind;
  answer: string;
  answerRule: Prisma.JsonValue | null;
  wrongAnswerFeedback: Prisma.JsonValue;
}

/**
 * DRILL questions (and any question without a valid answerRule) use v1 exactly as
 * before. Other kinds use validateAnswerV2 plus the question's wrong-answer rules.
 */
export function judgeAnswer(question: JudgeableQuestion, input: AnswerInput): AnswerJudgement {
  const v1 = (): AnswerJudgement => ({
    isCorrect: validateAnswer(answerToText(input), question.answer),
    engine: "v1",
    feedback: null,
    estimate: null,
  });

  if (question.kind === "DRILL" || question.answerRule === null) return v1();

  const spec = AnswerSpecSchema.safeParse(question.answerRule);
  if (!spec.success) {
    console.error(`[answer] invalid answerRule on question ${question.id}; falling back to v1`);
    return v1();
  }

  const result = validateAnswerV2(input, spec.data);
  if (result.reason === "unsupported") return v1();

  let feedback: Bi | null = null;
  if (!result.isCorrect) {
    const rules = WrongAnswerRulesSchema.safeParse(question.wrongAnswerFeedback);
    if (rules.success) {
      feedback = wrongAnswerFeedbackFor(input, spec.data, rules.data)?.feedback ?? null;
    } else {
      console.error(`[answer] invalid wrongAnswerFeedback on question ${question.id}; ignoring it`);
    }
  }

  let estimate: EstimateFeedback | null = null;
  if (result.detail?.type === "ESTIMATE") {
    const d = result.detail;
    estimate =
      d.direction === "inside"
        ? { direction: "inside", truth: d.truth, distance: d.distance }
        : { direction: d.direction };
  }

  return { isCorrect: result.isCorrect, engine: "v2", feedback, estimate };
}
