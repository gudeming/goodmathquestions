import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../trpc";
import { QuestionKind } from "@gmq/db";
import { publicQuestionSelect, toPublicQuestion } from "../lib/question-public";
import { AnswerInputSchema, answerToText, judgeAnswer } from "../lib/answer-check";

const SlugSchema = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** aha (Act 3) is part of the reveal, so it is only sent after a correct answer. */
function ahaOf(q: { ahaEn: string | null; ahaZh: string | null }) {
  return q.ahaEn || q.ahaZh ? { en: q.ahaEn ?? null, zh: q.ahaZh ?? null } : null;
}

async function resolveSessionUserId(ctx: {
  session: { user: { id: string; email?: string | null } };
  db: {
    user: {
      findUnique: (args: any) => Promise<{ id: string } | null>;
    };
  };
}): Promise<string> {
  const sessionUserId = ctx.session.user.id;
  const existingById = await ctx.db.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true },
  });
  if (existingById) {
    return existingById.id;
  }

  const email = ctx.session.user.email;
  if (email) {
    const existingByEmail = await ctx.db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingByEmail) {
      return existingByEmail.id;
    }
  }

  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Session is stale. Please log in again.",
  });
}

/** Server-only fields needed to judge an answer. */
const judgedQuestionSelect = {
  id: true,
  kind: true,
  answer: true,
  answerRule: true,
  wrongAnswerFeedback: true,
  answerExplainEn: true,
  answerExplainZh: true,
  ahaEn: true,
  ahaZh: true,
} as const;

export const questionRouter = createTRPCRouter({
  // Get all published questions with filters
  list: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        difficulty: z.string().optional(),
        ageGroup: z.string().optional(),
        kind: z.nativeEnum(QuestionKind).optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, category, difficulty, ageGroup, kind } = input;

      const questions = await ctx.db.question.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          isPublished: true,
          ...(category && { category: category as any }),
          ...(difficulty && { difficulty: difficulty as any }),
          ...(ageGroup && { ageGroup: ageGroup as any }),
          ...(kind && { kind }),
        },
        orderBy: { sortOrder: "asc" },
        select: publicQuestionSelect,
      });

      let nextCursor: string | undefined;
      if (questions.length > limit) {
        const nextItem = questions.pop();
        nextCursor = nextItem?.id;
      }

      return { questions: questions.map(toPublicQuestion), nextCursor };
    }),

  // Get single question by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const question = await ctx.db.question.findUnique({
        where: { id: input.id, isPublished: true },
        select: publicQuestionSelect,
      });

      if (!question) {
        throw new Error("Question not found");
      }

      return toPublicQuestion(question);
    }),

  // Get a single published question by its stable slug (v2 hero questions)
  bySlug: publicProcedure
    .input(z.object({ slug: SlugSchema }))
    .query(async ({ ctx, input }) => {
      const question = await ctx.db.question.findFirst({
        where: { slug: input.slug, isPublished: true },
        select: publicQuestionSelect,
      });
      if (!question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      }
      return toPublicQuestion(question);
    }),

  // Published questions of one collection ("world"), in authored order
  listByCollection: publicProcedure
    .input(z.object({ slug: SlugSchema }))
    .query(async ({ ctx, input }) => {
      const collection = await ctx.db.collection.findUnique({
        where: { slug: input.slug },
        select: {
          id: true,
          slug: true,
          titleEn: true,
          titleZh: true,
          descEn: true,
          descZh: true,
          emoji: true,
          colorToken: true,
          sortOrder: true,
        },
      });
      if (!collection) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
      }
      const questions = await ctx.db.question.findMany({
        where: { collectionId: collection.id, isPublished: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: publicQuestionSelect,
      });
      return { collection, questions: questions.map(toPublicQuestion) };
    }),

  // Check answer for guests (no XP, no submission record)
  checkAnswer: publicProcedure
    .input(
      z.object({
        questionId: z.string(),
        answer: AnswerInputSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.db.question.findUnique({
        where: { id: input.questionId, isPublished: true },
        select: judgedQuestionSelect,
      });

      if (!question) {
        throw new Error("Question not found");
      }

      const { isCorrect, feedback, estimate } = judgeAnswer(question, input.answer);

      return {
        isCorrect,
        explanation: isCorrect
          ? {
              en: question.answerExplainEn ?? null,
              zh: question.answerExplainZh ?? null,
            }
          : null,
        // v2 only (null for DRILL): targeted feedback for a wrong answer,
        // estimate direction, and the aha after a correct answer.
        feedback,
        estimate,
        aha: isCorrect ? ahaOf(question) : null,
      };
    }),

  // Submit an answer
  submitAnswer: protectedProcedure
    .input(
      z.object({
        questionId: z.string(),
        answer: AnswerInputSchema,
        timeSpent: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveSessionUserId(ctx as any);

      const question = await ctx.db.question.findUnique({
        where: { id: input.questionId },
        select: { ...judgedQuestionSelect, difficulty: true },
      });

      if (!question) {
        throw new Error("Question not found");
      }

      const { isCorrect, feedback, estimate } = judgeAnswer(question, input.answer);
      const answerText = answerToText(input.answer);

      // Calculate XP based on difficulty and correctness
      const xpMap = { EASY: 10, MEDIUM: 25, HARD: 50, CHALLENGE: 100 };
      const xpEarned = isCorrect ? xpMap[question.difficulty] : 0;

      // Count previous attempts
      const attemptCount = await ctx.db.submission.count({
        where: {
          userId,
          questionId: input.questionId,
        },
      });

      // Create submission
      const submission = await ctx.db.submission.create({
        data: {
          userId,
          questionId: input.questionId,
          answer: answerText,
          isCorrect,
          timeSpent: input.timeSpent,
          xpEarned,
          attempt: attemptCount + 1,
        },
      });

      // Award XP if correct
      if (isCorrect && xpEarned > 0) {
        const user = await ctx.db.user.update({
          where: { id: userId },
          data: {
            xp: { increment: xpEarned },
            lastActiveAt: new Date(),
          },
        });

        // Check for level up (every 100 XP = 1 level)
        const newLevel = Math.floor(user.xp / 100) + 1;
        if (newLevel > user.level) {
          await ctx.db.user.update({
            where: { id: userId },
            data: { level: newLevel },
          });
        }
      }

      return {
        isCorrect,
        xpEarned,
        attempt: attemptCount + 1,
        explanation: isCorrect
          ? {
              en: question.answerExplainEn ?? null,
              zh: question.answerExplainZh ?? null,
            }
          : null,
        feedback,
        estimate,
        aha: isCorrect ? ahaOf(question) : null,
      };
    }),

  // Like a question
  toggleLike: protectedProcedure
    .input(z.object({ questionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveSessionUserId(ctx as any);

      const existing = await ctx.db.questionLike.findUnique({
        where: {
          userId_questionId: {
            userId,
            questionId: input.questionId,
          },
        },
      });

      if (existing) {
        await ctx.db.questionLike.delete({ where: { id: existing.id } });
        return { liked: false };
      }

      await ctx.db.questionLike.create({
        data: {
          userId,
          questionId: input.questionId,
        },
      });
      return { liked: true };
    }),
});
