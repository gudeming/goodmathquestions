import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@gmq/db";
import { COMPARE_GUESS_VALUES, GuessConfigSchema, type GuessConfig } from "@gmq/math-engine";
import { createTRPCRouter, publicProcedure, type TRPCContext } from "../trpc";
import { identityFromContext, resolveIdentity, type Identity } from "../lib/identity";
import { RATE_LIMITS, consumeRateLimit } from "../lib/rate-limit";
import { cacheDel, cacheGetJson, cacheSetJson } from "../lib/cache";
import { touchStreak } from "../lib/streak";

export const HISTOGRAM_BUCKETS = 10;
export const HISTOGRAM_TTL_SEC = 60;
/** The caller's own guess is cached separately and written through on submit. */
export const OWN_GUESS_TTL_SEC = 24 * 60 * 60;
/** Cached marker for "this identity has not guessed", so misses stay off the DB too. */
const NO_GUESS = "";

export const histogramKey = (questionId: string) => `guess:hist:${questionId}`;
export const ownGuessKey = (questionId: string, identityKey: string) =>
  `guess:mine:${questionId}:${identityKey}`;
export const guessRateLimitKey = (identityKey: string) => `rl:guess:${identityKey}`;

export interface HistogramBucket {
  from: number;
  to: number;
  count: number;
}

/** Aggregate part of a histogram; this is what is cached under guess:hist:{id}. */
export type HistogramAggregate =
  | { type: "slider"; min: number; max: number; logScale: boolean; buckets: HistogramBucket[]; total: number }
  | { type: "choice" | "compare"; options: Array<{ id: string; count: number }>; total: number };

export type Histogram = HistogramAggregate & { mine: string | null };

const QuestionIdSchema = z.string().min(1).max(64);

async function loadGuessConfig(ctx: TRPCContext, questionId: string): Promise<GuessConfig> {
  const question = await ctx.db.question.findUnique({
    where: { id: questionId, isPublished: true },
    select: { guessConfig: true },
  });
  if (!question) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
  }
  if (question.guessConfig === null) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This question has no guess step" });
  }
  const parsed = GuessConfigSchema.safeParse(question.guessConfig);
  if (!parsed.success) {
    console.error(`[guess] invalid guessConfig on question ${questionId}`);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Guess is misconfigured" });
  }
  return parsed.data;
}

/** Validates a raw guess against the config and returns its canonical stored form. */
export function normaliseGuessValue(config: GuessConfig, raw: string): string | null {
  const value = raw.trim();
  switch (config.type) {
    case "slider": {
      if (value === "") return null;
      const n = Number(value);
      if (!Number.isFinite(n) || n < config.min || n > config.max) return null;
      return String(n);
    }
    case "choice":
      return config.options.some((o) => o.id === value) ? value : null;
    case "compare":
      return (COMPARE_GUESS_VALUES as readonly string[]).includes(value) ? value : null;
  }
}

/**
 * Bucket index for a slider value: HISTOGRAM_BUCKETS equal-width buckets over
 * [min, max] (equal in log10 space for logScale sliders). `max` falls in the last bucket.
 */
export function bucketIndex(value: number, min: number, max: number, logScale = false): number {
  const [lo, hi, v] = logScale ? [Math.log10(min), Math.log10(max), Math.log10(value)] : [min, max, value];
  const raw = Math.floor(((v - lo) / (hi - lo)) * HISTOGRAM_BUCKETS);
  return Math.min(HISTOGRAM_BUCKETS - 1, Math.max(0, raw));
}

export function bucketEdges(min: number, max: number, logScale = false): Array<{ from: number; to: number }> {
  return Array.from({ length: HISTOGRAM_BUCKETS }, (_, i) => {
    if (logScale) {
      const lo = Math.log10(min);
      const step = (Math.log10(max) - lo) / HISTOGRAM_BUCKETS;
      return { from: 10 ** (lo + i * step), to: 10 ** (lo + (i + 1) * step) };
    }
    const step = (max - min) / HISTOGRAM_BUCKETS;
    return { from: min + i * step, to: i === HISTOGRAM_BUCKETS - 1 ? max : min + (i + 1) * step };
  });
}

/** Pure aggregation, exported for unit tests. Values outside the config are ignored. */
export function aggregateGuesses(
  config: GuessConfig,
  counts: ReadonlyArray<{ value: string; count: number }>
): HistogramAggregate {
  if (config.type === "slider") {
    const logScale = config.logScale === true;
    const buckets = bucketEdges(config.min, config.max, logScale).map((e) => ({ ...e, count: 0 }));
    let total = 0;
    for (const { value, count } of counts) {
      const n = Number(value);
      if (!Number.isFinite(n) || n < config.min || n > config.max) continue;
      buckets[bucketIndex(n, config.min, config.max, logScale)].count += count;
      total += count;
    }
    return { type: "slider", min: config.min, max: config.max, logScale, buckets, total };
  }

  const ids =
    config.type === "choice" ? config.options.map((o) => o.id) : [...COMPARE_GUESS_VALUES];
  const byId = new Map(ids.map((id) => [id, 0]));
  let total = 0;
  for (const { value, count } of counts) {
    const current = byId.get(value);
    if (current === undefined) continue;
    byId.set(value, current + count);
    total += count;
  }
  return { type: config.type, options: ids.map((id) => ({ id, count: byId.get(id) ?? 0 })), total };
}

function isHistogramAggregate(v: unknown): v is HistogramAggregate {
  if (typeof v !== "object" || v === null) return false;
  const t = (v as { type?: unknown }).type;
  return t === "slider" || t === "choice" || t === "compare";
}

function guessWhere(questionId: string, who: Identity): Prisma.GuessWhereUniqueInput {
  return who.kind === "user"
    ? { questionId_userId: { questionId, userId: who.userId } }
    : { questionId_anonId: { questionId, anonId: who.anonId } };
}

async function ownGuess(ctx: TRPCContext, questionId: string): Promise<string | null> {
  const who = identityFromContext(ctx);
  if (!who) return null;
  const key = ownGuessKey(questionId, who.key);
  const cached = await cacheGetJson(key);
  if (typeof cached === "string") return cached === NO_GUESS ? null : cached;

  const row = await ctx.db.guess.findUnique({ where: guessWhere(questionId, who), select: { value: true } });
  await cacheSetJson(key, row?.value ?? NO_GUESS, OWN_GUESS_TTL_SEC);
  return row?.value ?? null;
}

export const guessRouter = createTRPCRouter({
  /** Act 1 guess. Guests count once per question via anonId; re-guessing updates. */
  submit: publicProcedure
    .input(z.object({ questionId: QuestionIdSchema, value: z.string().max(64) }))
    .mutation(async ({ ctx, input }) => {
      const caller = identityFromContext(ctx);
      if (!caller) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sign in or send an anonymous id to guess" });
      }
      if (!(await consumeRateLimit(guessRateLimitKey(caller.key), RATE_LIMITS.guess()))) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many guesses, try again later" });
      }

      const config = await loadGuessConfig(ctx, input.questionId);
      const value = normaliseGuessValue(config, input.value);
      if (value === null) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Guess is outside the allowed values" });
      }

      const who = await resolveIdentity(ctx);
      if (!who) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sign in or send an anonymous id to guess" });
      }

      const where = guessWhere(input.questionId, who);
      const create = {
        questionId: input.questionId,
        value,
        ...(who.kind === "user" ? { userId: who.userId } : { anonId: who.anonId }),
      };
      try {
        await ctx.db.guess.upsert({ where, create, update: { value } });
      } catch (err) {
        // Two concurrent first guesses from one identity: the loser updates instead.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          await ctx.db.guess.update({ where, data: { value } });
        } else {
          throw err;
        }
      }

      await cacheDel(histogramKey(input.questionId));
      await cacheSetJson(ownGuessKey(input.questionId, who.key), value, OWN_GUESS_TTL_SEC);
      // A guess is "thinking": it keeps the daily streak alive (touchStreak never throws).
      if (who.kind === "user") await touchStreak(ctx.db, who.userId);
      return { ok: true as const, value };
    }),

  /**
   * What everyone else guessed. Never includes the correct answer. The aggregate is
   * cached for HISTOGRAM_TTL_SEC and dropped on every new guess.
   */
  histogram: publicProcedure
    .input(z.object({ questionId: QuestionIdSchema }))
    .query(async ({ ctx, input }): Promise<Histogram> => {
      const key = histogramKey(input.questionId);
      const cached = await cacheGetJson(key);
      let aggregate: HistogramAggregate;
      if (isHistogramAggregate(cached)) {
        aggregate = cached;
      } else {
        const config = await loadGuessConfig(ctx, input.questionId);
        const grouped = await ctx.db.guess.groupBy({
          by: ["value"],
          where: { questionId: input.questionId },
          _count: { _all: true },
        });
        aggregate = aggregateGuesses(
          config,
          grouped.map((g) => ({ value: g.value, count: g._count._all }))
        );
        await cacheSetJson(key, aggregate, HISTOGRAM_TTL_SEC);
      }
      return { ...aggregate, mine: await ownGuess(ctx, input.questionId) };
    }),
});
