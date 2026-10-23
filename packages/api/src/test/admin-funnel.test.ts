import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@gmq/db";
import { funnelCacheKey } from "../routers/admin";
import { redis } from "../redis";
import { callerFor, probeServices } from "./helpers";

/**
 * Phase 7: admin.heroFunnel. Fixtures are prefixed "test-p7-" and removed afterwards;
 * events are written straight to the table so their timestamps can be placed.
 */
const servicesUp = await probeServices("admin-funnel");

const SLUG = "test-p7-funnel";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe.skipIf(!servicesUp)("admin.heroFunnel (Postgres)", () => {
  const tag = `test-p7-${randomUUID().slice(0, 8)}`;
  const anon = { a: randomUUID(), b: randomUUID(), c: randomUUID(), old: randomUUID() };
  let adminId = "";
  let kidId = "";
  let questionId = "";

  const clearFunnelCache = () => redis.del(funnelCacheKey(7), funnelCacheKey(30));

  beforeAll(async () => {
    // A crashed earlier run may have left the fixed-slug question behind.
    await db.question.deleteMany({ where: { slug: SLUG } });
    const admin = await db.user.create({
      data: { username: `${tag}-admin`, displayName: "P7 Admin", password: "x", age: 30, isAdmin: true },
      select: { id: true },
    });
    const kid = await db.user.create({
      data: { username: `${tag}-kid`, displayName: "P7 Kid", password: "x", age: 10 },
      select: { id: true },
    });
    adminId = admin.id;
    kidId = kid.id;
    const q = await db.question.create({
      data: {
        slug: SLUG,
        kind: "THREE_ACT",
        isPublished: true,
        titleEn: "P7 funnel",
        titleZh: "P7 漏斗",
        contentEn: "Fixture prompt",
        contentZh: "测试题目",
        difficulty: "MEDIUM",
        category: "ARITHMETIC",
        ageGroup: "AGE_10_12",
        answer: "5050",
        sortOrder: 0,
      },
      select: { id: true },
    });
    questionId = q.id;

    const t0 = Date.now() - HOUR;
    const at = (seconds: number) => new Date(t0 + seconds * 1000);
    const ev = (name: string, who: { anonId?: string; userId?: string }, seconds: number, props: object = {}) => ({
      name,
      questionId,
      anonId: who.anonId ?? null,
      userId: who.userId ?? null,
      props,
      createdAt: at(seconds),
    });
    const A = { anonId: anon.a };
    const B = { anonId: anon.b };
    const C = { anonId: anon.c };
    const U = { userId: kidId };
    await db.event.createMany({
      data: [
        // A: the full funnel, one wrong answer first, views twice; reveal after 120 s.
        ev("question_view", A, 0),
        ev("guess_made", A, 10),
        ev("scene_interact", A, 20),
        ev("answer_submit", A, 40, { correct: false }),
        ev("answer_submit", A, 60, { correct: true }),
        ev("reveal_seen", A, 120, { gaveUp: false }),
        ev("extension_open", A, 130),
        ev("question_view", A, 300),
        // B: guesses, then reveals without solving after 60 s -> give-up.
        ev("question_view", B, 0),
        ev("guess_made", B, 5),
        ev("reveal_seen", B, 60, { gaveUp: true }),
        // ...then solves a "try another number" round: not the original's funnel, B stays a give-up.
        ev("variant_start", B, 70, { variant: "people8" }),
        ev("hint_reveal", B, 75, { index: 1, variant: "people8" }),
        ev("answer_submit", B, 80, { correct: true, variant: "people8" }),
        // C: bounces.
        ev("question_view", C, 0),
        // Signed-in kid: hint, correct, reveal after 30 s.
        ev("question_view", U, 0),
        ev("guess_made", U, 3),
        ev("scene_interact", U, 6),
        ev("hint_reveal", U, 8),
        ev("answer_submit", U, 20, { correct: true }),
        ev("reveal_seen", U, 30, { gaveUp: false }),
        // Outside a 7-day window, inside 30 days.
        { ...ev("question_view", { anonId: anon.old }, 0), createdAt: new Date(Date.now() - 10 * DAY) },
        // Event without an identity: ignored.
        ev("question_view", {}, 0),
      ],
    });
    await db.comment.create({ data: { content: "P7 fixture comment", userId: kidId, questionId } });
    await clearFunnelCache();
  });

  afterAll(async () => {
    if (questionId) {
      await db.event.deleteMany({ where: { questionId } });
      await db.question.deleteMany({ where: { id: questionId } }); // comments cascade
    }
    await db.user.deleteMany({ where: { id: { in: [adminId, kidId].filter(Boolean) } } });
    await clearFunnelCache();
  });

  it("is admin only", async () => {
    await expect(callerFor().admin.heroFunnel({ days: 7 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(callerFor({ userId: kidId }).admin.heroFunnel({ days: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(callerFor({ userId: adminId }).admin.heroFunnel({ days: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(callerFor({ userId: adminId }).admin.heroFunnel({ days: 91 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("counts distinct identities per stage, give-ups, comments and the median time to reveal", async () => {
    const funnel = await callerFor({ userId: adminId }).admin.heroFunnel({ days: 7 });
    expect(funnel.days).toBe(7);
    expect(funnel.targets).toEqual({ viewToGuess: 0.6, viewToReveal: 0.4 });
    expect(funnel.rows.every((r) => r.kind !== "DRILL")).toBe(true);

    const row = funnel.rows.find((r) => r.questionId === questionId);
    expect(row).toMatchObject({
      slug: SLUG,
      kind: "THREE_ACT",
      viewEvents: 5,
      views: 4,
      guesses: 3,
      interactions: 2,
      hintUsers: 1,
      submits: 2,
      correctSubmits: 2,
      reveals: 3,
      extensionOpens: 1,
      giveUps: 1,
      comments: 1,
      medianSecondsToReveal: 60,
      rates: {
        viewToGuess: 0.75,
        guessToInteract: 0.667,
        interactToSubmit: 1,
        submitToReveal: 1.5,
        viewToReveal: 0.75,
      },
    });
    // Sorted by distinct views, most first.
    const views = funnel.rows.map((r) => r.views);
    expect([...views].sort((a, b) => b - a)).toEqual(views);
  });

  it("honours the day range", async () => {
    const funnel = await callerFor({ userId: adminId }).admin.heroFunnel({ days: 30 });
    expect(funnel.rows.find((r) => r.questionId === questionId)).toMatchObject({ views: 5, viewEvents: 6 });
  });

  it("serves a cached copy for 60 s per range", async () => {
    const caller = callerFor({ userId: adminId });
    const first = await caller.admin.heroFunnel({ days: 7 });
    await db.event.create({ data: { name: "question_view", questionId, anonId: randomUUID() } });
    const second = await caller.admin.heroFunnel({ days: 7 });
    expect(second.generatedAt).toBe(first.generatedAt);
    expect(second.rows.find((r) => r.questionId === questionId)?.views).toBe(4);
    expect(await redis.ttl(funnelCacheKey(7))).toBeGreaterThan(0);

    await redis.del(funnelCacheKey(7));
    const fresh = await caller.admin.heroFunnel({ days: 7 });
    expect(fresh.rows.find((r) => r.questionId === questionId)?.views).toBe(5);
  });

  it("returns zeros and null rates for a hero question without events", async () => {
    const empty = await db.question.create({
      data: {
        slug: `${tag}-empty`,
        kind: "PUZZLE",
        isPublished: true,
        titleEn: "P7 empty",
        titleZh: "P7 空",
        contentEn: "x",
        contentZh: "x",
        difficulty: "EASY",
        category: "LOGIC",
        ageGroup: "AGE_8_10",
        answer: "1",
      },
      select: { id: true },
    });
    try {
      await redis.del(funnelCacheKey(7));
      const funnel = await callerFor({ userId: adminId }).admin.heroFunnel({ days: 7 });
      expect(funnel.rows.find((r) => r.questionId === empty.id)).toMatchObject({
        views: 0,
        reveals: 0,
        comments: 0,
        medianSecondsToReveal: null,
        rates: { viewToGuess: null, viewToReveal: null },
      });
    } finally {
      await db.question.delete({ where: { id: empty.id } });
    }
  });
});
