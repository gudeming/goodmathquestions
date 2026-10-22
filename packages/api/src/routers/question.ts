import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../trpc";
import { QuestionKind } from "@gmq/db";
import { AnswerSpecSchema, computeAnswerXp, levelForXp, type AnswerSpec } from "@gmq/math-engine";
import { identityFromContext } from "../lib/identity";
import { publicQuestionSelect, toPublicQuestion } from "../lib/question-public";
import { loadPublicQuestion } from "../lib/question-cache";
import { AnswerInputSchema, answerToText, judgeAnswer } from "../lib/answer-check";

const SlugSchema = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** Prisma cuid() ids: "c" + 24 lowercase alphanumerics. Slugs are kebab-case words. */
const CUID_PATTERN = /^c[a-z0-9]{24}$/;

/** Hints a client may report; anything above is clamped (there are 3 hints per question). */
const MAX_HINTS_REPORTED = 20;

/** Wrong attempts a signed-in user needs before "Show me" may reveal the answer. */
export const GIVE_UP_AFTER_ATTEMPTS = 3;

function parseSpec(rule: unknown): AnswerSpec | null {
  if (rule === null || rule === undefined) return null;
  const parsed = AnswerSpecSchema.safeParse(rule);
  return parsed.success ? parsed.data : null;
}

/**
 * The guess-histogram value that is "the truth", when the data says so: a slider's
 * truth is the numeric answer; a choice guess is only marked when the answer itself
 * is one of the guess options (e.g. Monty Hall). Otherwise null (no truth marker).
 */
function guessTruthOf(guessConfig: unknown, spec: AnswerSpec | null): string | null {
  if (!spec || typeof guessConfig !== "object" || guessConfig === null) return null;
  const type = (guessConfig as { type?: unknown }).type;
  if (type === "slider") {
    if (spec.type === "NUMERIC") return String(spec.value);
    if (spec.type === "ESTIMATE") return String(spec.truth);
    return null;
  }
  if (type === "choice" && spec.type === "CHOICE") {
    const options = (guessConfig as { options?: Array<{ id?: unknown }> }).options;
    return Array.isArray(options) && options.some((o) => o?.id === spec.correctId) ? spec.correctId : null;
  }
  return null;
}

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
      // Redis-cached payload (lib/question-cache.ts): keyed by id + updatedAt, _count 60 s.
      const question = await loadPublicQuestion(ctx.db, { id: input.id });

      if (!question) {
        throw new Error("Question not found");
      }

      return question;
    }),

  /**
   * Resolves a route param that is either a question id or a slug. The page uses
   * `slug` in the result to redirect id URLs of hero questions to their slug URL.
   * Ids are tried first when the param looks like a cuid, slugs first otherwise.
   */
  resolve: publicProcedure
    .input(z.object({ idOrSlug: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      const key = input.idOrSlug;
      const byId = () => loadPublicQuestion(ctx.db, { id: key });
      const bySlug = () =>
        SlugSchema.safeParse(key).success ? loadPublicQuestion(ctx.db, { slug: key }) : Promise.resolve(null);
      const [first, second] = CUID_PATTERN.test(key) ? [byId, bySlug] : [bySlug, byId];
      const question = (await first()) ?? (await second());
      if (!question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      }
      return question;
    }),

  /**
   * Act 3 content: aha, explanation and the answer. Used after a correct answer
   * (and on refresh in the reveal phase) and for "Show me" after giving up.
   * Guests earn no XP, so they may reveal any time; a signed-in user needs a
   * correct submission or GIVE_UP_AFTER_ATTEMPTS attempts, so the answer can't be
   * read first and then submitted for XP.
   */
  reveal: publicProcedure
    .input(z.object({ questionId: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const question = await ctx.db.question.findUnique({
        where: { id: input.questionId, isPublished: true },
        select: {
          id: true,
          answer: true,
          answerRule: true,
          guessConfig: true,
          answerExplainEn: true,
          answerExplainZh: true,
          ahaEn: true,
          ahaZh: true,
        },
      });
      if (!question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      }

      const who = identityFromContext(ctx);
      if (who?.kind === "user") {
        const userId = await resolveSessionUserId(ctx as any);
        const [attempts, correct] = await Promise.all([
          ctx.db.submission.count({ where: { userId, questionId: question.id } }),
          ctx.db.submission.findFirst({
            where: { userId, questionId: question.id, isCorrect: true },
            select: { id: true },
          }),
        ]);
        if (!correct && attempts < GIVE_UP_AFTER_ATTEMPTS) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Keep trying a little longer first" });
        }
      }

      const spec = parseSpec(question.answerRule);
      return {
        answer: question.answer,
        aha: ahaOf(question),
        explanation:
          question.answerExplainEn || question.answerExplainZh
            ? { en: question.answerExplainEn ?? null, zh: question.answerExplainZh ?? null }
            : null,
        guessTruth: guessTruthOf(question.guessConfig, spec),
      };
    }),

  /**
   * Which numbers and operators an EXPRESSION answer may use (never the target),
   * so the answer box can check "each number once" while the child types.
   */
  expressionRules: publicProcedure
    .input(z.object({ questionId: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const question = await ctx.db.question.findUnique({
        where: { id: input.questionId, isPublished: true },
        select: { answerRule: true },
      });
      const spec = parseSpec(question?.answerRule);
      if (!spec || spec.type !== "EXPRESSION") return null;
      return { allowedNumbers: spec.allowedNumbers, allowedOps: spec.allowedOps };
    }),

  // Get a single published question by its stable slug (v2 hero questions)
  bySlug: publicProcedure
    .input(z.object({ slug: SlugSchema }))
    .query(async ({ ctx, input }) => {
      const question = await loadPublicQuestion(ctx.db, { slug: input.slug });
      if (!question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      }
      return question;
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

  /**
   * Submit an answer (signed-in users). XP rules live in math-engine/xp.ts:
   * guess +5 and first attempt +5 on the first submission, +difficulty XP and the
   * no-hints bonus on the first correct submission. Re-submitting after solving
   * earns nothing.
   */
  submitAnswer: protectedProcedure
    .input(
      z.object({
        questionId: z.string(),
        answer: AnswerInputSchema,
        timeSpent: z.number().int().min(0),
        /** Hints revealed before this submission. */
        hintsUsed: z.number().int().min(0).max(1000).default(0),
        /** The client says it made an Act 1 guess; verified against the Guess table. */
        guessed: z.boolean().default(false),
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

      const [attemptCount, priorCorrect] = await Promise.all([
        ctx.db.submission.count({ where: { userId, questionId: input.questionId } }),
        ctx.db.submission.findFirst({
          where: { userId, questionId: input.questionId, isCorrect: true },
          select: { id: true },
        }),
      ]);

      // Guess XP is paid with the first submission only, so it is once per question.
      const guessVerified =
        input.guessed && attemptCount === 0
          ? (await ctx.db.guess.findUnique({
              where: { questionId_userId: { questionId: input.questionId, userId } },
              select: { id: true },
            })) !== null
          : false;

      const xp = computeAnswerXp({
        difficulty: question.difficulty,
        isCorrect,
        hintsUsed: Math.min(input.hintsUsed, MAX_HINTS_REPORTED),
        guessVerified,
        previousAttempts: attemptCount,
        alreadySolved: priorCorrect !== null,
      });
      const xpEarned = xp.total;

      await ctx.db.submission.create({
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

      if (xpEarned > 0) {
        const user = await ctx.db.user.update({
          where: { id: userId },
          data: {
            xp: { increment: xpEarned },
            lastActiveAt: new Date(),
          },
        });

        // Level up every 100 XP.
        const newLevel = levelForXp(user.xp);
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
        xpBreakdown: xp,
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
