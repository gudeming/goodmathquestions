import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@gmq/db";
import { redis } from "../redis";
import { parseVariants, toPublicVariant } from "../lib/variant";
import { callerFor, newAnonId, probeServices } from "./helpers";

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
    data: { ...base, titleEn: "Var", titleZh: "Var", slug: `${tag}-q`, variants: [variant(6), variant(8), variant(9), variant(12)], variantCount: 4 },
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
    expect(list.map((v) => v.id)).toEqual(["people6", "people8", "people9", "people12"]);
    expect(JSON.stringify(list)).not.toMatch(/answerText|wrongAnswers|aha|explanation/);
    expect(await caller.question.variants({ questionId: f.plainId })).toEqual([]);
    expect((await caller.question.getById({ id: f.questionId })).variantCount).toBe(4);
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
    // Guests may always "show me" (with the visitor id the web app always sends).
    expect(await callerFor({ anonId: newAnonId() }).question.revealVariant({ questionId: f.questionId, variantId: "people12" })).toMatchObject({ answer: "66" });
    await expect(caller.question.revealVariant({ questionId: f.questionId, variantId: "people12" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("'Show me' on a variant as a guest, then signing in in the same browser: no variant XP for it", async () => {
    const anonId = newAnonId();
    await callerFor({ anonId }).question.revealVariant({ questionId: f.questionId, variantId: "people9" });
    const userId = await newUser(f);
    const caller = callerFor({ userId, anonId });
    await caller.question.submitAnswer({ questionId: f.questionId, answer: "45", timeSpent: 5 });
    expect(await caller.question.submitVariant({ questionId: f.questionId, variantId: "people9", answer: "36" })).toMatchObject({ isCorrect: true, xpEarned: 0 });
    // Variants this browser didn't reveal still pay.
    expect((await caller.question.submitVariant({ questionId: f.questionId, variantId: "people6", answer: "15" })).xpEarned).toBe(3);
  });

  it("signed in: variants stay closed until the original is done (their copy can contain its answer)", async () => {
    const userId = await newUser(f);
    const caller = callerFor({ userId });
    const args = { questionId: f.questionId, variantId: "people6", answer: "15" };
    expect(await caller.question.variants({ questionId: f.questionId })).toEqual([]);
    await expect(caller.question.submitVariant(args)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.question.checkVariant(args)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.question.revealVariant({ questionId: f.questionId, variantId: "people6" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    // Nothing was stored, so nothing is lost: once the original is done the first correct answer still pays.
    await caller.question.submitAnswer({ questionId: f.questionId, answer: "45", timeSpent: 5 });
    expect(await caller.question.submitVariant(args)).toMatchObject({ isCorrect: true, xpEarned: 3, attempt: 1 });
  });

  it("signed in: checkVariant is recorded like a submit, so checking first can't dodge the 3-try cap", async () => {
    const userId = await newUser(f);
    const caller = callerFor({ userId });
    await caller.question.submitAnswer({ questionId: f.questionId, answer: "45", timeSpent: 5 });
    for (const a of ["1", "2", "3"]) await caller.question.checkVariant({ questionId: f.questionId, variantId: "people8", answer: a });
    expect(await db.variantSubmission.count({ where: { userId, variantId: "people8" } })).toBe(3);
    expect(await caller.question.submitVariant({ questionId: f.questionId, variantId: "people8", answer: "28" })).toMatchObject({ isCorrect: true, xpEarned: 0 });
  });

  it("signed in: two concurrent correct submits pay once", async () => {
    const userId = await newUser(f);
    const caller = callerFor({ userId });
    await caller.question.submitAnswer({ questionId: f.questionId, answer: "45", timeSpent: 5 });
    const before = (await db.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true } })).xp;
    const args = { questionId: f.questionId, variantId: "people12", answer: "66" };
    const results = await Promise.all([caller.question.submitVariant(args), caller.question.submitVariant(args), caller.question.submitVariant(args)]);
    expect(results.map((r) => r.xpEarned).sort()).toEqual([0, 0, 3]);
    expect((await db.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true } })).xp - before).toBe(3);
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
    // Progress follows the user: solved variants are marked for them, never for guests.
    const mine = await caller.question.variants({ questionId: f.questionId });
    expect(mine.map((v) => [v.id, v.solved])).toEqual([["people6", true], ["people8", true], ["people9", false], ["people12", true]]);
    expect((await callerFor().question.variants({ questionId: f.questionId })).every((v) => !v.solved)).toBe(true);
    // Variant tries never count as attempts on the standard version.
    expect(await db.submission.count({ where: { userId } })).toBe(1);
  });
});
