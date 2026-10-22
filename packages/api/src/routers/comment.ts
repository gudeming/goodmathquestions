import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@gmq/db";
import {
  GuessConfigSchema,
  SOLUTION_TAGS,
  SolutionTagSchema,
  XP_RULES,
  levelForXp,
  solutionCommentXp,
  type SolutionTag,
} from "@gmq/math-engine";
import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure, type TRPCContext } from "../trpc";
import { resolveIdentity } from "../lib/identity";
import { consumeRateLimit, type RateLimitRule } from "../lib/rate-limit";
import { cacheGetJson, cacheSetJson } from "../lib/cache";
import { redis } from "../redis";
import { normaliseGuessValue } from "./guess";
import { COMMENT_MAX_CHARS, COMMENT_MIN_CHARS, commentLength, screenComment, type ScreenReason } from "../moderation/wordlist";
import { notBotAuthor } from "../moderation/bots";

// ---------------------------------------------------------------------------
// Policy (README Phase 6). Every knob is read per call so ops can change it by env.
// ---------------------------------------------------------------------------

function envInt(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Kill-switch: GMQ_COMMENTS_REQUIRE_APPROVAL=true puts every new comment into the admin
 * queue (isFlagged, not approved) instead of publishing clean ones immediately.
 */
export function commentsRequireApproval(): boolean {
  return ["1", "true", "yes", "on"].includes((process.env.GMQ_COMMENTS_REQUIRE_APPROVAL ?? "").trim().toLowerCase());
}

export const commentRateRule = (): RateLimitRule => ({ limit: envInt("GMQ_RL_COMMENT_PER_MIN", 5), windowSec: 60 });
const reportRateRule = (): RateLimitRule => ({ limit: envInt("GMQ_RL_REPORT_PER_HOUR", 20), windowSec: 3600 });

/** Identical text from the same author within this window is rejected. */
export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
/** Distinct reporters that hide a comment until an admin looks at it. */
export const REPORT_HIDE_THRESHOLD = 3;
export const REPORT_TTL_SEC = 30 * 24 * 60 * 60;
export const GUESS_SPLIT_TTL_SEC = 60;
const MAX_GUESS_VALUE = 40;
const MY_PENDING_LIMIT = 10;

export const commentRateLimitKey = (userId: string) => `rl:comment:${userId}`;
export const reportRateLimitKey = (userId: string) => `rl:report:${userId}`;
/**
 * Reports live in Redis because the schema is frozen for this phase (no Report model):
 * a set of reporter ids and a hash reporter -> reason, both expiring after 30 days.
 * Limitation: if Redis is flushed, counts restart; a comment already hidden stays hidden
 * (that state is in Postgres).
 */
export const reportSetKey = (commentId: string) => `report:${commentId}`;
export const reportReasonKey = (commentId: string) => `report:reasons:${commentId}`;
export const guessSplitKey = (questionId: string) => `comment:split:${questionId}`;

export const REPORT_REASONS = ["mean", "personal_info", "inappropriate", "spam", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Error messages the UI switches on (TRPCError.message). */
export const COMMENT_ERRORS = {
  length: "COMMENT_LENGTH",
  rateLimited: "COMMENT_RATE_LIMITED",
  duplicate: "COMMENT_DUPLICATE",
  ownComment: "CANNOT_REPORT_OWN_COMMENT",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// C0/C1 controls except \n and \t; bidi overrides/isolates; zero-width space and BOM.
// (U+200D stays: it joins multi-part emoji.)
const CONTROL_RE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F​‎‏‪-‮⁦-⁩﻿]/g;

/** Strips control characters, normalizes newlines, collapses blank-line runs, trims. */
export function cleanCommentText(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_RE, "")
    .replace(/\t/g, " ")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  level: true,
} satisfies Prisma.UserSelect;

const commentFields = {
  id: true,
  content: true,
  createdAt: true,
  parentId: true,
  solutionTag: true,
  guessValue: true,
  user: { select: authorSelect },
} satisfies Prisma.CommentSelect;

function sessionUserId(ctx: Pick<TRPCContext, "session">): string | null {
  const id = (ctx.session?.user as { id?: unknown } | undefined)?.id;
  return typeof id === "string" && id !== "" ? id : null;
}

/**
 * The guess shown next to a comment ("I guessed 23"). The caller's stored Guess wins
 * (signed-in or the same browser's anonymous guess); otherwise the client value is
 * accepted only if it is a valid guess for this question, so it cannot carry free text.
 */
async function resolveGuessValue(
  ctx: Pick<TRPCContext, "db" | "anonId">,
  question: { id: string; guessConfig: Prisma.JsonValue },
  userId: string,
  clientValue: string | undefined
): Promise<string | null> {
  if (clientValue === undefined || clientValue.trim() === "") return null;
  const owners: Prisma.GuessWhereInput[] = [{ userId }];
  if (ctx.anonId) owners.push({ anonId: ctx.anonId });
  const row = await ctx.db.guess.findFirst({
    where: { questionId: question.id, OR: owners },
    orderBy: { updatedAt: "desc" },
    select: { value: true },
  });
  if (row) return row.value.slice(0, MAX_GUESS_VALUE);
  const config = GuessConfigSchema.safeParse(question.guessConfig);
  if (!config.success) return null;
  return normaliseGuessValue(config.data, clientValue)?.slice(0, MAX_GUESS_VALUE) ?? null;
}

/** Report counts per comment; fail-open (an unreachable Redis reads as "no reports"). */
async function reportCounts(commentIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (commentIds.length === 0) return counts;
  try {
    const pipeline = redis.pipeline();
    for (const id of commentIds) pipeline.scard(reportSetKey(id));
    const results = (await pipeline.exec()) ?? [];
    commentIds.forEach((id, i) => counts.set(id, Number(results[i]?.[1] ?? 0) || 0));
  } catch (err) {
    console.error("[comment] report count lookup failed:", err instanceof Error ? err.message : err);
  }
  return counts;
}

export type CreateStatus = "published" | "pending_review";
export type PendingReason = ScreenReason | "manual_review";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const commentRouter = createTRPCRouter({
  /**
   * Approved top-level comments (newest first) with approved replies, minus generated
   * community users. The first page also carries tag counts, and for a signed-in caller
   * their own comments still waiting for review (`myPending`).
   */
  list: publicProcedure
    .input(
      z.object({
        questionId: z.string().min(1).max(64),
        cursor: z.string().min(1).max(64).optional(),
        limit: z.number().int().min(1).max(50).default(20),
        solutionTag: SolutionTagSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, questionId, solutionTag } = input;
      const visible = { isApproved: true, user: notBotAuthor() } satisfies Prisma.CommentWhereInput;
      const topLevel = { questionId, parentId: null, ...visible } satisfies Prisma.CommentWhereInput;

      const comments = await ctx.db.comment.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: { ...topLevel, ...(solutionTag ? { solutionTag } : {}) },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          ...commentFields,
          replies: { where: visible, orderBy: { createdAt: "asc" }, take: 50, select: commentFields },
        },
      });

      let nextCursor: string | undefined;
      if (comments.length > limit) nextCursor = comments.pop()?.id;

      let tagCounts: Partial<Record<SolutionTag | "none", number>> | undefined;
      let total: number | undefined;
      if (!cursor) {
        const groups = await ctx.db.comment.groupBy({ by: ["solutionTag"], where: topLevel, _count: { _all: true } });
        tagCounts = {};
        total = 0;
        for (const g of groups) {
          const tag = g.solutionTag && (SOLUTION_TAGS as readonly string[]).includes(g.solutionTag) ? (g.solutionTag as SolutionTag) : "none";
          tagCounts[tag] = (tagCounts[tag] ?? 0) + g._count._all;
          total += g._count._all;
        }
      }

      const viewerId = sessionUserId(ctx);
      let myPending: Array<{ id: string; content: string; createdAt: Date; parentId: string | null; solutionTag: string | null; guessValue: string | null }> = [];
      if (viewerId && !cursor) {
        const mine = await ctx.db.comment.findMany({
          where: { questionId, userId: viewerId, isApproved: false },
          orderBy: { createdAt: "desc" },
          take: MY_PENDING_LIMIT,
          select: { id: true, content: true, createdAt: true, parentId: true, solutionTag: true, guessValue: true },
        });
        // Hidden by other kids' reports: not "waiting for a quick check", so not shown.
        const reports = await reportCounts(mine.map((c) => c.id));
        myPending = mine.filter((c) => (reports.get(c.id) ?? 0) < REPORT_HIDE_THRESHOLD);
      }

      return { comments, nextCursor, total, tagCounts, myPending };
    }),

  /**
   * Post a comment or reply. Clean text is published at once; anything the screen
   * catches (or everything, with the kill-switch on) goes to the admin queue and the
   * caller gets `status: "pending_review"`. Solution-comment XP (+10) is paid once per
   * user and question for a published top-level comment of 30+ characters.
   */
  create: protectedProcedure
    .input(
      z.object({
        questionId: z.string().min(1).max(64),
        // Validated after cleaning; the raw bound only keeps payloads small.
        content: z.string().max(COMMENT_MAX_CHARS * 4),
        parentId: z.string().min(1).max(64).optional(),
        solutionTag: SolutionTagSchema.optional(),
        guessValue: z.string().max(MAX_GUESS_VALUE).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const content = cleanCommentText(input.content);
      const length = commentLength(content);
      if (length < COMMENT_MIN_CHARS || length > COMMENT_MAX_CHARS) {
        throw new TRPCError({ code: "BAD_REQUEST", message: COMMENT_ERRORS.length });
      }

      const identity = await resolveIdentity(ctx);
      if (identity?.kind !== "user") throw new TRPCError({ code: "UNAUTHORIZED" });
      const userId = identity.userId;

      if (!(await consumeRateLimit(commentRateLimitKey(userId), commentRateRule()))) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: COMMENT_ERRORS.rateLimited });
      }

      const question = await ctx.db.question.findFirst({
        where: { id: input.questionId, isPublished: true },
        select: { id: true, guessConfig: true },
      });
      if (!question) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });

      // Replies hang off a top-level comment (the list shows one level of threading).
      let parentId: string | null = null;
      if (input.parentId) {
        const parent = await ctx.db.comment.findUnique({
          where: { id: input.parentId },
          select: { id: true, parentId: true, questionId: true, isApproved: true, userId: true },
        });
        if (!parent || parent.questionId !== question.id || (!parent.isApproved && parent.userId !== userId)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
        }
        parentId = parent.parentId ?? parent.id;
      }

      const duplicate = await ctx.db.comment.findFirst({
        where: { userId, content, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
        select: { id: true },
      });
      if (duplicate) throw new TRPCError({ code: "CONFLICT", message: COMMENT_ERRORS.duplicate });

      const screen = screenComment(content);
      const reason: PendingReason | null = !screen.ok ? screen.reason : commentsRequireApproval() ? "manual_review" : null;
      const approved = reason === null;
      const guessValue = await resolveGuessValue(ctx, question, userId, input.guessValue);
      const xpEligible = approved && parentId === null && length >= XP_RULES.solutionCommentMinChars;

      const { comment, xpAwarded } = await ctx.db.$transaction(async (tx) => {
        let xp = 0;
        if (xpEligible) {
          // Serialize this user's awards so two quick posts cannot both be "the first".
          await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
          const prior = await tx.comment.findMany({
            where: { userId, questionId: question.id, parentId: null, isApproved: true },
            select: { content: true },
            take: 200,
          });
          xp = solutionCommentXp(content, prior.some((c) => commentLength(c.content) >= XP_RULES.solutionCommentMinChars));
        }

        const created = await tx.comment.create({
          data: {
            content,
            userId,
            questionId: question.id,
            parentId,
            solutionTag: input.solutionTag ?? null,
            guessValue,
            isApproved: approved,
            // Anything not published goes to the admin queue (admin.flaggedComments).
            isFlagged: !approved,
          },
          select: commentFields,
        });

        if (xp > 0) {
          const user = await tx.user.update({
            where: { id: userId },
            data: { xp: { increment: xp }, lastActiveAt: new Date() },
            select: { xp: true, level: true },
          });
          const level = levelForXp(user.xp);
          if (level > user.level) await tx.user.update({ where: { id: userId }, data: { level } });
        }
        return { comment: created, xpAwarded: xp };
      });

      if (!approved) {
        console.info(`[comment] held for review: comment=${comment.id} user=${userId} reason=${reason}`);
      }

      return {
        status: (approved ? "published" : "pending_review") as CreateStatus,
        reason,
        comment,
        xpAwarded,
      };
    }),

  /**
   * A child flags a comment. One report per user and comment; the third distinct
   * reporter hides it (isFlagged, not approved) until an admin decides. Only the
   * crossing of the threshold hides it, so a comment an admin re-approved stays up.
   */
  report: protectedProcedure
    .input(z.object({ commentId: z.string().min(1).max(64), reason: z.enum(REPORT_REASONS) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
        select: { id: true, userId: true, isApproved: true },
      });
      if (!comment) throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      if (comment.userId === userId) throw new TRPCError({ code: "BAD_REQUEST", message: COMMENT_ERRORS.ownComment });

      if (!(await consumeRateLimit(reportRateLimitKey(userId), reportRateRule()))) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: COMMENT_ERRORS.rateLimited });
      }

      let added = 0;
      let count = 0;
      try {
        const results = await redis
          .multi()
          .sadd(reportSetKey(comment.id), userId)
          .hset(reportReasonKey(comment.id), userId, input.reason)
          .expire(reportSetKey(comment.id), REPORT_TTL_SEC)
          .expire(reportReasonKey(comment.id), REPORT_TTL_SEC)
          .scard(reportSetKey(comment.id))
          .exec();
        added = Number(results?.[0]?.[1] ?? 0);
        count = Number(results?.[4]?.[1] ?? 0);
      } catch (err) {
        // Nowhere else to keep it; the child still gets a thank-you, ops gets the log line.
        console.error(`[comment] report not recorded (Redis): comment=${comment.id} user=${userId}:`, err instanceof Error ? err.message : err);
        return { status: "received" as const };
      }

      if (added === 0) return { status: "already_reported" as const };
      if (count === REPORT_HIDE_THRESHOLD && comment.isApproved) {
        await ctx.db.comment.update({ where: { id: comment.id }, data: { isFlagged: true, isApproved: false } });
        console.info(`[comment] hidden after ${count} reports: comment=${comment.id}`);
      }
      return { status: "received" as const };
    }),

  /**
   * "Who thinks what" for a question whose Act 1 guess is a choice or a compare:
   * per-option counts from Guess. `null` for slider guesses or no guess step. Cached 60 s.
   */
  guessSplit: publicProcedure
    .input(z.object({ questionId: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      type Split = { type: "choice" | "compare"; options: Array<{ id: string; count: number }>; total: number } | null;
      const key = guessSplitKey(input.questionId);
      const cached = await cacheGetJson(key);
      if (cached !== undefined) return cached as Split;

      const question = await ctx.db.question.findFirst({
        where: { id: input.questionId, isPublished: true },
        select: { guessConfig: true },
      });
      if (!question) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });

      const config = question.guessConfig === null ? null : GuessConfigSchema.safeParse(question.guessConfig);
      let split: Split = null;
      if (config?.success && config.data.type !== "slider") {
        const ids = config.data.type === "choice" ? config.data.options.map((o) => o.id) : ["left", "right", "same"];
        const groups = await ctx.db.guess.groupBy({
          by: ["value"],
          where: { questionId: input.questionId, value: { in: ids } },
          _count: { _all: true },
        });
        const byValue = new Map(groups.map((g) => [g.value, g._count._all] as const));
        const options = ids.map((id) => ({ id, count: byValue.get(id) ?? 0 }));
        split = { type: config.data.type, options, total: options.reduce((s, o) => s + o.count, 0) };
      }
      await cacheSetJson(key, split, GUESS_SPLIT_TTL_SEC);
      return split;
    }),

  /** Admin queue helper: report counts and reasons for the given comments. */
  reportSummary: adminProcedure
    .input(z.object({ commentIds: z.array(z.string().min(1).max(64)).max(100) }))
    .query(async ({ input }) => {
      const summary: Record<string, { count: number; reasons: Partial<Record<ReportReason, number>> }> = {};
      if (input.commentIds.length === 0) return summary;
      try {
        const pipeline = redis.pipeline();
        for (const id of input.commentIds) pipeline.hvals(reportReasonKey(id));
        const results = (await pipeline.exec()) ?? [];
        input.commentIds.forEach((id, i) => {
          const reasons = (results[i]?.[1] as string[] | undefined) ?? [];
          if (reasons.length === 0) return;
          const tally: Partial<Record<ReportReason, number>> = {};
          for (const r of reasons) if ((REPORT_REASONS as readonly string[]).includes(r)) tally[r as ReportReason] = (tally[r as ReportReason] ?? 0) + 1;
          summary[id] = { count: reasons.length, reasons: tally };
        });
      } catch (err) {
        console.error("[comment] report summary failed:", err instanceof Error ? err.message : err);
      }
      return summary;
    }),
});
