import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@gmq/db";
import { redis } from "../redis";
import { parseVariants, toPublicVariant } from "../lib/variant";
import { callerFor, probeServices } from "./helpers";

/**
 * "Try another number": question.variants / checkVariant / submitVariant / revealVariant.
 * Every fixture row is prefixed "test-var-" and removed in afterAll.
 */
const servicesUp = await probeServices("variant");

/** Shaped like heroVariantsData() output for handshake-party (abridged copy). */
const variant = (n: number) => ({
  id: `people${n}`,
  params: { people: n },
  prompt: { en: `${n} friends shake hands. How many handshakes?`, zh: `${n} 个朋友握手。一共几次？` },
  scene: { type: "handshake_graph", people: n },
  answer: { type: "NUMERIC", value: (n * (n - 1)) / 2 },
  answerText: String((n * (n - 1)) / 2),
  choices: null,
  hints: [
    { en: "Start with person 1.", zh: "从 1 号开始。" },
    { en: "Everyone shakes n - 1 hands.", zh: "每人握 n - 1 次。" },
    { en: "Halve n × (n - 1).", zh: "把 n ×（n - 1）除以 2。" },
  ],
  wrongAnswers: [{ match: String(n * (n - 1)), feedback: { en: "Counted twice.", zh: "数了两遍。" } }],
  explanation: { en: `${n} × ${n - 1} ÷ 2.`, zh: `${n} × ${n - 1} ÷ 2。` },
  aha: { en: `${n} people, ${(n * (n - 1)) / 2} handshakes.`, zh: `${n} 个人，${(n * (n - 1)) / 2} 次握手。` },
});

describe("lib/variant (pure)", () => {
  it("drops malformed variants and never exposes the answer, feedback, explanation or aha", () => {
    const parsed = parseVariants([variant(6), { id: "broken" }], "q1");
    expect(parsed.map((v) => v.id)).toEqual(["people6"]);
    const pub = toPublicVariant(parsed[0]!);
    expect(Object.keys(pub).sort()).toEqual(["choices", "hints", "id", "params", "prompt", "scene"]);
    expect(JSON.stringify(pub)).not.toContain("Counted twice");
    expect(parseVariants(null, "q1")).toEqual([]);
  });
});

interface Fixtures {
  tag: string;
  questionId: string;
  plainId: string;
  userIds: string[];
}

async function createFixtures(): Promise<Fixtures> {
  const tag = `test-var-${randomUUID().slice(0, 8)}`;
  const base = {
    contentEn: "10 friends shake hands. How many handshakes?",
    contentZh: "10 个朋友握手。一共几次？",
    difficulty: "EASY",
    category: "LOGIC",
    ageGroup: "AGE_8_10",
    isPublished: true,
    hints: [],
    answer: "45",
    kind: "THREE_ACT",
    answerType: "NUMERIC",
    answerRule: { type: "NUMERIC", value: 45 },
  } as const;
  const q = await db.question.create({
    data: { ...base, titleEn: "Var", titleZh: "Var", slug: `${tag}-q`, variants: [variant(6), variant(8), variant(12)], variantCount: 3 },
    select: { id: true },
  });
  const plain = await db.question.create({
    data: { ...base, titleEn: "Plain", titleZh: "Plain", slug: `${tag}-plain` },
    select: { id: true },
  });
  return { tag, questionId: q.id, plainId: plain.id, userIds: [] };
}

async function newUser(f: Fixtures): Promise<string> {
  const user = await db.user.create({
    data: { username: `${f.tag}-${f.userIds.length}`, displayName: "Var Kid", password: "not-a-real-hash", age: 10 },
    select: { id: true },
  });
  f.userIds.push(user.id);
  return user.id;
}

describe.skipIf(!servicesUp)("question variants (Postgres)", () => {
  let f: Fixtures;
  beforeAll(async () => {
    f = await createFixtures();
  });
  afterAll(async () => {
    if (!f) return;
    await db.question.deleteMany({ where: { id: { in: [f.questionId, f.plainId] } } });
    await db.user.deleteMany({ where: { id: { in: f.userIds } } });
    const keys = f.userIds.map((u) => `rl:event:${u}`);
    if (keys.length > 0) await redis.del(...keys);
  });

  it("lists public variants (no answers) and the public question carries variantCount", async () => {
    const caller = callerFor();
    const list = await caller.question.variants({ questionId: f.questionId });
    expect(list.map((v) => v.id)).toEqual(["people6", "people8", "people12"]);
    expect(JSON.stringify(list)).not.toMatch(/answerText|wrongAnswers|aha|explanation/);
    expect(await caller.question.variants({ questionId: f.plainId })).toEqual([]);
    expect((await caller.question.getById({ id: f.questionId })).variantCount).toBe(3);
    expect((await caller.question.getById({ id: f.plainId })).variantCount).toBe(0);
  });

  it("guests: checkVariant judges against the variant's own answer and feedback", async () => {
    const caller = callerFor();
    const wrong = await caller.question.checkVariant({ questionId: f.questionId, variantId: "people8", answer: "56" });
    expect(wrong).toMatchObject({ isCorrect: false, feedback: { en: "Counted twice." }, aha: null, explanation: null });
    // The standard answer is not the variant's answer.
    expect((await caller.question.checkVariant({ questionId: f.questionId, variantId: "people8", answer: "45" })).isCorrect).toBe(false);
    const right = await caller.question.checkVariant({ questionId: f.questionId, variantId: "people8", answer: "28" });
    expect(right).toMatchObject({ isCorrect: true, aha: { en: "8 people, 28 handshakes." } });
    await expect(caller.question.checkVariant({ questionId: f.questionId, variantId: "people99", answer: "1" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    // Guests may always "show me".
    expect(await caller.question.revealVariant({ questionId: f.questionId, variantId: "people12" })).toMatchObject({ answer: "66" });
  });

  it("signed in: no variant XP before the standard version is done", async () => {
    const userId = await newUser(f);
    const caller = callerFor({ userId });
    const res = await caller.question.submitVariant({ questionId: f.questionId, variantId: "people6", answer: "15" });
    expect(res).toMatchObject({ isCorrect: true, xpEarned: 0, attempt: 1 });
  });

  it("signed in: +3 once per variant after solving the standard version; none after 'show me' unlocks", async () => {
    const userId = await newUser(f);
    const caller = callerFor({ userId });
    await caller.question.submitAnswer({ questionId: f.questionId, answer: "45", timeSpent: 5 });
    const xpAfterStandard = (await db.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true } })).xp;

    const submit = (variantId: string, answer: string) => caller.question.submitVariant({ questionId: f.questionId, variantId, answer });

    expect(await submit("people6", "30")).toMatchObject({ isCorrect: false, xpEarned: 0, feedback: { en: "Counted twice." } });
    expect(await submit("people6", "15")).toMatchObject({ isCorrect: true, xpEarned: 3, attempt: 2, aha: { en: "6 people, 15 handshakes." } });
    expect((await submit("people6", "15")).xpEarned).toBe(0); // once per variant

    expect((await submit("people8", "28")).xpEarned).toBe(3); // another variant pays again

    // Three misses unlock "show me"; a correct answer after that earns nothing.
    await expect(caller.question.revealVariant({ questionId: f.questionId, variantId: "people12" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    for (const a of ["1", "2", "3"]) await submit("people12", a);
    expect(await caller.question.revealVariant({ questionId: f.questionId, variantId: "people12" })).toMatchObject({ answer: "66" });
    expect(await submit("people12", "66")).toMatchObject({ isCorrect: true, xpEarned: 0 });

    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true } });
    expect(user.xp - xpAfterStandard).toBe(6);
    // Variant tries never count as attempts on the standard version.
    expect(await db.submission.count({ where: { userId } })).toBe(1);
  });
});
