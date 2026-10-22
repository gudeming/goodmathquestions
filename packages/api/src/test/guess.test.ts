import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { db } from "@gmq/db";
import { redis } from "../redis";
import {
  aggregateGuesses,
  bucketEdges,
  bucketIndex,
  guessRateLimitKey,
  histogramKey,
  normaliseGuessValue,
} from "../routers/guess";
import {
  callerFor,
  cleanupFixtures,
  createFixtures,
  installPrismaOpCounter,
  prismaOpCount,
  probeServices,
  trackAnon,
  type Fixtures,
} from "./helpers";

async function expectTrpcError(p: Promise<unknown>, code: TRPCError["code"]): Promise<void> {
  await expect(p).rejects.toBeInstanceOf(TRPCError);
  await expect(p).rejects.toMatchObject({ code });
}

describe("guess helpers (pure)", () => {
  it("puts slider values into 10 equal buckets, max in the last one", () => {
    expect(bucketIndex(0, 0, 100)).toBe(0);
    expect(bucketIndex(9.99, 0, 100)).toBe(0);
    expect(bucketIndex(10, 0, 100)).toBe(1);
    expect(bucketIndex(55, 0, 100)).toBe(5);
    expect(bucketIndex(100, 0, 100)).toBe(9);
    expect(bucketIndex(-5, -10, 10)).toBe(2);
    expect(bucketEdges(0, 100)[3]).toEqual({ from: 30, to: 40 });
    expect(bucketEdges(0, 100)[9].to).toBe(100);
  });

  it("uses log10 buckets for logScale sliders", () => {
    expect(bucketIndex(1, 1, 1e10, true)).toBe(0);
    expect(bucketIndex(1e5, 1, 1e10, true)).toBe(5);
    expect(bucketIndex(1e10, 1, 1e10, true)).toBe(9);
  });

  it("aggregates counts and ignores values outside the config", () => {
    const slider = aggregateGuesses({ type: "slider", min: 0, max: 100, step: 1 }, [
      { value: "5", count: 2 },
      { value: "100", count: 1 },
      { value: "500", count: 7 },
      { value: "abc", count: 1 },
    ]);
    expect(slider.total).toBe(3);
    expect(slider.type === "slider" && slider.buckets.map((b) => b.count)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0, 1]);

    const choice = aggregateGuesses(
      { type: "choice", options: [{ id: "A", en: "a", zh: "甲" }, { id: "B", en: "b", zh: "乙" }] },
      [{ value: "B", count: 3 }, { value: "Z", count: 9 }]
    );
    expect(choice).toEqual({ type: "choice", options: [{ id: "A", count: 0 }, { id: "B", count: 3 }], total: 3 });
  });

  it("normalises guess values per config", () => {
    const slider = { type: "slider", min: 0, max: 100, step: 1 } as const;
    expect(normaliseGuessValue(slider, " 42.0 ")).toBe("42");
    expect(normaliseGuessValue(slider, "101")).toBeNull();
    expect(normaliseGuessValue(slider, "")).toBeNull();
    expect(normaliseGuessValue(slider, "Infinity")).toBeNull();
    expect(normaliseGuessValue({ type: "compare", left: { en: "l", zh: "左" }, right: { en: "r", zh: "右" } }, "left")).toBe("left");
    expect(normaliseGuessValue({ type: "compare", left: { en: "l", zh: "左" }, right: { en: "r", zh: "右" } }, "up")).toBeNull();
  });
});

const servicesUp = await probeServices("guess");

describe.skipIf(!servicesUp)("guess router (Postgres + Redis)", () => {
  let f: Fixtures;

  beforeAll(async () => {
    installPrismaOpCounter();
    f = await createFixtures("guess");
  });

  afterAll(async () => {
    await cleanupFixtures(f);
  });

  afterEach(() => {
    delete process.env.GMQ_RL_GUESS_PER_HOUR;
  });

  it("rejects a guess with no identity", async () => {
    await expectTrpcError(callerFor().guess.submit({ questionId: f.multi.id, value: "A" }), "BAD_REQUEST");
  });

  it("ignores a malformed anon header (not a UUID v4)", async () => {
    await expectTrpcError(
      callerFor({ anonId: "not-a-uuid" }).guess.submit({ questionId: f.multi.id, value: "A" }),
      "BAD_REQUEST"
    );
  });

  it("upserts: re-guessing updates the same row instead of adding one", async () => {
    const anon = trackAnon(f);
    const caller = callerFor({ anonId: anon });

    await expect(caller.guess.submit({ questionId: f.multi.id, value: "A" })).resolves.toEqual({ ok: true, value: "A" });
    await caller.guess.submit({ questionId: f.multi.id, value: "C" });

    const rows = await db.guess.findMany({ where: { questionId: f.multi.id, anonId: anon } });
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe("C");
    expect(rows[0].userId).toBeNull();
  });

  it("records a signed-in user by userId, even when an anon id is also sent", async () => {
    const anon = trackAnon(f);
    await callerFor({ userId: f.userId, anonId: anon }).guess.submit({ questionId: f.multi.id, value: "B" });
    await callerFor({ userId: f.userId, anonId: anon }).guess.submit({ questionId: f.multi.id, value: "A" });

    const rows = await db.guess.findMany({ where: { questionId: f.multi.id, userId: f.userId } });
    expect(rows.map((r) => [r.value, r.anonId])).toEqual([["A", null]]);
    expect(await db.guess.count({ where: { questionId: f.multi.id, anonId: anon } })).toBe(0);
  });

  it("validates the value against the question's guessConfig", async () => {
    const caller = callerFor({ anonId: trackAnon(f) });
    await expectTrpcError(caller.guess.submit({ questionId: f.multi.id, value: "Z" }), "BAD_REQUEST");
    await expectTrpcError(caller.guess.submit({ questionId: f.estimate.id, value: "101" }), "BAD_REQUEST");
    await expectTrpcError(caller.guess.submit({ questionId: f.estimate.id, value: "lots" }), "BAD_REQUEST");
    await expectTrpcError(caller.guess.submit({ questionId: f.hidden.id, value: "1" }), "NOT_FOUND");
    await expectTrpcError(caller.guess.submit({ questionId: f.drill.id, value: "1" }), "BAD_REQUEST");
  });

  it("rate-limits per identity and stores nothing once limited", async () => {
    process.env.GMQ_RL_GUESS_PER_HOUR = "3";
    const anon = trackAnon(f);
    const caller = callerFor({ anonId: anon });
    for (const v of ["10", "20", "30"]) {
      await caller.guess.submit({ questionId: f.estimate.id, value: v });
    }
    await expectTrpcError(caller.guess.submit({ questionId: f.estimate.id, value: "40" }), "TOO_MANY_REQUESTS");

    const row = await db.guess.findUnique({ where: { questionId_anonId: { questionId: f.estimate.id, anonId: anon } } });
    expect(row?.value).toBe("30");
    const ttl = await redis.ttl(guessRateLimitKey(anon));
    expect(ttl).toBeGreaterThan(3500);
    expect(ttl).toBeLessThanOrEqual(3600);

    // Another identity is unaffected.
    await expect(
      callerFor({ anonId: trackAnon(f) }).guess.submit({ questionId: f.estimate.id, value: "40" })
    ).resolves.toMatchObject({ ok: true });
  });

  it("builds the slider histogram, includes the caller's own value and never the answer", async () => {
    await db.guess.deleteMany({ where: { questionId: f.estimate.id } });
    await redis.del(histogramKey(f.estimate.id));

    const values = ["0", "5", "10", "55", "100", "100"];
    const anons = values.map(() => trackAnon(f));
    for (let i = 0; i < values.length; i++) {
      await callerFor({ anonId: anons[i] }).guess.submit({ questionId: f.estimate.id, value: values[i] });
    }

    const hist = await callerFor({ anonId: anons[3] }).guess.histogram({ questionId: f.estimate.id });
    expect(hist.type).toBe("slider");
    if (hist.type !== "slider") return;
    expect(hist.total).toBe(6);
    expect(hist.buckets).toHaveLength(10);
    expect(hist.buckets.map((b) => b.count)).toEqual([2, 1, 0, 0, 0, 1, 0, 0, 0, 2]);
    expect(hist.buckets[0]).toMatchObject({ from: 0, to: 10 });
    expect(hist.mine).toBe("55");

    const anonymous = await callerFor().guess.histogram({ questionId: f.estimate.id });
    expect(anonymous.mine).toBeNull();
    expect(JSON.stringify(hist)).not.toMatch(/5000|truth|answer/);
  });

  it("serves the second histogram call from Redis without touching the DB", async () => {
    await redis.del(histogramKey(f.multi.id));
    const anon = trackAnon(f);
    const caller = callerFor({ anonId: anon });
    await caller.guess.submit({ questionId: f.multi.id, value: "B" });

    const first = await caller.guess.histogram({ questionId: f.multi.id });
    const before = prismaOpCount();
    const second = await caller.guess.histogram({ questionId: f.multi.id });
    const viaGuest = await callerFor().guess.histogram({ questionId: f.multi.id });
    expect(prismaOpCount() - before).toBe(0);

    expect(second).toEqual(first);
    expect(viaGuest.total).toBe(first.total);
    expect(second.mine).toBe("B");
    expect(await redis.ttl(histogramKey(f.multi.id))).toBeLessThanOrEqual(60);
  });

  it("builds the choice histogram and invalidates the cache on a new guess", async () => {
    await db.guess.deleteMany({ where: { questionId: f.multi.id } });
    await redis.del(histogramKey(f.multi.id));

    const a = callerFor({ anonId: trackAnon(f) });
    await a.guess.submit({ questionId: f.multi.id, value: "A" });
    const h1 = await a.guess.histogram({ questionId: f.multi.id });
    expect(h1).toMatchObject({
      type: "choice",
      total: 1,
      mine: "A",
      options: [
        { id: "A", count: 1 },
        { id: "B", count: 0 },
        { id: "C", count: 0 },
      ],
    });

    await callerFor({ anonId: trackAnon(f) }).guess.submit({ questionId: f.multi.id, value: "C" });
    await a.guess.submit({ questionId: f.multi.id, value: "C" }); // re-guess moves A -> C
    const h2 = await a.guess.histogram({ questionId: f.multi.id });
    expect(h2.total).toBe(2);
    expect(h2.mine).toBe("C");
    expect(h2.type !== "slider" && h2.options.map((o) => o.count)).toEqual([0, 0, 2]);
    expect(JSON.stringify(h2)).not.toContain("isCorrect");
  });

  it("returns NOT_FOUND for an unpublished question", async () => {
    await expectTrpcError(callerFor().guess.histogram({ questionId: f.hidden.id }), "NOT_FOUND");
  });
});
