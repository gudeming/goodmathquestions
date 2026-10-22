import { z } from "zod";
import type { PrismaClient } from "@gmq/db";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { heroCardSelect, heroQuestionWhere, type HeroCard } from "./collection";
import { utcDayNumber } from "../lib/streak";

/** Events that mean "the child opened or played with this question". */
const CONTINUE_EVENT_NAMES = ["question_view", "guess_made", "scene_interact", "answer_submit", "hint_reveal"];
/** How far back "Continue" looks; a handful of recent sessions is plenty. */
const CONTINUE_EVENT_SCAN = 50;
const CONTINUE_GUESS_SCAN = 20;

type SolvedDb = Pick<PrismaClient, "submission">;

export interface SolvedHeroes {
  /** Published hero questions the user has answered correctly at least once. */
  ids: string[];
  /** Solved count per collection id. */
  byCollection: Record<string, number>;
}

/** Solved = a correct Submission for a published hero (non-DRILL) question. */
export async function listSolvedHeroes(db: SolvedDb, userId: string): Promise<SolvedHeroes> {
  const rows = await db.submission.findMany({
    where: { userId, isCorrect: true, question: heroQuestionWhere },
    select: { questionId: true, question: { select: { collectionId: true } } },
    distinct: ["questionId"],
  });
  const byCollection: Record<string, number> = {};
  for (const row of rows) {
    const c = row.question.collectionId;
    if (c) byCollection[c] = (byCollection[c] ?? 0) + 1;
  }
  return { ids: rows.map((r) => r.questionId), byCollection };
}

type ContinueDb = Pick<PrismaClient, "event" | "guess" | "question" | "submission">;

/**
 * The most recent hero question the user viewed, guessed or played with but has
 * not solved, or null. Recency merges Event rows and Guess rows (a guess made
 * before analytics existed still counts).
 */
export async function findContinueQuestion(db: ContinueDb, userId: string): Promise<HeroCard | null> {
  const [events, guesses] = await Promise.all([
    db.event.findMany({
      where: { userId, name: { in: CONTINUE_EVENT_NAMES }, questionId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: CONTINUE_EVENT_SCAN,
      select: { questionId: true, createdAt: true },
    }),
    db.guess.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: CONTINUE_GUESS_SCAN,
      select: { questionId: true, updatedAt: true },
    }),
  ]);

  const touched = [
    ...events.flatMap((e) => (e.questionId ? [{ id: e.questionId, at: e.createdAt.getTime() }] : [])),
    ...guesses.map((g) => ({ id: g.questionId, at: g.updatedAt.getTime() })),
  ].sort((a, b) => b.at - a.at);
  const recentIds = [...new Set(touched.map((t) => t.id))];
  if (recentIds.length === 0) return null;

  const [cards, solved] = await Promise.all([
    db.question.findMany({ where: { ...heroQuestionWhere, id: { in: recentIds } }, select: heroCardSelect }),
    db.submission.findMany({
      where: { userId, isCorrect: true, questionId: { in: recentIds } },
      select: { questionId: true },
      distinct: ["questionId"],
    }),
  ]);
  const solvedIds = new Set(solved.map((s) => s.questionId));
  const byId = new Map(cards.map((c) => [c.id, c]));
  for (const id of recentIds) {
    const card = byId.get(id);
    if (card && !solvedIds.has(id)) return card;
  }
  return null;
}

export const userRouter = createTRPCRouter({
  /** Hero questions I have solved, with per-world counts (home and world progress). */
  solvedHeroIds: protectedProcedure.query(({ ctx }) => listSolvedHeroes(ctx.db, ctx.session.user.id)),

  /** "Continue": the latest hero question I started but have not solved, or null. */
  continueQuestion: protectedProcedure.query(({ ctx }) => findContinueQuestion(ctx.db, ctx.session.user.id)),

  /**
   * Current daily thinking streak (see lib/streak.ts). The stored value is only
   * updated on activity, so a streak whose last day is before yesterday reads as 0.
   */
  streak: protectedProcedure.query(async ({ ctx }) => {
    const row = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { streak: true, lastActiveAt: true },
    });
    if (!row) return { streak: 0, activeToday: false };
    const gap = utcDayNumber(new Date()) - utcDayNumber(row.lastActiveAt);
    return { streak: gap <= 1 ? row.streak : 0, activeToday: gap <= 0 && row.streak > 0 };
  }),

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
