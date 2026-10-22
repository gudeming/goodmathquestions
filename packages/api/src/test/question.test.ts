import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { db } from "@gmq/db";
import { callerFor, cleanupFixtures, createFixtures, probeServices, type Fixtures } from "./helpers";

const SERVER_ONLY_KEYS = ["answer", "answerRule", "wrongAnswerFeedback", "answerExplainEn", "answerExplainZh", "ahaEn", "ahaZh"];

const servicesUp = await probeServices("question");

describe.skipIf(!servicesUp)("question router v2 (Postgres)", () => {
  let f: Fixtures;

  beforeAll(async () => {
    f = await createFixtures("question");
  });

  afterAll(async () => {
    await cleanupFixtures(f);
  });

  it("bySlug returns the v2 public fields and nothing that reveals the answer", async () => {
    const q = await callerFor().question.bySlug({ slug: f.multi.slug });
    expect(q).toMatchObject({
      id: f.multi.id,
      slug: f.multi.slug,
      kind: "THREE_ACT",
      answerType: "MULTI_VALUE",
      collectionId: f.collection.id,
      hookEn: "Two numbers hide here.",
      extensionZh: "那 1 到 1000 呢？",
      discussionPromptEn: "How did you find both?",
      solutionTags: ["pair", "draw"],
      guessConfig: { type: "choice" },
      choices: [
        { id: "A", en: "1 and 5", zh: "1 和 5" },
        { id: "B", en: "1 and 7", zh: "1 和 7" },
      ],
    });
    for (const key of SERVER_ONLY_KEYS) expect(q).not.toHaveProperty(key);
    expect(JSON.stringify(q)).not.toContain("isCorrect");
  });

  it("bySlug hides unpublished questions and unknown slugs", async () => {
    for (const slug of [f.hidden.slug, `${f.tag}-nope`]) {
      const p = callerFor().question.bySlug({ slug });
      await expect(p).rejects.toBeInstanceOf(TRPCError);
      await expect(p).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
  });

  it("getById exposes the same public shape", async () => {
    const q = await callerFor().question.getById({ id: f.estimate.id });
    expect(q).toMatchObject({ kind: "THREE_ACT", answerType: "ESTIMATE", guessConfig: { type: "slider", min: 0, max: 100 } });
    expect(q.choices).toBeNull();
    for (const key of SERVER_ONLY_KEYS) expect(q).not.toHaveProperty(key);
  });

  it("listByCollection returns published questions by sortOrder", async () => {
    const res = await callerFor().question.listByCollection({ slug: f.collection.slug });
    expect(res.collection).toMatchObject({ slug: f.collection.slug, titleZh: "测试世界" });
    expect(res.questions.map((q) => q.id)).toEqual([f.multi.id, f.estimate.id, f.drill.id]);
    await expect(callerFor().question.listByCollection({ slug: `${f.tag}-nope` })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("list filters by kind and keeps legacy DRILL questions as DRILL", async () => {
    const heroes = await callerFor().question.list({ kind: "THREE_ACT", limit: 50 });
    const ids = heroes.questions.map((q) => q.id);
    expect(ids).toEqual(expect.arrayContaining([f.multi.id, f.estimate.id]));
    expect(ids).not.toContain(f.drill.id);
    expect(ids).not.toContain(f.hidden.id);
    expect(heroes.questions.every((q) => q.kind === "THREE_ACT")).toBe(true);

    const drills = await callerFor().question.list({ kind: "DRILL", limit: 5 });
    expect(drills.questions.every((q) => q.kind === "DRILL" && q.answerType === "NUMERIC")).toBe(true);
  });

  it("checkAnswer on MULTI_VALUE: v2 rejects '1 and 7' with targeted feedback, accepts '5 和 1'", async () => {
    const caller = callerFor();
    const wrong = await caller.question.checkAnswer({ questionId: f.multi.id, answer: "1 and 7" });
    expect(wrong).toMatchObject({
      isCorrect: false,
      explanation: null,
      aha: null,
      feedback: { en: "7 is too far: check the second one.", zh: "7 太远了，再看看第二个。" },
    });

    const lonely = await caller.question.checkAnswer({ questionId: f.multi.id, answer: "1" });
    expect(lonely.feedback?.en).toBe("There are two answers.");

    const right = await caller.question.checkAnswer({ questionId: f.multi.id, answer: "5 和 1" });
    expect(right).toMatchObject({
      isCorrect: true,
      feedback: null,
      explanation: { en: "Because." },
      aha: { en: "Both ends meet.", zh: "两头相遇。" },
    });

    const asArray = await caller.question.checkAnswer({ questionId: f.multi.id, answer: ["5", "1"] });
    expect(asArray.isCorrect).toBe(true);
  });

  it("checkAnswer on ESTIMATE: wrong answers get direction + feedback but not the truth", async () => {
    const caller = callerFor();
    const low = await caller.question.checkAnswer({ questionId: f.estimate.id, answer: "100" });
    expect(low).toMatchObject({
      isCorrect: false,
      feedback: { en: "Much bigger than that.", zh: "比这个大得多。" },
      estimate: { direction: "low" },
    });
    expect(low.estimate).not.toHaveProperty("truth");

    const high = await caller.question.checkAnswer({ questionId: f.estimate.id, answer: "9,000" });
    expect(high).toMatchObject({ isCorrect: false, feedback: { en: "Too big." }, estimate: { direction: "high" } });

    const ok = await caller.question.checkAnswer({ questionId: f.estimate.id, answer: "about 4500" });
    expect(ok).toMatchObject({
      isCorrect: true,
      feedback: null,
      estimate: { direction: "inside", truth: 5000, distance: 0.1 },
      aha: { en: "Round first, then multiply." },
    });
  });

  it("DRILL questions keep v1 exactly (including its pinned multi-value gap)", async () => {
    const res = await callerFor().question.checkAnswer({ questionId: f.drill.id, answer: "1 and 7" });
    expect(res).toMatchObject({ isCorrect: true, feedback: null, estimate: null, aha: null });
  });

  it("submitAnswer judges v2 questions, stores the text answer and awards Phase 4 XP", async () => {
    const caller = callerFor({ userId: f.userId });
    const wrong = await caller.question.submitAnswer({ questionId: f.multi.id, answer: "1 and 7", timeSpent: 5 });
    // First attempt earns +5 even when wrong (math-engine/xp.ts).
    expect(wrong).toMatchObject({ isCorrect: false, xpEarned: 5, attempt: 1, feedback: { zh: "7 太远了，再看看第二个。" } });

    const right = await caller.question.submitAnswer({
      questionId: f.multi.id,
      answer: ["5", "1"],
      timeSpent: 9,
      hintsUsed: 2,
    });
    expect(right).toMatchObject({ isCorrect: true, xpEarned: 25, attempt: 2, aha: { en: "Both ends meet." } });

    const subs = await db.submission.findMany({ where: { userId: f.userId }, orderBy: { attempt: "asc" } });
    expect(subs.map((s) => [s.answer, s.isCorrect])).toEqual([
      ["1 and 7", false],
      ["5, 1", true],
    ]);
    const user = await db.user.findUniqueOrThrow({ where: { id: f.userId }, select: { xp: true } });
    expect(user.xp).toBe(30);
  });
});

describe.skipIf(!servicesUp)("collection router (Postgres)", () => {
  let f: Fixtures;

  beforeAll(async () => {
    f = await createFixtures("collection");
  });

  afterAll(async () => {
    await cleanupFixtures(f);
  });

  it("list counts only published hero questions", async () => {
    const all = await callerFor().collection.list();
    const mine = all.find((c) => c.slug === f.collection.slug);
    // multi + estimate; hidden is unpublished and drill is DRILL.
    expect(mine).toMatchObject({ questionCount: 2, emoji: "🧪", colorToken: "fun-purple" });
    expect(mine).not.toHaveProperty("_count");
  });

  it("bySlug returns one collection or NOT_FOUND", async () => {
    await expect(callerFor().collection.bySlug({ slug: f.collection.slug })).resolves.toMatchObject({
      id: f.collection.id,
      questionCount: 2,
    });
    await expect(callerFor().collection.bySlug({ slug: `${f.tag}-nope` })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
