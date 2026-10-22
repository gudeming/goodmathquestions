import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@gmq/db";
import { questionCountKey } from "../lib/question-cache";
import { redis } from "../redis";
import { callerFor, installPrismaOpCounter, prismaOpCount, probeServices } from "./helpers";

/**
 * Phase 7: Redis cache behind question.getById / bySlug / resolve (lib/question-cache.ts).
 * Lives under admin*.test.ts because of file ownership in the Phase 7 split.
 */
const servicesUp = await probeServices("admin-question-cache");

describe.skipIf(!servicesUp)("question payload cache (Postgres + Redis)", () => {
  const tag = `test-p7-cache-${randomUUID().slice(0, 8)}`;
  let questionId = "";
  let userId = "";

  const dropKeys = async () => {
    if (!questionId) return;
    const keys = await redis.keys(`q:*:v1:${questionId}*`);
    if (keys.length > 0) await redis.del(...keys);
  };

  beforeAll(async () => {
    installPrismaOpCounter();
    const user = await db.user.create({
      data: { username: tag, displayName: "P7 Cache", password: "x", age: 10 },
      select: { id: true },
    });
    userId = user.id;
    const q = await db.question.create({
      data: {
        slug: tag,
        kind: "THREE_ACT",
        isPublished: true,
        titleEn: "P7 cache v1",
        titleZh: "P7 缓存",
        contentEn: "Fixture prompt",
        contentZh: "测试题目",
        difficulty: "MEDIUM",
        category: "ARITHMETIC",
        ageGroup: "AGE_10_12",
        answer: "1",
        guessConfig: { type: "slider", min: 0, max: 10, step: 1 },
      },
      select: { id: true },
    });
    questionId = q.id;
  });

  afterAll(async () => {
    await dropKeys();
    if (questionId) await db.question.deleteMany({ where: { id: questionId } });
    if (userId) await db.user.deleteMany({ where: { id: userId } });
  });

  it("serves the second read from Redis with one indexed lookup, Dates intact", async () => {
    await dropKeys();
    const first = await callerFor().question.getById({ id: questionId });
    const before = prismaOpCount();
    const second = await callerFor().question.getById({ id: questionId });
    expect(prismaOpCount() - before).toBe(1);
    expect(second).toEqual(first);
    expect(second.updatedAt).toBeInstanceOf(Date);
    expect(second.guessConfig).toEqual({ type: "slider", min: 0, max: 10, step: 1 });
    expect(second).not.toHaveProperty("answer");
  });

  it("bySlug and resolve share the cache and the public shape", async () => {
    const byId = await callerFor().question.getById({ id: questionId });
    await expect(callerFor().question.bySlug({ slug: tag })).resolves.toEqual(byId);
    await expect(callerFor().question.resolve({ idOrSlug: tag })).resolves.toEqual(byId);
    await expect(callerFor().question.resolve({ idOrSlug: questionId })).resolves.toEqual(byId);
  });

  it("an edit moves the key (updatedAt), so new content shows at once", async () => {
    await callerFor().question.getById({ id: questionId });
    await db.question.update({ where: { id: questionId }, data: { titleEn: "P7 cache v2" } });
    await expect(callerFor().question.getById({ id: questionId })).resolves.toMatchObject({ titleEn: "P7 cache v2" });
  });

  it("unpublishing hides the question immediately", async () => {
    await callerFor().question.bySlug({ slug: tag });
    await db.question.update({ where: { id: questionId }, data: { isPublished: false } });
    try {
      await expect(callerFor().question.bySlug({ slug: tag })).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(callerFor().question.getById({ id: questionId })).rejects.toThrow("Question not found");
    } finally {
      await db.question.update({ where: { id: questionId }, data: { isPublished: true } });
    }
  });

  it("_count is cached separately for up to 60 s", async () => {
    await dropKeys();
    const before = await callerFor().question.getById({ id: questionId });
    expect(before._count.comments).toBe(0);
    await db.comment.create({ data: { content: "P7 cache comment", userId, questionId } });
    await expect(callerFor().question.getById({ id: questionId })).resolves.toMatchObject({ _count: { comments: 0 } });
    const ttl = await redis.ttl(questionCountKey(questionId));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);

    await redis.del(questionCountKey(questionId));
    await expect(callerFor().question.getById({ id: questionId })).resolves.toMatchObject({ _count: { comments: 1 } });
  });
});
