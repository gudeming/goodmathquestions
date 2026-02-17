import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// Admin emails - in production, use a proper RBAC system
const ADMIN_EMAILS = ["admin@goodmathquestions.com", "demo@example.com"];

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  // For now, check if user email is in admin list
  // In production, add an `isAdmin` field to User model
  if (!ctx.session.user.email || !ADMIN_EMAILS.includes(ctx.session.user.email)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next();
});

const questionInput = z.object({
  titleEn: z.string().min(1).max(200),
  titleZh: z.string().min(1).max(200),
  contentEn: z.string().min(1).max(2000),
  contentZh: z.string().min(1).max(2000),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "CHALLENGE"]),
  category: z.enum([
    "ARITHMETIC", "ALGEBRA", "GEOMETRY", "FRACTIONS",
    "NUMBER_THEORY", "WORD_PROBLEMS", "LOGIC", "PROBABILITY",
    "TRIGONOMETRY", "CALCULUS", "STATISTICS",
  ]),
  ageGroup: z.enum(["AGE_8_10", "AGE_10_12", "AGE_12_14", "AGE_14_16", "AGE_16_18"]),
  answer: z.string().min(1),
  answerExplainEn: z.string().optional(),
  answerExplainZh: z.string().optional(),
  hints: z.array(z.object({ en: z.string(), zh: z.string() })).default([]),
  animationConfig: z.record(z.any()).default({}),
  funFactEn: z.string().optional(),
  funFactZh: z.string().optional(),
  isPublished: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const adminRouter = createTRPCRouter({
  // List all questions (including unpublished)
  listQuestions: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, search } = input;

      const questions = await ctx.db.question.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: search
          ? {
              OR: [
                { titleEn: { contains: search, mode: "insensitive" } },
                { titleZh: { contains: search } },
                { contentEn: { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: { submissions: true, comments: true },
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

  // Create a new question
  createQuestion: adminProcedure
    .input(questionInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.question.create({
        data: {
          ...input,
          hints: input.hints,
          animationConfig: input.animationConfig,
        },
      });
    }),

  // Update a question
  updateQuestion: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: questionInput.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: any = { ...input.data };
      if (input.data.hints) updateData.hints = input.data.hints;
      if (input.data.animationConfig) updateData.animationConfig = input.data.animationConfig;

      return ctx.db.question.update({
        where: { id: input.id },
        data: updateData,
      });
    }),

  // Delete a question
  deleteQuestion: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.question.delete({ where: { id: input.id } });
    }),

  // Toggle publish status
  togglePublish: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.db.question.findUnique({ where: { id: input.id } });
      if (!question) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.question.update({
        where: { id: input.id },
        data: { isPublished: !question.isPublished },
      });
    }),

  // Dashboard stats
  dashboardStats: adminProcedure.query(async ({ ctx }) => {
    const [
      totalQuestions,
      publishedQuestions,
      totalUsers,
      totalSubmissions,
      todaySubmissions,
      totalComments,
    ] = await Promise.all([
      ctx.db.question.count(),
      ctx.db.question.count({ where: { isPublished: true } }),
      ctx.db.user.count(),
      ctx.db.submission.count(),
      ctx.db.submission.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      ctx.db.comment.count(),
    ]);

    return {
      totalQuestions,
      publishedQuestions,
      totalUsers,
      totalSubmissions,
      todaySubmissions,
      totalComments,
    };
  }),

  // Manage classrooms
  listClassrooms: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.classroom.findMany({
      include: { _count: { select: { students: true } } },
      orderBy: { createdAt: "desc" },
    });
  }),

  createClassroom: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        teacherName: z.string().min(1),
        teacherEmail: z.string().email(),
        school: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate unique class code
      const code = `MATH-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      return ctx.db.classroom.create({
        data: {
          ...input,
          classCode: code,
        },
      });
    }),

  // Moderation: flagged comments
  flaggedComments: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.comment.findMany({
      where: { isFlagged: true, isApproved: false },
      include: {
        user: { select: { username: true, displayName: true } },
        question: { select: { titleEn: true, titleZh: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),

  // Approve or reject a comment
  moderateComment: adminProcedure
    .input(
      z.object({
        commentId: z.string(),
        action: z.enum(["approve", "reject"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.action === "reject") {
        return ctx.db.comment.delete({ where: { id: input.commentId } });
      }
      return ctx.db.comment.update({
        where: { id: input.commentId },
        data: { isApproved: true, isFlagged: false },
      });
    }),
});
