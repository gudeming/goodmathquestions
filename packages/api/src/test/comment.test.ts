import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { db } from "@gmq/db";
import { redis } from "../redis";
import {
  cleanCommentText,
  commentRateLimitKey,
  guessSplitKey,
  reportRateLimitKey,
  reportReasonKey,
  reportSetKey,
} from "../routers/comment";
import { callerFor, cleanupFixtures, createFixtures, probeServices, trackAnon, type Fixtures } from "./helpers";

async function expectTrpcError(p: Promise<unknown>, code: TRPCError["code"], message?: string): Promise<void> {
  await expect(p).rejects.toBeInstanceOf(TRPCError);
  await expect(p).rejects.toMatchObject(message ? { code, message } : { code });
}

describe("cleanCommentText (pure)", () => {
  it("strips control and bidi characters, normalizes newlines, trims", () => {
    expect(cleanCommentText("  hi\u0000 there‮ \r\n\r\n\r\n\r\nok\t!  ")).toBe("hi there\n\nok !");
    expect(cleanCommentText("​﻿")).toBe("");
  });
});

const servicesUp = await probeServices("comment");

describe.skipIf(!servicesUp)("comment router (Postgres + Redis)", () => {
  let f: Fixtures;
  /** Extra kids: [0] rate-limit kid, [1..3] reporters. */
  const others: string[] = [];
  let botUserId = "";
  const touchedComments: string[] = [];
  const LONG = "I paired the first and last numbers and every pair made the same sum.";

  const kid = () => callerFor({ userId: f.userId });
  const allUsers = () => [f.userId, ...others, botUserId];

  beforeAll(async () => {
    f = await createFixtures("p6-comment");
    for (let i = 0; i < 4; i++) {
      const u = await db.user.create({
        data: { username: `${f.tag}-k${i}`, displayName: `Kid ${i}`, password: "x", age: 10, email: `${f.tag}-k${i}@example.test` },
        select: { id: true },
      });
      others.push(u.id);
    }
    const bot = await db.user.create({
      data: { username: `${f.tag}-bot`, displayName: "Bot", password: "x", age: 10, email: `${f.tag}@community.gmq.local` },
      select: { id: true },
    });
    botUserId = bot.id;
  });

  beforeEach(async () => {
    await redis.del(...allUsers().flatMap((u) => [commentRateLimitKey(u), reportRateLimitKey(u)]));
  });

  afterEach(() => {
    delete process.env.GMQ_COMMENTS_REQUIRE_APPROVAL;
  });

  afterAll(async () => {
    if (!f) return;
    const comments = await db.comment.findMany({ where: { questionId: { in: f.questionIds } }, select: { id: true } });
    const ids = [...new Set([...touchedComments, ...comments.map((c) => c.id)])];
    await db.user.deleteMany({ where: { id: { in: [...others, botUserId] } } });
    await cleanupFixtures(f);
    await redis.del(
      ...allUsers().flatMap((u) => [commentRateLimitKey(u), reportRateLimitKey(u)]),
      ...f.questionIds.map(guessSplitKey),
      ...ids.flatMap((id) => [reportSetKey(id), reportReasonKey(id)])
    );
  });

  it("publishes a clean comment immediately, with its tag and guess", async () => {
    const res = await kid().comment.create({
      questionId: f.multi.id,
      content: "I drew it first",
      solutionTag: "draw",
      guessValue: "B",
    });
    touchedComments.push(res.comment.id);
    expect(res).toMatchObject({ status: "published", reason: null, xpAwarded: 0 });
    expect(res.comment).toMatchObject({ solutionTag: "draw", guessValue: "B" });

    const list = await callerFor().comment.list({ questionId: f.multi.id });
    expect(list.comments.map((c) => c.id)).toContain(res.comment.id);
    const shown = list.comments.find((c) => c.id === res.comment.id);
    expect(shown).toMatchObject({ solutionTag: "draw", guessValue: "B", user: { displayName: "Test Kid" } });
    expect(list.myPending).toEqual([]);
  });

  it("holds profanity for review: flagged, hidden, but listed in the author's myPending", async () => {
    const res = await kid().comment.create({ questionId: f.multi.id, content: "this is sh1t" });
    expect(res).toMatchObject({ status: "pending_review", reason: "profanity" });
    const row = await db.comment.findUniqueOrThrow({ where: { id: res.comment.id } });
    expect(row).toMatchObject({ isApproved: false, isFlagged: true });

    const publicList = await callerFor().comment.list({ questionId: f.multi.id });
    expect(publicList.comments.map((c) => c.id)).not.toContain(res.comment.id);
    expect(publicList.myPending).toEqual([]);
    const own = await kid().comment.list({ questionId: f.multi.id });
    expect(own.myPending.map((c) => c.id)).toContain(res.comment.id);
    const otherKid = await callerFor({ userId: others[1] }).comment.list({ questionId: f.multi.id });
    expect(otherKid.myPending).toEqual([]);
  });

  it("holds links for review", async () => {
    const res = await kid().comment.create({ questionId: f.multi.id, content: "see coolmath.io for the answer" });
    expect(res).toMatchObject({ status: "pending_review", reason: "url" });
    expect(await db.comment.findUniqueOrThrow({ where: { id: res.comment.id } })).toMatchObject({ isApproved: false, isFlagged: true });
  });

  it("rejects too short text after cleaning", async () => {
    await expectTrpcError(kid().comment.create({ questionId: f.multi.id, content: " \u0000a​ " }), "BAD_REQUEST", "COMMENT_LENGTH");
  });

  it("rejects the 6th comment in a minute", async () => {
    const c = callerFor({ userId: others[0] });
    for (let i = 1; i <= 5; i++) {
      await c.comment.create({ questionId: f.estimate.id, content: `idea number ${i}` });
    }
    await expectTrpcError(c.comment.create({ questionId: f.estimate.id, content: "idea number 6" }), "TOO_MANY_REQUESTS", "COMMENT_RATE_LIMITED");
    expect(await db.comment.count({ where: { userId: others[0] } })).toBe(5);
  });

  it("rejects the same text twice within 10 minutes", async () => {
    await kid().comment.create({ questionId: f.estimate.id, content: "Round first, then multiply" });
    await expectTrpcError(
      kid().comment.create({ questionId: f.multi.id, content: "  Round first, then multiply " }),
      "CONFLICT",
      "COMMENT_DUPLICATE"
    );
  });

  it("awards solution XP once per question, only for long top-level comments", async () => {
    const before = (await db.user.findUniqueOrThrow({ where: { id: f.userId }, select: { xp: true } })).xp;
    const first = await kid().comment.create({ questionId: f.estimate.id, content: LONG, solutionTag: "pair" });
    expect(first.xpAwarded).toBe(10);
    const second = await kid().comment.create({ questionId: f.estimate.id, content: `${LONG} Also it is symmetric!` });
    expect(second.xpAwarded).toBe(0);
    const reply = await kid().comment.create({
      questionId: f.estimate.id,
      parentId: first.comment.id,
      content: "A reply that is definitely longer than thirty characters.",
    });
    expect(reply.xpAwarded).toBe(0);
    const after = (await db.user.findUniqueOrThrow({ where: { id: f.userId }, select: { xp: true } })).xp;
    expect(after - before).toBe(10);
  });

  it("threads replies under the top-level comment and flattens deeper replies", async () => {
    const top = await callerFor({ userId: others[1] }).comment.create({ questionId: f.estimate.id, content: "Who used a table?" });
    const r1 = await kid().comment.create({ questionId: f.estimate.id, parentId: top.comment.id, content: "Me!" });
    const r2 = await callerFor({ userId: others[2] }).comment.create({ questionId: f.estimate.id, parentId: r1.comment.id, content: "Me too" });
    expect(r1.comment.parentId).toBe(top.comment.id);
    expect(r2.comment.parentId).toBe(top.comment.id);
    const list = await callerFor().comment.list({ questionId: f.estimate.id });
    const shown = list.comments.find((c) => c.id === top.comment.id);
    expect(shown?.replies.map((r) => r.id)).toEqual([r1.comment.id, r2.comment.id]);
    await expectTrpcError(
      kid().comment.create({ questionId: f.multi.id, parentId: top.comment.id, content: "wrong question" }),
      "NOT_FOUND"
    );
  });

  it("filters by solution tag and counts tags on the first page", async () => {
    const all = await callerFor().comment.list({ questionId: f.estimate.id });
    const pair = await callerFor().comment.list({ questionId: f.estimate.id, solutionTag: "pair" });
    expect(pair.comments.length).toBeGreaterThan(0);
    expect(pair.comments.every((c) => c.solutionTag === "pair")).toBe(true);
    expect(all.tagCounts?.pair).toBe(pair.comments.length);
    expect(all.total).toBe(all.comments.length);
  });

  it("hides a comment after 3 distinct reports, once", async () => {
    const target = await kid().comment.create({ questionId: f.multi.id, content: "Pairs are the trick here" });
    touchedComments.push(target.comment.id);
    await expectTrpcError(kid().comment.report({ commentId: target.comment.id, reason: "mean" }), "BAD_REQUEST");

    const r1 = callerFor({ userId: others[1] });
    expect(await r1.comment.report({ commentId: target.comment.id, reason: "mean" })).toEqual({ status: "received" });
    expect(await r1.comment.report({ commentId: target.comment.id, reason: "spam" })).toEqual({ status: "already_reported" });
    await callerFor({ userId: others[2] }).comment.report({ commentId: target.comment.id, reason: "spam" });
    let list = await callerFor().comment.list({ questionId: f.multi.id });
    expect(list.comments.map((c) => c.id)).toContain(target.comment.id);

    await callerFor({ userId: others[3] }).comment.report({ commentId: target.comment.id, reason: "personal_info" });
    expect(await db.comment.findUniqueOrThrow({ where: { id: target.comment.id } })).toMatchObject({ isApproved: false, isFlagged: true });
    list = await callerFor().comment.list({ questionId: f.multi.id });
    expect(list.comments.map((c) => c.id)).not.toContain(target.comment.id);
    // Hidden by reports is not "waiting for a quick check" for the author.
    const own = await kid().comment.list({ questionId: f.multi.id });
    expect(own.myPending.map((c) => c.id)).not.toContain(target.comment.id);
  });

  it("honours the GMQ_COMMENTS_REQUIRE_APPROVAL kill-switch", async () => {
    process.env.GMQ_COMMENTS_REQUIRE_APPROVAL = "true";
    const res = await callerFor({ userId: others[1] }).comment.create({ questionId: f.multi.id, content: LONG });
    expect(res).toMatchObject({ status: "pending_review", reason: "manual_review", xpAwarded: 0 });
    expect(await db.comment.findUniqueOrThrow({ where: { id: res.comment.id } })).toMatchObject({ isApproved: false, isFlagged: true });
  });

  it("keeps only valid guess values and prefers the stored guess", async () => {
    const free = await callerFor({ userId: others[2] }).comment.create({
      questionId: f.multi.id,
      content: "My guess was way off",
      guessValue: "13812345678",
    });
    expect(free.comment.guessValue).toBeNull();

    await db.guess.create({ data: { questionId: f.multi.id, userId: others[3], value: "C" } });
    const stored = await callerFor({ userId: others[3] }).comment.create({
      questionId: f.multi.id,
      content: "I thought it would be large",
      guessValue: "A",
    });
    expect(stored.comment.guessValue).toBe("C");
  });

  it("never lists comments by generated community users", async () => {
    const bot = await db.comment.create({
      data: { content: "I used two methods!", userId: botUserId, questionId: f.multi.id, isApproved: true },
      select: { id: true },
    });
    const list = await callerFor().comment.list({ questionId: f.multi.id });
    expect(list.comments.map((c) => c.id)).not.toContain(bot.id);
    // Authors with a null email (most kids) and ordinary emails are listed.
    expect(list.comments.some((c) => c.user.id === f.userId)).toBe(true);
    expect(list.comments.some((c) => others.includes(c.user.id))).toBe(true);
  });

  it("splits choice guesses per option and returns null for sliders", async () => {
    await redis.del(guessSplitKey(f.multi.id), guessSplitKey(f.estimate.id));
    for (const value of ["A", "A", "B"]) {
      await db.guess.create({ data: { questionId: f.multi.id, anonId: trackAnon(f), value } });
    }
    const split = await callerFor().comment.guessSplit({ questionId: f.multi.id });
    // + the signed-in kid's "C" from the previous test
    expect(split).toEqual({ type: "choice", options: [{ id: "A", count: 2 }, { id: "B", count: 1 }, { id: "C", count: 1 }], total: 4 });
    expect(await callerFor().comment.guessSplit({ questionId: f.estimate.id })).toBeNull();
    await expectTrpcError(callerFor().comment.guessSplit({ questionId: f.hidden.id }), "NOT_FOUND");
  });

  it("requires sign-in to post or report", async () => {
    await expectTrpcError(callerFor().comment.create({ questionId: f.multi.id, content: "hello" }), "UNAUTHORIZED");
    await expectTrpcError(callerFor().comment.report({ commentId: "x", reason: "other" }), "UNAUTHORIZED");
  });
});
