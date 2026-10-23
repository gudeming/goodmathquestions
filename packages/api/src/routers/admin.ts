import { z } from "zod";
import { Prisma } from "@gmq/db";
import { createTRPCRouter, adminProcedure, type TRPCContext } from "../trpc";
import { TRPCError } from "@trpc/server";
import { cacheGetJson, cacheSetJson } from "../lib/cache";

// ---------------------------------------------------------------------------
// Hero question funnel (README Phase 7 item 2)
// ---------------------------------------------------------------------------

export const FUNNEL_CACHE_TTL_SEC = 60;
export const FUNNEL_MAX_DAYS = 90;
export const funnelCacheKey = (days: number): string => `admin:funnel:v1:${days}`;

/** Share of `num` in `den` (0..1, may exceed 1 for non-nested steps), null when den is 0. */
export type Rate = number | null;

/**
 * One row per published non-DRILL question. Stage counts are DISTINCT identities
 * (userId, else anonId) with at least one event of that name in the window, so a
 * refresh or a second guess does not inflate the funnel. `viewEvents` is the raw
 * page-view count. A guest who signs in mid-question counts as two identities.
 */
export interface HeroFunnelRow {
  questionId: string;
  slug: string | null;
  titleEn: string;
  titleZh: string;
  kind: string;
  ageGroup: string;
  collectionSlug: string | null;
  viewEvents: number;
  views: number;
  guesses: number;
  interactions: number;
  hintUsers: number;
  submits: number;
  correctSubmits: number;
  reveals: number;
  extensionOpens: number;
  /** Comments created on the question in the window (any moderation state). */
  comments: number;
  /** Identities with a `reveal_seen` but no `answer_submit` with `props.correct === true`. */
  giveUps: number;
  /** Median of (first reveal_seen − first question_view) per identity, seconds; null without pairs. */
  medianSecondsToReveal: number | null;
  rates: {
    viewToGuess: Rate;
    guessToInteract: Rate;
    interactToSubmit: Rate;
    submitToReveal: Rate;
    viewToReveal: Rate;
  };
}

export interface HeroFunnel {
  days: number;
  since: string;
  generatedAt: string;
  /** README §3 success metrics: ≥ 60 % of visitors guess, ≥ 40 % reach the reveal. */
  targets: { viewToGuess: number; viewToReveal: number };
  rows: HeroFunnelRow[];
}

export const FUNNEL_TARGETS = { viewToGuess: 0.6, viewToReveal: 0.4 } as const;

interface FunnelSqlRow {
  qid: string;
  viewEvents: number;
  views: number;
  guesses: number;
  interactions: number;
  hintUsers: number;
  submits: number;
  correctSubmits: number;
  reveals: number;
  extensionOpens: number;
  giveUps: number;
  medianSecondsToReveal: number | null;
}

const rate = (num: number, den: number): Rate => (den > 0 ? Math.round((num / den) * 1000) / 1000 : null);

/**
 * One pass over `Event` (uses the (name, createdAt) index for the window): first
 * aggregate per (question, identity), then per question. Parameterised via Prisma.sql.
 */
async function funnelEventStats(db: TRPCContext["db"], since: Date, questionIds: string[]): Promise<FunnelSqlRow[]> {
  if (questionIds.length === 0) return [];
  return db.$queryRaw<FunnelSqlRow[]>(Prisma.sql`
    WITH ev AS (
      SELECT e."questionId" AS qid,
             COALESCE('u:' || e."userId", 'a:' || e."anonId") AS who,
             e.name, e."createdAt", e.props
      FROM "Event" e
      WHERE e."createdAt" >= ${since}
        AND e."questionId" IN (${Prisma.join(questionIds)})
        AND (e."userId" IS NOT NULL OR e."anonId" IS NOT NULL)
        -- "Try another number" rounds carry props.variant: they are not the original question's funnel.
        AND NOT (e.props ? 'variant')
    ),
    per_who AS (
      SELECT qid, who,
             COUNT(*) FILTER (WHERE name = 'question_view') AS view_events,
             MIN("createdAt") FILTER (WHERE name = 'question_view') AS first_view,
             COALESCE(BOOL_OR(name = 'guess_made'), false) AS guessed,
             COALESCE(BOOL_OR(name = 'scene_interact'), false) AS interacted,
             COALESCE(BOOL_OR(name = 'hint_reveal'), false) AS hinted,
             COALESCE(BOOL_OR(name = 'answer_submit'), false) AS submitted,
             COALESCE(BOOL_OR(name = 'answer_submit' AND props->>'correct' = 'true'), false) AS solved,
             MIN("createdAt") FILTER (WHERE name = 'reveal_seen') AS first_reveal,
             COALESCE(BOOL_OR(name = 'extension_open'), false) AS extended
      FROM ev
      GROUP BY qid, who
    )
    SELECT qid,
           SUM(view_events)::int AS "viewEvents",
           COUNT(*) FILTER (WHERE first_view IS NOT NULL)::int AS views,
           COUNT(*) FILTER (WHERE guessed)::int AS guesses,
           COUNT(*) FILTER (WHERE interacted)::int AS interactions,
           COUNT(*) FILTER (WHERE hinted)::int AS "hintUsers",
           COUNT(*) FILTER (WHERE submitted)::int AS submits,
           COUNT(*) FILTER (WHERE solved)::int AS "correctSubmits",
           COUNT(*) FILTER (WHERE first_reveal IS NOT NULL)::int AS reveals,
           COUNT(*) FILTER (WHERE extended)::int AS "extensionOpens",
           COUNT(*) FILTER (WHERE first_reveal IS NOT NULL AND NOT solved)::int AS "giveUps",
           (percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_reveal - first_view)))
              FILTER (WHERE first_view IS NOT NULL AND first_reveal >= first_view))::float8 AS "medianSecondsToReveal"
    FROM per_who
    GROUP BY qid
  `);
}

async function commentCounts(db: TRPCContext["db"], since: Date, questionIds: string[]): Promise<Map<string, number>> {
  if (questionIds.length === 0) return new Map();
  const groups = await db.comment.groupBy({
    by: ["questionId"],
    where: { questionId: { in: questionIds }, createdAt: { gte: since } },
    _count: { _all: true },
  });
  return new Map(groups.map((g) => [g.questionId, g._count._all] as const));
}

async function buildHeroFunnel(db: TRPCContext["db"], days: number): Promise<HeroFunnel> {
  const now = new Date();
  const since = new Date(now.getTime() - days * 86_400_000);
  const questions = await db.question.findMany({
    where: { isPublished: true, kind: { not: "DRILL" } },
    select: {
      id: true,
      slug: true,
      titleEn: true,
      titleZh: true,
      kind: true,
      ageGroup: true,
      collection: { select: { slug: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const ids = questions.map((q) => q.id);
  const [stats, commentsById] = await Promise.all([funnelEventStats(db, since, ids), commentCounts(db, since, ids)]);
  const statsById = new Map(stats.map((r) => [r.qid, r] as const));

  const rows: HeroFunnelRow[] = questions.map((q) => {
    const s = statsById.get(q.id);
    const n = {
      viewEvents: s?.viewEvents ?? 0,
      views: s?.views ?? 0,
      guesses: s?.guesses ?? 0,
      interactions: s?.interactions ?? 0,
      hintUsers: s?.hintUsers ?? 0,
      submits: s?.submits ?? 0,
      correctSubmits: s?.correctSubmits ?? 0,
      reveals: s?.reveals ?? 0,
      extensionOpens: s?.extensionOpens ?? 0,
      giveUps: s?.giveUps ?? 0,
    };
    const median = s?.medianSecondsToReveal;
    return {
      questionId: q.id,
      slug: q.slug,
      titleEn: q.titleEn,
      titleZh: q.titleZh,
      kind: q.kind,
      ageGroup: q.ageGroup,
      collectionSlug: q.collection?.slug ?? null,
      ...n,
      comments: commentsById.get(q.id) ?? 0,
      medianSecondsToReveal: median === null || median === undefined ? null : Math.round(Number(median)),
      rates: {
        viewToGuess: rate(n.guesses, n.views),
        guessToInteract: rate(n.interactions, n.guesses),
        interactToSubmit: rate(n.submits, n.interactions),
        submitToReveal: rate(n.reveals, n.submits),
        viewToReveal: rate(n.reveals, n.views),
      },
    };
  });
  rows.sort((a, b) => b.views - a.views || b.viewEvents - a.viewEvents);
  return { days, since: since.toISOString(), generatedAt: now.toISOString(), targets: { ...FUNNEL_TARGETS }, rows };
}

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

  /**
   * Per-hero-question funnel over the last `days` days (see HeroFunnelRow for the
   * definitions). Cached 60 s per day range; the page says how fresh it is.
   */
  heroFunnel: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(FUNNEL_MAX_DAYS).default(7) }))
    .query(async ({ ctx, input }): Promise<HeroFunnel> => {
      const key = funnelCacheKey(input.days);
      const cached = (await cacheGetJson(key)) as HeroFunnel | undefined;
      if (cached && Array.isArray(cached.rows)) return cached;
      const funnel = await buildHeroFunnel(ctx.db, input.days);
      await cacheSetJson(key, funnel, FUNNEL_CACHE_TTL_SEC);
      return funnel;
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
