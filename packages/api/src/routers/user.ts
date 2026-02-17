import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  // Get current user profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        badges: { include: { badge: true } },
        classroom: true,
        _count: {
          select: {
            submissions: true,
            comments: true,
          },
        },
      },
    });
    return user;
  }),

  // Get user stats
  stats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [totalAttempted, totalCorrect, submissions] = await Promise.all([
      ctx.db.submission.count({ where: { userId } }),
      ctx.db.submission.count({ where: { userId, isCorrect: true } }),
      ctx.db.submission.findMany({
        where: { userId },
        select: { questionId: true, isCorrect: true },
        distinct: ["questionId"],
      }),
    ]);

    const uniqueQuestions = submissions.length;
    const uniqueSolved = submissions.filter((s) => s.isCorrect).length;
    const accuracy =
      totalAttempted > 0
        ? Math.round((totalCorrect / totalAttempted) * 100)
        : 0;

    return {
      totalAttempted,
      totalCorrect,
      uniqueQuestions,
      uniqueSolved,
      accuracy,
    };
  }),

  // Update profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(30).optional(),
        avatarUrl: z.string().url().optional(),
        locale: z.enum(["en", "zh"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
      });
    }),

  // Leaderboard
  leaderboard: publicProcedure
    .input(
      z.object({
        period: z.enum(["daily", "weekly", "allTime"]).default("allTime"),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // For all-time, just sort by XP
      if (input.period === "allTime") {
        return ctx.db.user.findMany({
          take: input.limit,
          orderBy: { xp: "desc" },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            xp: true,
            level: true,
            streak: true,
          },
        });
      }

      // For daily/weekly, aggregate recent submissions
      const now = new Date();
      const startDate =
        input.period === "daily"
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
          : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const topUsers = await ctx.db.submission.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: startDate },
          isCorrect: true,
        },
        _sum: { xpEarned: true },
        orderBy: { _sum: { xpEarned: "desc" } },
        take: input.limit,
      });

      const userIds = topUsers.map((u) => u.userId);
      const users = await ctx.db.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          xp: true,
          level: true,
          streak: true,
        },
      });

      return topUsers.map((entry) => ({
        ...users.find((u) => u.id === entry.userId)!,
        periodXp: entry._sum.xpEarned ?? 0,
      }));
    }),
});
