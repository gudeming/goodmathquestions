import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@gmq/db";
import { redis } from "../redis";
import {
  dailyGuessCountKey,
  dailyKey,
  getTodayPuzzle,
  pickSurprise,
  secondsUntilUtcMidnight,
  utcDay,
} from "../routers/daily";
import { callerFor, installPrismaOpCounter, prismaOpCount, probeServices } from "./helpers";

describe("secondsUntilUtcMidnight (pure)", () => {
  it("counts down to the next 00:00 UTC and never returns 0", () => {
    expect(secondsUntilUtcMidnight(new Date("2026-10-22T00:00:00Z"))).toBe(86_400);
    expect(secondsUntilUtcMidnight(new Date("2026-10-22T23:59:30Z"))).toBe(30);
    expect(secondsUntilUtcMidnight(new Date("2026-10-22T23:59:59.900Z"))).toBe(1);
    expect(secondsUntilUtcMidnight(new Date("2026-12-31T12:00:00Z"))).toBe(43_200);
  });
});

const servicesUp = await probeServices("daily-p5");

// Far-future days that no real request will ever use.
const DAYS = ["2098-05-01", "2098-05-02", "2098-05-03"];
const at = (iso: string) => new Date(`${iso}T08:00:00Z`);

interface DailyFixtures {
  tag: string;
  userId: string;
  heroA: string;
  heroB: string;
  hidden: string;
  questionIds: string[];
  anonIds: string[];
}

async function createDailyFixtures(): Promise<DailyFixtures> {
  const tag = `test-p5-daily-${randomUUID().slice(0, 8)}`;
  const user = await db.user.create({
    data: { username: tag, displayName: "P5 Daily", password: "not-a-real-hash", age: 11 },
    select: { id: true },
  });
  const base = {
    contentEn: "Fixture prompt",
    contentZh: "测试题目",
    difficulty: "EASY",
    category: "ARITHMETIC",
    ageGroup: "AGE_10_12",
    hints: [],
    answer: "7",
    kind: "THREE_ACT",
    guessConfig: { type: "slider", min: 0, max: 10, step: 1 },
  } as const;
  const mk = async (suffix: string, sortOrder: number, isPublished = true) =>
    (
      await db.question.create({
        data: { ...base, titleEn: `P5 ${suffix}`, titleZh: `P5 ${suffix}`, slug: `${tag}-${suffix}`, sortOrder, isPublished, hookEn: `Hook ${suffix}` },
        select: { id: true },
      })
    ).id;
  const heroA = await mk("a", 99981);
  const heroB = await mk("b", 99982);
  const hidden = await mk("h", 99983, false);
  return { tag, userId: user.id, heroA, heroB, hidden, questionIds: [heroA, heroB, hidden], anonIds: [] };
}

describe.skipIf(!servicesUp)("daily.today cache (Postgres + Redis)", () => {
  let f: DailyFixtures;

  beforeAll(async () => {
    installPrismaOpCounter();
    f = await createDailyFixtures();
    await redis.del(...DAYS.map(dailyKey));
  });

  afterAll(async () => {
    await db.dailyPuzzle.deleteMany({ where: { date: { in: DAYS.map((d) => utcDay(at(d)).date) } } });
    await db.question.deleteMany({ where: { id: { in: f.questionIds } } });
    await db.user.deleteMany({ where: { id: f.userId } });
    await redis.del(...DAYS.map(dailyKey), ...f.questionIds.map(dailyGuessCountKey));
  });

  it("caches the day's question id until midnight UTC and stays stable", async () => {
    const now = at(DAYS[0]);
    const first = await getTodayPuzzle(db, now);
    expect(first).not.toBeNull();
    expect(first?.kind).not.toBe("DRILL");
    expect(first).not.toHaveProperty("answer");
    expect(typeof first?.guessCount).toBe("number");

    expect(await redis.get(dailyKey(DAYS[0]))).toBe(JSON.stringify(first?.id));
    const ttl = await redis.ttl(dailyKey(DAYS[0]));
    expect(ttl).toBeGreaterThan(secondsUntilUtcMidnight(now) - 5);
    expect(ttl).toBeLessThanOrEqual(secondsUntilUtcMidnight(now));

    // Warm call: one primary-key read, guess count served from Redis.
    const before = prismaOpCount();
    const second = await getTodayPuzzle(db, new Date(`${DAYS[0]}T22:00:00Z`));
    expect(prismaOpCount() - before).toBe(1);
    expect(second?.id).toBe(first?.id);
    expect(await db.dailyPuzzle.count({ where: { date: utcDay(now).date } })).toBe(1);
  });

  it("returns guessCount from Guess rows, cached for 60 s", async () => {
    await redis.set(dailyKey(DAYS[1]), JSON.stringify(f.heroA), "EX", 600);
    await redis.del(dailyGuessCountKey(f.heroA));
    for (const value of ["1", "2"]) {
      const anonId = randomUUID();
      f.anonIds.push(anonId);
      await db.guess.create({ data: { questionId: f.heroA, anonId, value } });
    }
    const puzzle = await getTodayPuzzle(db, at(DAYS[1]));
    expect(puzzle?.id).toBe(f.heroA);
    expect(puzzle?.guessCount).toBe(2);

    await db.guess.create({ data: { questionId: f.heroA, userId: f.userId, value: "3" } });
    expect((await getTodayPuzzle(db, at(DAYS[1])))?.guessCount).toBe(2); // still cached
    const ttl = await redis.ttl(dailyGuessCountKey(f.heroA));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
    await redis.del(dailyGuessCountKey(f.heroA));
    expect((await getTodayPuzzle(db, at(DAYS[1])))?.guessCount).toBe(3);
  });

  it("ignores a cached id whose question is unpublished and re-caches the real pick", async () => {
    await redis.set(dailyKey(DAYS[2]), JSON.stringify(f.hidden), "EX", 600);
    const puzzle = await getTodayPuzzle(db, at(DAYS[2]));
    expect(puzzle).not.toBeNull();
    expect(puzzle?.id).not.toBe(f.hidden);
    expect(await redis.get(dailyKey(DAYS[2]))).toBe(JSON.stringify(puzzle?.id));
  });

  it("daily.today through the router includes guessCount and is stable across calls", async () => {
    const a = await callerFor().daily.today();
    const b = await callerFor().daily.today();
    expect(a?.id).toBe(b?.id);
    expect(a?.guessCount).toBeGreaterThanOrEqual(0);
  });
});

describe.skipIf(!servicesUp)("daily.surprise (Postgres)", () => {
  let f: DailyFixtures;
  let heroIds: string[];

  beforeAll(async () => {
    f = await createDailyFixtures();
    heroIds = (
      await db.question.findMany({ where: { isPublished: true, kind: { not: "DRILL" } }, select: { id: true } })
    ).map((q) => q.id);
  });

  afterAll(async () => {
    await db.question.deleteMany({ where: { id: { in: f.questionIds } } });
    await db.user.deleteMany({ where: { id: f.userId } }); // submissions cascade
  });

  const solveAllExcept = async (keep: string[]) => {
    await db.submission.deleteMany({ where: { userId: f.userId } });
    await db.submission.createMany({
      data: heroIds
        .filter((id) => !keep.includes(id))
        .map((questionId) => ({ userId: f.userId, questionId, answer: "x", isCorrect: true, timeSpent: 1 })),
    });
  };

  it("gives guests any published hero question", async () => {
    for (const r of [0, 0.5, 0.9999]) {
      const pick = await pickSurprise(db, null, null, () => r);
      expect(pick && heroIds.includes(pick.id)).toBe(true);
      expect(pick?.allSolved).toBe(false);
    }
    expect((await callerFor().daily.surprise())?.id).toBeTruthy();
  });

  it("never returns a question the user has solved", async () => {
    await solveAllExcept([f.heroB]);
    for (const r of [0, 0.3, 0.9999]) {
      expect(await pickSurprise(db, f.userId, null, () => r)).toMatchObject({ id: f.heroB, allSolved: false });
    }
    const viaRouter = await callerFor({ userId: f.userId }).daily.surprise({});
    expect(viaRouter?.id).toBe(f.heroB);
  });

  it("skips excludeId when something else is unsolved, but not when it is the only one", async () => {
    await solveAllExcept([f.heroA, f.heroB]);
    expect((await pickSurprise(db, f.userId, f.heroA, () => 0))?.id).toBe(f.heroB);
    await solveAllExcept([f.heroA]);
    expect((await pickSurprise(db, f.userId, f.heroA, () => 0))?.id).toBe(f.heroA);
  });

  it("falls back to any hero question with allSolved when everything is solved", async () => {
    await solveAllExcept([]);
    const pick = await pickSurprise(db, f.userId, f.heroA, () => 0.5);
    expect(pick?.allSolved).toBe(true);
    expect(pick?.id).not.toBe(f.heroA);
    expect(heroIds).toContain(pick?.id);
  });
});
