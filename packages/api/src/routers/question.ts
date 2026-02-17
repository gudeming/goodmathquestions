import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../trpc";
import { validateAnswer } from "@gmq/math-engine";

export const questionRouter = createTRPCRouter({
  // Get all published questions with filters
  list: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        difficulty: z.string().optional(),
        ageGroup: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, category, difficulty, ageGroup } = input;

      const questions = await ctx.db.question.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          isPublished: true,
          ...(category && { category: category as any }),
          ...(difficulty && { difficulty: difficulty as any }),
          ...(ageGroup && { ageGroup: ageGroup as any }),
        },
        orderBy: { sortOrder: "asc" },
        select: {
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
          tags: { include: { tag: true } },
          _count: {
            select: {
              submissions: true,
              comments: true,
              likes: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (questions.length > limit) {
        const nextItem = questions.pop();
        nextCursor = nextItem?.id;
      }

      return { questions, nextCursor };
    }),

  // Get single question by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const question = await ctx.db.question.findUnique({
        where: { id: input.id, isPublished: true },
        select: {
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
          tags: { include: { tag: true } },
          _count: {
            select: {
              submissions: true,
              comments: true,
              likes: true,
            },
          },
        },
      });

      if (!question) {
        throw new Error("Question not found");
      }

      return question;
    }),

  // Check answer for guests (no XP, no submission record)
  checkAnswer: publicProcedure
    .input(
      z.object({
        questionId: z.string(),
        answer: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.db.question.findUnique({
        where: { id: input.questionId, isPublished: true },
        select: {
          answer: true,
          answerExplainEn: true,
          answerExplainZh: true,
        },
      });

      if (!question) {
        throw new Error("Question not found");
      }

      const isCorrect = validateAnswer(input.answer, question.answer);

      return {
        isCorrect,
        explanation: isCorrect
          ? {
              en: question.answerExplainEn ?? null,
              zh: question.answerExplainZh ?? null,
            }
          : null,
      };
    }),

  // Submit an answer
  submitAnswer: protectedProcedure
    .input(
      z.object({
        questionId: z.string(),
        answer: z.string(),
        timeSpent: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.db.question.findUnique({
        where: { id: input.questionId },
        select: {
          answer: true,
          difficulty: true,
          answerExplainEn: true,
          answerExplainZh: true,
        },
      });

      if (!question) {
        throw new Error("Question not found");
      }

      const isCorrect = validateAnswer(input.answer, question.answer);

      // Calculate XP based on difficulty and correctness
      const xpMap = { EASY: 10, MEDIUM: 25, HARD: 50, CHALLENGE: 100 };
      const xpEarned = isCorrect ? xpMap[question.difficulty] : 0;

      // Count previous attempts
      const attemptCount = await ctx.db.submission.count({
        where: {
          userId: ctx.session.user.id,
          questionId: input.questionId,
        },
      });

      // Create submission
      const submission = await ctx.db.submission.create({
        data: {
          userId: ctx.session.user.id,
          questionId: input.questionId,
          answer: input.answer,
          isCorrect,
          timeSpent: input.timeSpent,
          xpEarned,
          attempt: attemptCount + 1,
        },
      });

      // Award XP if correct
      if (isCorrect && xpEarned > 0) {
        const user = await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: {
            xp: { increment: xpEarned },
            lastActiveAt: new Date(),
          },
        });

        // Check for level up (every 100 XP = 1 level)
        const newLevel = Math.floor(user.xp / 100) + 1;
        if (newLevel > user.level) {
          await ctx.db.user.update({
            where: { id: ctx.session.user.id },
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
      };
    }),

  // Like a question
  toggleLike: protectedProcedure
    .input(z.object({ questionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.questionLike.findUnique({
        where: {
          userId_questionId: {
            userId: ctx.session.user.id,
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
          userId: ctx.session.user.id,
          questionId: input.questionId,
        },
      });
      return { liked: true };
    }),
});
