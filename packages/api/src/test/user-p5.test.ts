import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@gmq/db";
import { redis } from "../redis";
import { nextStreak, streakGuardKey, touchStreak, utcDayNumber } from "../lib/streak";
import { findContinueQuestion, listSolvedHeroes } from "../routers/user";
import { EVENT_NAMES } from "../routers/event";
import { callerFor, probeServices } from "./helpers";

describe("streak rules (pure)", () => {
  it("counts UTC days", () => {
    expect(utcDayNumber(new Date("2026-10-22T23:59:59Z")) - utcDayNumber(new Date("2026-10-22T00:00:00Z"))).toBe(0);
    expect(utcDayNumber(new Date("2026-10-23T00:00:00Z")) - utcDayNumber(new Date("2026-10-22T23:59:59Z"))).toBe(1);
  });

  it("increments after yesterday, resets after a gap, holds on the same day", () => {
    expect(nextStreak(4, 1)).toBe(5);
    expect(nextStreak(4, 2)).toBe(1);
    expect(nextStreak(4, 30)).toBe(1);
    expect(nextStreak(4, 0)).toBe(4);
    expect(nextStreak(0, 0)).toBe(1); // a brand-new account's first activity
    expect(nextStreak(3, -1)).toBe(3); // clock skew is "today"
  });
});

const servicesUp = await probeServices("user-p5");

interface P5Fixtures {
  tag: string;
  userId: string;
  collectionId: string;
  heroA: string;
  heroB: string;
  hidden: string;
  drill: string;
  questionIds: string[];
  guardKeys: string[];
}

async function createP5Fixtures(): Promise<P5Fixtures> {
  const tag = `test-p5-user-${randomUUID().slice(0, 8)}`;
  const user = await db.user.create({
    data: { username: tag, displayName: "P5 Kid", password: "not-a-real-hash", age: 10 },
    select: { id: true },
  });
  const collection = await db.collection.create({
    data: {
      slug: tag,
      titleEn: "P5 World",
      titleZh: "P5 世界",
      descEn: "Fixture",
      descZh: "测试",
      emoji: "🧪",
      colorToken: "fun-purple",
      sortOrder: 99990,
    },
    select: { id: true },
  });
  const base = {
    contentEn: "Fixture prompt",
    contentZh: "测试题目",
    difficulty: "EASY",
    category: "ARITHMETIC",
    ageGroup: "AGE_8_10",
    isPublished: true,
    hints: [],
    answer: "7",
  } as const;
  const mk = async (suffix: string, extra: Record<string, unknown>) =>
    (
      await db.question.create({
        data: { ...base, titleEn: `P5 ${suffix}`, titleZh: `P5 ${suffix}`, ...extra },
        select: { id: true },
      })
    ).id;
  const guess = { type: "slider", min: 0, max: 10, step: 1 };
  const heroA = await mk("A", { kind: "THREE_ACT", slug: `${tag}-a`, sortOrder: 99991, collectionId: collection.id, hookEn: "Hook A", hookZh: "钩子 A", guessConfig: guess });
  const heroB = await mk("B", { kind: "THREE_ACT", slug: `${tag}-b`, sortOrder: 99992, collectionId: collection.id, hookEn: "Hook B", hookZh: "钩子 B", guessConfig: guess });
  const hidden = await mk("hidden", { kind: "THREE_ACT", slug: `${tag}-h`, sortOrder: 99993, collectionId: collection.id, isPublished: false });
  const drill = await mk("drill", { sortOrder: 99994 });
  return {
    tag,
    userId: user.id,
    collectionId: collection.id,
    heroA,
    heroB,
    hidden,
    drill,
    questionIds: [heroA, heroB, hidden, drill],
    guardKeys: [],
  };
}

async function cleanupP5(f: P5Fixtures | undefined): Promise<void> {
  if (!f) return;
  await db.event.deleteMany({ where: { OR: [{ userId: f.userId }, { questionId: { in: f.questionIds } }] } });
  await db.question.deleteMany({ where: { id: { in: f.questionIds } } }); // guesses + submissions cascade
  await db.collection.deleteMany({ where: { id: f.collectionId } });
  await db.user.deleteMany({ where: { id: f.userId } });
  const keys = [
    ...f.guardKeys,
    ...f.questionIds.flatMap((q) => [`guess:hist:${q}`, `guess:mine:${q}:${f.userId}`]),
    `rl:guess:${f.userId}`,
    `rl:event:${f.userId}`,
  ];
  await redis.del(...keys);
}

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe.skipIf(!servicesUp)("touchStreak (Postgres + Redis)", () => {
  let f: P5Fixtures;

  beforeAll(async () => {
    f = await createP5Fixtures();
  });
  afterAll(async () => {
    await cleanupP5(f);
  });

  /** Puts the user at `streak` with last activity on `lastIso`, and clears the guard for `todayIso`. */
  async function setUser(streak: number, lastIso: string, todayIso: string) {
    await db.user.update({ where: { id: f.userId }, data: { streak, lastActiveAt: day(lastIso) } });
    const key = streakGuardKey(f.userId, todayIso);
    f.guardKeys.push(key);
    await redis.del(key);
  }
  const read = () => db.user.findUniqueOrThrow({ where: { id: f.userId }, select: { streak: true, lastActiveAt: true } });

  it("increments on consecutive days", async () => {
    await setUser(3, "2098-03-01", "2098-03-02");
    expect(await touchStreak(db, f.userId, day("2098-03-02"))).toEqual({ streak: 4, changed: true });
    f.guardKeys.push(streakGuardKey(f.userId, "2098-03-03"));
    expect(await touchStreak(db, f.userId, day("2098-03-03"))).toEqual({ streak: 5, changed: true });
    const row = await read();
    expect(row.streak).toBe(5);
    expect(row.lastActiveAt.toISOString().slice(0, 10)).toBe("2098-03-03");
  });

  it("resets to 1 after a missed day", async () => {
    await setUser(9, "2098-03-01", "2098-03-04");
    expect(await touchStreak(db, f.userId, day("2098-03-04"))).toEqual({ streak: 1, changed: true });
    expect((await read()).streak).toBe(1);
  });

  it("is idempotent within a day: the Redis guard skips the DB", async () => {
    await setUser(2, "2098-03-01", "2098-03-02");
    await touchStreak(db, f.userId, day("2098-03-02"));
    const again = await touchStreak(db, f.userId, new Date("2098-03-02T23:59:00Z"));
    expect(again).toEqual({ streak: null, changed: false });
    expect((await read()).streak).toBe(3);
  });

  it("is idempotent within a day without Redis too (guard lost)", async () => {
    await setUser(2, "2098-03-01", "2098-03-02");
    await touchStreak(db, f.userId, day("2098-03-02"));
    await redis.del(streakGuardKey(f.userId, "2098-03-02")); // simulate a flushed/failed guard
    expect(await touchStreak(db, f.userId, new Date("2098-03-02T20:00:00Z"))).toEqual({ streak: 3, changed: false });
    expect((await read()).streak).toBe(3);
  });

  it("counts once under concurrent first touches", async () => {
    await setUser(5, "2098-03-01", "2098-03-02");
    const now = day("2098-03-02");
    const results = await Promise.all(Array.from({ length: 5 }, () => touchStreak(db, f.userId, now)));
    expect(results.filter((r) => r.changed)).toHaveLength(1);
    expect((await read()).streak).toBe(6);
  });

  it("starts a new account at 1 on its first active day", async () => {
    await setUser(0, "2098-03-02", "2098-03-02");
    expect(await touchStreak(db, f.userId, day("2098-03-02"))).toEqual({ streak: 1, changed: true });
  });

  it("ignores unknown users", async () => {
    const ghost = `test-p5-ghost-${randomUUID()}`;
    f.guardKeys.push(streakGuardKey(ghost, "2098-03-02"));
    expect(await touchStreak(db, ghost, day("2098-03-02"))).toEqual({ streak: null, changed: false });
  });
});

describe.skipIf(!servicesUp)("streak triggers and hint_reveal (routers)", () => {
  let f: P5Fixtures;
  const today = () => new Date().toISOString().slice(0, 10);
  const yesterday = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

  beforeAll(async () => {
    f = await createP5Fixtures();
  });
  afterAll(async () => {
    await cleanupP5(f);
  });
  beforeEach(async () => {
    await db.user.update({ where: { id: f.userId }, data: { streak: 4, lastActiveAt: yesterday() } });
    const key = streakGuardKey(f.userId, today());
    f.guardKeys.push(key);
    await redis.del(key);
  });
  const streakNow = async () => (await db.user.findUniqueOrThrow({ where: { id: f.userId }, select: { streak: true } })).streak;

  it("guess.submit by a signed-in user extends the streak once per day", async () => {
    const caller = callerFor({ userId: f.userId });
    await caller.guess.submit({ questionId: f.heroA, value: "3" });
    expect(await streakNow()).toBe(5);
    await caller.guess.submit({ questionId: f.heroB, value: "4" });
    expect(await streakNow()).toBe(5);
    expect(await caller.user.streak()).toEqual({ streak: 5, activeToday: true });
  });

  it("event.track scene_interact extends the streak; other events do not", async () => {
    const caller = callerFor({ userId: f.userId });
    await caller.event.track({ name: "question_view", questionId: f.heroA });
    await caller.event.track({ name: "hint_reveal", questionId: f.heroA, props: { index: 1 } });
    expect(await streakNow()).toBe(4);
    await caller.event.track({ name: "scene_interact", questionId: f.heroA, props: { event: "drag" } });
    expect(await streakNow()).toBe(5);
  });

  it("accepts hint_reveal in the whitelist and stores its props", async () => {
    expect(EVENT_NAMES).toContain("hint_reveal");
    await callerFor({ userId: f.userId }).event.track({ name: "hint_reveal", questionId: f.heroB, props: { index: 2 } });
    const row = await db.event.findFirst({ where: { userId: f.userId, name: "hint_reveal", questionId: f.heroB } });
    expect(row?.props).toEqual({ index: 2 });
  });

  it("user.streak reads a broken streak as 0", async () => {
    await db.user.update({ where: { id: f.userId }, data: { streak: 7, lastActiveAt: new Date(Date.now() - 3 * 86_400_000) } });
    expect(await callerFor({ userId: f.userId }).user.streak()).toEqual({ streak: 0, activeToday: false });
  });
});

describe.skipIf(!servicesUp)("solved heroes and continue (Postgres)", () => {
  let f: P5Fixtures;

  beforeAll(async () => {
    f = await createP5Fixtures();
  });
  afterAll(async () => {
    await cleanupP5(f);
  });

  const solve = (questionId: string, isCorrect = true) =>
    db.submission.create({ data: { userId: f.userId, questionId, answer: "7", isCorrect, timeSpent: 5 } });
  const view = (questionId: string, at: Date, name = "question_view") =>
    db.event.create({ data: { name, userId: f.userId, questionId, createdAt: at } });

  it("continue is null for a user with no history", async () => {
    expect(await callerFor({ userId: f.userId }).user.continueQuestion()).toBeNull();
  });

  it("counts only correct hero submissions, per world, once per question", async () => {
    await solve(f.heroA, false);
    expect(await listSolvedHeroes(db, f.userId)).toEqual({ ids: [], byCollection: {} });
    await solve(f.heroA);
    await solve(f.heroA);
    await solve(f.drill);
    const solved = await callerFor({ userId: f.userId }).user.solvedHeroIds();
    expect(solved.ids).toEqual([f.heroA]);
    expect(solved.byCollection).toEqual({ [f.collectionId]: 1 });
  });

  it("continue returns the most recent unsolved hero question, skipping solved, drill and hidden", async () => {
    const t0 = Date.now() - 60_000;
    await view(f.heroB, new Date(t0));
    await view(f.heroA, new Date(t0 + 10_000)); // solved above
    await view(f.drill, new Date(t0 + 20_000));
    await view(f.hidden, new Date(t0 + 30_000));
    const card = await findContinueQuestion(db, f.userId);
    expect(card?.id).toBe(f.heroB);
    expect(card).toMatchObject({ hookEn: "Hook B", slug: `${f.tag}-b`, collectionId: f.collectionId });
    expect(card).not.toHaveProperty("answer");
    expect(card).not.toHaveProperty("contentEn");
  });

  it("a guess counts as recent activity too, and solving it hides it", async () => {
    await db.guess.create({ data: { questionId: f.heroB, userId: f.userId, value: "2" } });
    expect((await findContinueQuestion(db, f.userId))?.id).toBe(f.heroB);
    await solve(f.heroB);
    expect(await findContinueQuestion(db, f.userId)).toBeNull();
  });

  it("requires a session", async () => {
    await expect(callerFor().user.solvedHeroIds()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(callerFor().user.continueQuestion()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
