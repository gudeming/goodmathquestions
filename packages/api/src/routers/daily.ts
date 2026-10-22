import { Prisma, type PrismaClient } from "@gmq/db";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { publicQuestionSelect, toPublicQuestion, type PublicQuestion } from "../lib/question-public";

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

export const dailyRouter = createTRPCRouter({
  /** Today's (UTC) puzzle, or null until hero questions exist. */
  today: publicProcedure.query(({ ctx }) => getOrCreateDailyPuzzle(ctx.db, new Date())),
});
