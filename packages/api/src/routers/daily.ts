import { z } from "zod";
import { Prisma, type PrismaClient } from "@gmq/db";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { publicQuestionSelect, toPublicQuestion, type PublicQuestion } from "../lib/question-public";
import { cacheGetJson, cacheSetJson } from "../lib/cache";
import { identityFromContext } from "../lib/identity";
import { listSolvedHeroes } from "./user";

/** Redis key holding the chosen question id for one UTC day. */
export const dailyKey = (dateString: string) => `daily:${dateString}`;
/** Redis key holding the Guess row count for a question. */
export const dailyGuessCountKey = (questionId: string) => `daily:guesses:${questionId}`;
export const DAILY_GUESS_COUNT_TTL_SEC = 60;

/** Seconds from `now` until the next 00:00 UTC (at least 1, so the key always expires). */
export function secondsUntilUtcMidnight(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

/** Candidates for the daily puzzle: published hero (non-DRILL) questions. */
const dailyCandidateWhere = {
  isPublished: true,
  kind: { not: "DRILL" },
} satisfies Prisma.QuestionWhereInput;

/** Stable candidate order, so the same date and candidate set always pick the same question. */
const dailyCandidateOrder = [{ sortOrder: "asc" }, { id: "asc" }] satisfies Prisma.QuestionOrderByWithRelationInput[];

/** "YYYY-MM-DD" for the UTC calendar day of `now`, and that day at 00:00 UTC. */
export function utcDay(now: Date): { dateString: string; date: Date } {
  const dateString = now.toISOString().slice(0, 10);
  return { dateString, date: new Date(`${dateString}T00:00:00.000Z`) };
}

/** FNV-1a 32-bit. Small, dependency-free and stable across runtimes. */
export function fnv1a32(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Index of the daily pick among `count` candidates, or null when there are none. */
export function pickDailyIndex(dateString: string, count: number): number | null {
  return count > 0 ? fnv1a32(dateString) % count : null;
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

type Db = Pick<PrismaClient, "dailyPuzzle" | "question">;

/**
 * Returns the daily puzzle for `now`'s UTC day, choosing and persisting it on first
 * call. Idempotent: concurrent first calls race on the unique `date`; losers re-read.
 * A row whose question was unpublished since is re-picked.
 */
export async function getOrCreateDailyPuzzle(db: Db, now: Date): Promise<PublicQuestion | null> {
  const { dateString, date } = utcDay(now);

  const existing = await db.dailyPuzzle.findUnique({
    where: { date },
    select: { question: { select: publicQuestionSelect } },
  });
  if (existing?.question.isPublished) return toPublicQuestion(existing.question);

  const count = await db.question.count({ where: dailyCandidateWhere });
  const index = pickDailyIndex(dateString, count);
  if (index === null) return null;

  const picked = await db.question.findFirst({
    where: dailyCandidateWhere,
    orderBy: dailyCandidateOrder,
    skip: index,
    select: { id: true },
  });
  if (!picked) return null; // candidate set shrank between count and read

  try {
    const row = existing
      ? await db.dailyPuzzle.update({
          where: { date },
          data: { questionId: picked.id },
          select: { question: { select: publicQuestionSelect } },
        })
      : await db.dailyPuzzle.create({
          data: { date, questionId: picked.id },
          select: { question: { select: publicQuestionSelect } },
        });
    return toPublicQuestion(row.question);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const winner = await db.dailyPuzzle.findUnique({
      where: { date },
      select: { question: { select: publicQuestionSelect } },
    });
    return winner ? toPublicQuestion(winner.question) : null;
  }
}

type TodayDb = Db & Pick<PrismaClient, "guess">;

export type DailyPuzzleResult = PublicQuestion & {
  /** Everyone who made an Act 1 guess on this question (cached DAILY_GUESS_COUNT_TTL_SEC). */
  guessCount: number;
};

/** Guess rows for one question, cached briefly: it is shown on every landing view. */
export async function cachedGuessCount(db: Pick<PrismaClient, "guess">, questionId: string): Promise<number> {
  const key = dailyGuessCountKey(questionId);
  const cached = await cacheGetJson(key);
  if (typeof cached === "number" && Number.isFinite(cached)) return cached;
  const count = await db.guess.count({ where: { questionId } });
  await cacheSetJson(key, count, DAILY_GUESS_COUNT_TTL_SEC);
  return count;
}

/**
 * Today's puzzle via Redis: the day's question id is cached until midnight UTC,
 * so a warm call costs one GET plus a primary-key read. A cached id whose question
 * was unpublished or deleted falls through to getOrCreateDailyPuzzle (the DB stays
 * the source of truth; Redis down = the uncached path).
 */
export async function getTodayPuzzle(db: TodayDb, now: Date): Promise<DailyPuzzleResult | null> {
  const { dateString } = utcDay(now);
  const key = dailyKey(dateString);

  let question: PublicQuestion | null = null;
  const cachedId = await cacheGetJson(key);
  if (typeof cachedId === "string" && cachedId !== "") {
    const row = await db.question.findUnique({
      where: { id: cachedId, ...dailyCandidateWhere },
      select: publicQuestionSelect,
    });
    question = row ? toPublicQuestion(row) : null;
  }
  if (!question) {
    question = await getOrCreateDailyPuzzle(db, now);
    if (!question) return null;
    await cacheSetJson(key, question.id, secondsUntilUtcMidnight(now));
  }

  return { ...question, guessCount: await cachedGuessCount(db, question.id) };
}

export interface SurprisePick {
  id: string;
  slug: string | null;
  /** True when the caller had solved every hero question, so any one was picked. */
  allSolved: boolean;
}

type SurpriseDb = Pick<PrismaClient, "question" | "submission">;

/**
 * A random published hero question, preferring ones `userId` has not solved
 * (guests: any). `excludeId` (e.g. the question on screen) is skipped when
 * something else is available. `random` is injectable for tests.
 */
export async function pickSurprise(
  db: SurpriseDb,
  userId: string | null,
  excludeId: string | null,
  random: () => number = Math.random
): Promise<SurprisePick | null> {
  const solved = userId ? (await listSolvedHeroes(db, userId)).ids : [];
  const pickFrom = async (notIn: string[]) => {
    const where: Prisma.QuestionWhereInput = notIn.length > 0 ? { ...dailyCandidateWhere, id: { notIn } } : dailyCandidateWhere;
    const count = await db.question.count({ where });
    if (count === 0) return null;
    const skip = Math.min(count - 1, Math.floor(random() * count));
    return db.question.findFirst({ where, orderBy: dailyCandidateOrder, skip, select: { id: true, slug: true } });
  };

  const exclude = excludeId ? [excludeId] : [];
  const fresh = (await pickFrom([...solved, ...exclude])) ?? (exclude.length > 0 ? await pickFrom(solved) : null);
  if (fresh) return { ...fresh, allSolved: false };
  const any = (await pickFrom(exclude)) ?? (exclude.length > 0 ? await pickFrom([]) : null);
  return any ? { ...any, allSolved: solved.length > 0 } : null;
}

export const dailyRouter = createTRPCRouter({
  /** Today's (UTC) puzzle with its guess count, or null until hero questions exist. */
  today: publicProcedure.query(({ ctx }) => getTodayPuzzle(ctx.db, new Date())),

  /**
   * "Surprise me": a random published hero question the caller has not solved.
   * A mutation because every call should roll again (no query caching).
   */
  surprise: publicProcedure
    .input(z.object({ excludeId: z.string().min(1).max(64).optional() }).optional())
    .mutation(({ ctx, input }) => {
      const who = identityFromContext(ctx);
      return pickSurprise(ctx.db, who?.kind === "user" ? who.userId : null, input?.excludeId ?? null);
    }),
});
