import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@gmq/db";
import { redis } from "../redis";
import { callerFor, probeServices } from "./helpers";

/**
 * Phase 4: question.resolve (id or slug) and the submitAnswer XP rules.
 * Every fixture row is prefixed "test-p4-" and removed in afterAll.
 */
const servicesUp = await probeServices("question-flow");

interface P4Fixtures {
  tag: string;
  userIds: string[];
  hero: { id: string; slug: string };
  noGuessRow: { id: string; slug: string };
  hidden: { id: string; slug: string };
  drill: { id: string };
  questionIds: string[];
}

async function createP4Fixtures(): Promise<P4Fixtures> {
  const tag = `test-p4-${randomUUID().slice(0, 8)}`;
  const base = {
    contentEn: "What is 1 + 2 + … + 100?",
    contentZh: "1 + 2 + … + 100 等于多少？",
    difficulty: "MEDIUM",
    category: "ARITHMETIC",
    ageGroup: "AGE_10_12",
    isPublished: true,
    hints: [],
    answer: "5050",
  } as const;
  const hero = (suffix: string, extra: Record<string, unknown> = {}) =>
    db.question.create({
      data: {
        ...base,
        titleEn: `P4 ${suffix}`,
        titleZh: `P4 ${suffix}`,
        slug: `${tag}-${suffix}`,
        kind: "THREE_ACT",
        answerType: "NUMERIC",
        hookEn: "A boy finished in seconds. How?",
        hookZh: "一个男孩几秒钟就算完了。他是怎么做到的？",
        guessConfig: {
          type: "choice",
          options: [
            { id: "A", en: "About 1,000", zh: "大约 1,000" },
            { id: "B", en: "About 5,000", zh: "大约 5,000" },
          ],
        },
        answerRule: { type: "NUMERIC", value: 5050 },
        wrongAnswerFeedback: [{ match: "10100", feedback: { en: "Each pair twice.", zh: "每对数了两遍。" } }],
        ahaEn: "Pairs!",
        ahaZh: "配对！",
        ...extra,
      },
      select: { id: true, slug: true },
    });

  const h = await hero("hero");
  const n = await hero("noguess");
  const hidden = await hero("hidden", { isPublished: false });
  const drill = await db.question.create({
    data: { ...base, titleEn: "P4 drill", titleZh: "P4 练习" },
    select: { id: true },
  });
  return {
    tag,
    userIds: [],
    hero: { id: h.id, slug: h.slug ?? "" },
    noGuessRow: { id: n.id, slug: n.slug ?? "" },
    hidden: { id: hidden.id, slug: hidden.slug ?? "" },
    drill,
    questionIds: [h.id, n.id, hidden.id, drill.id],
  };
}

async function newUser(f: P4Fixtures, xp = 0): Promise<string> {
  const user = await db.user.create({
    data: {
      username: `${f.tag}-${f.userIds.length}`,
      displayName: "P4 Kid",
      password: "not-a-real-hash",
      age: 10,
      xp,
    },
    select: { id: true },
  });
  f.userIds.push(user.id);
  return user.id;
}

async function cleanupP4(f: P4Fixtures | undefined): Promise<void> {
  if (!f) return;
  await db.question.deleteMany({ where: { id: { in: f.questionIds } } }); // guesses + submissions cascade
  await db.user.deleteMany({ where: { id: { in: f.userIds } } });
  const keys = [
    ...f.questionIds.map((q) => `guess:hist:${q}`),
    ...f.questionIds.flatMap((q) => f.userIds.map((u) => `guess:mine:${q}:${u}`)),
    ...f.userIds.flatMap((u) => [`rl:guess:${u}`, `rl:event:${u}`]),
  ];
  if (keys.length > 0) await redis.del(...keys);
}

describe.skipIf(!servicesUp)("question.resolve (Postgres)", () => {
  let f: P4Fixtures;
  beforeAll(async () => {
    f = await createP4Fixtures();
  });
  afterAll(async () => {
    await cleanupP4(f);
  });

  it("resolves a hero question by slug and by id, exposing its slug for the redirect", async () => {
    const caller = callerFor();
    const bySlug = await caller.question.resolve({ idOrSlug: f.hero.slug });
    const byId = await caller.question.resolve({ idOrSlug: f.hero.id });
    expect(bySlug).toMatchObject({ id: f.hero.id, slug: f.hero.slug, kind: "THREE_ACT" });
    expect(byId).toMatchObject({ id: f.hero.id, slug: f.hero.slug });
    expect(byId).not.toHaveProperty("answerRule");
  });

  it("resolves a legacy DRILL question by id (no slug)", async () => {
    await expect(callerFor().question.resolve({ idOrSlug: f.drill.id })).resolves.toMatchObject({
      id: f.drill.id,
      slug: null,
      kind: "DRILL",
    });
  });

  it("hides unpublished questions and unknown params", async () => {
    for (const idOrSlug of [f.hidden.slug, f.hidden.id, `${f.tag}-nope`, "Not A Slug!"]) {
      await expect(callerFor().question.resolve({ idOrSlug })).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
  });
});

describe.skipIf(!servicesUp)("submitAnswer XP rules (Postgres)", () => {
  let f: P4Fixtures;
  beforeAll(async () => {
    f = await createP4Fixtures();
  });
  afterAll(async () => {
    await cleanupP4(f);
  });

  it("guessed + first try + correct + no hints: 5 + 5 + 25 + 10, once", async () => {
    const userId = await newUser(f);
    const caller = callerFor({ userId });
    await caller.guess.submit({ questionId: f.hero.id, value: "B" });

    const first = await caller.question.submitAnswer({
      questionId: f.hero.id,
      answer: "5050",
      timeSpent: 12,
      hintsUsed: 0,
      guessed: true,
    });
    expect(first).toMatchObject({
      isCorrect: true,
      attempt: 1,
      xpEarned: 45,
      xpBreakdown: { guess: 5, firstAttempt: 5, correct: 25, noHints: 10, total: 45 },
    });

    // Re-submitting the right answer (refresh, double click) earns nothing more.
    const again = await caller.question.submitAnswer({
      questionId: f.hero.id,
      answer: "5050",
      timeSpent: 13,
      hintsUsed: 0,
      guessed: true,
    });
    expect(again).toMatchObject({ isCorrect: true, attempt: 2, xpEarned: 0 });

    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true, level: true } });
    expect(user).toEqual({ xp: 45, level: 1 });
    const subs = await db.submission.findMany({ where: { userId }, orderBy: { attempt: "asc" }, select: { xpEarned: true } });
    expect(subs.map((s) => s.xpEarned)).toEqual([45, 0]);
  });

  it("claims of a guess without a Guess row earn no guess XP; wrong tries only pay the first attempt", async () => {
    const userId = await newUser(f);
    const caller = callerFor({ userId });
    const submit = (answer: string, hintsUsed: number) =>
      caller.question.submitAnswer({ questionId: f.noGuessRow.id, answer, timeSpent: 3, hintsUsed, guessed: true });

    const w1 = await submit("10100", 0);
    expect(w1).toMatchObject({ isCorrect: false, xpEarned: 5, xpBreakdown: { guess: 0, firstAttempt: 5 } });
    expect(w1.feedback?.en).toBe("Each pair twice.");
    expect((await submit("5000", 1)).xpEarned).toBe(0);
    const right = await submit("5050", 1);
    expect(right).toMatchObject({ isCorrect: true, attempt: 3, xpEarned: 25, xpBreakdown: { correct: 25, noHints: 0 } });

    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true } });
    expect(user.xp).toBe(30);
  });

  it("keeps the level-up rule (every 100 XP)", async () => {
    const userId = await newUser(f, 90);
    const res = await callerFor({ userId }).question.submitAnswer({ questionId: f.hero.id, answer: "5050", timeSpent: 1 });
    // No guess claimed, hintsUsed defaults to 0: 5 + 25 + 10.
    expect(res.xpEarned).toBe(40);
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true, level: true } });
    expect(user).toEqual({ xp: 130, level: 2 });
  });

  it("DRILL questions follow the same rules (first attempt + correct)", async () => {
    const userId = await newUser(f);
    const res = await callerFor({ userId }).question.submitAnswer({
      questionId: f.drill.id,
      answer: "5050",
      timeSpent: 1,
      hintsUsed: 3,
    });
    expect(res).toMatchObject({ isCorrect: true, xpEarned: 30, xpBreakdown: { firstAttempt: 5, correct: 25, noHints: 0 } });
  });
});

describe.skipIf(!servicesUp)("question.reveal / expressionRules (Postgres)", () => {
  let f: P4Fixtures;
  let expr: { id: string };
  let monty: { id: string };
  beforeAll(async () => {
    f = await createP4Fixtures();
    const base = {
      contentEn: "Fixture",
      contentZh: "测试",
      difficulty: "MEDIUM",
      category: "LOGIC",
      ageGroup: "AGE_10_12",
      isPublished: true,
      hints: [],
    } as const;
    expr = await db.question.create({
      data: {
        ...base,
        titleEn: "P4 four fours",
        titleZh: "P4 四个 4",
        kind: "OPEN_MIDDLE",
        answerType: "EXPRESSION",
        answer: "44/4-4",
        answerRule: { type: "EXPRESSION", target: 7, allowedNumbers: [4, 4, 4, 4], allowedOps: ["+", "-", "*", "/", "concat"] },
      },
      select: { id: true },
    });
    monty = await db.question.create({
      data: {
        ...base,
        titleEn: "P4 monty",
        titleZh: "P4 换不换",
        kind: "PARADOX",
        answerType: "CHOICE",
        answer: "switch",
        guessConfig: {
          type: "choice",
          options: [
            { id: "switch", en: "Switch", zh: "换" },
            { id: "stay", en: "Stay", zh: "不换" },
          ],
        },
        answerRule: { type: "CHOICE", correctId: "switch" },
        ahaEn: "Two thirds.",
        ahaZh: "三分之二。",
      },
      select: { id: true },
    });
    f.questionIds.push(expr.id, monty.id);
  });
  afterAll(async () => {
    await cleanupP4(f);
  });

  it("guests can reveal; the truth is marked for a slider-less NUMERIC hero only when derivable", async () => {
    const res = await callerFor().question.reveal({ questionId: f.hero.id });
    expect(res).toMatchObject({ answer: "5050", aha: { en: "Pairs!", zh: "配对！" }, guessTruth: null });
    const m = await callerFor().question.reveal({ questionId: monty.id });
    expect(m.guessTruth).toBe("switch");
  });

  it("signed-in users need a correct answer or 3 attempts before reveal", async () => {
    const userId = await newUser(f);
    const caller = callerFor({ userId });
    await expect(caller.question.reveal({ questionId: f.noGuessRow.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    for (const answer of ["1", "2", "3"]) {
      await caller.question.submitAnswer({ questionId: f.noGuessRow.id, answer, timeSpent: 1 });
    }
    await expect(caller.question.reveal({ questionId: f.noGuessRow.id })).resolves.toMatchObject({ answer: "5050" });
  });

  it("expressionRules exposes numbers and ops but never the target; EXPRESSION is judged end to end", async () => {
    const rules = await callerFor().question.expressionRules({ questionId: expr.id });
    expect(rules).toEqual({ allowedNumbers: [4, 4, 4, 4], allowedOps: ["+", "-", "*", "/", "concat"] });
    expect(JSON.stringify(rules)).not.toContain("target");
    await expect(callerFor().question.expressionRules({ questionId: f.hero.id })).resolves.toBeNull();

    const caller = callerFor();
    await expect(caller.question.checkAnswer({ questionId: expr.id, answer: "44/4-4" })).resolves.toMatchObject({ isCorrect: true });
    await expect(caller.question.checkAnswer({ questionId: expr.id, answer: "4+4-4/4" })).resolves.toMatchObject({ isCorrect: true });
    await expect(caller.question.checkAnswer({ questionId: expr.id, answer: "4+4-4/4+4-4" })).resolves.toMatchObject({ isCorrect: false });
    await expect(caller.question.checkAnswer({ questionId: expr.id, answer: "4!+4-4-4" })).resolves.toMatchObject({ isCorrect: false });
  });
});
