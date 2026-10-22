import { randomUUID } from "node:crypto";
import type { Session } from "next-auth";
import { db, Prisma } from "@gmq/db";
import { appRouter } from "../root";
import { createCallerFactory, createTRPCContext } from "../trpc";
import { redis } from "../redis";

const PROBE_TIMEOUT_MS = 3000;

function withTimeout<T>(p: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} probe timed out`)), PROBE_TIMEOUT_MS)
    ),
  ]);
}

function firstLine(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  return text.split("\n").map((l) => l.trim()).find((l) => l !== "") ?? "unknown error";
}

/**
 * Checks that Postgres and Redis are reachable. Integration suites call this at
 * module top level and `describe.skipIf(!ok)` so `npm test` passes without Docker.
 */
export async function probeServices(suite: string): Promise<boolean> {
  try {
    await withTimeout(db.$queryRaw`SELECT 1`, "Postgres");
    await withTimeout(redis.ping(), "Redis");
    return true;
  } catch (err) {
    console.warn(
      `[${suite}] SKIPPING integration tests: Postgres/Redis unreachable ` +
        `(${firstLine(err)}). Run \`docker compose up -d\`.`
    );
    return false;
  }
}

// ---------------------------------------------------------------------------
// Prisma operation counter (for "the second call must not hit the DB")
// ---------------------------------------------------------------------------

let prismaOps = 0;
let counterInstalled = false;

/** Installs (once) a middleware that counts every Prisma operation on the shared client. */
export function installPrismaOpCounter(): void {
  if (counterInstalled) return;
  counterInstalled = true;
  db.$use(async (params, next) => {
    prismaOps++;
    return next(params);
  });
}

export const prismaOpCount = (): number => prismaOps;

// ---------------------------------------------------------------------------
// Callers
// ---------------------------------------------------------------------------

const createCaller = createCallerFactory(appRouter);
export type AppCaller = ReturnType<typeof createCaller>;

export function newAnonId(): string {
  return randomUUID();
}

/** A caller with an optional fake session (signed-in user) and/or raw anon header value. */
export function callerFor(opts: { userId?: string; anonId?: string | null } = {}): AppCaller {
  const session: Session | null = opts.userId
    ? { user: { id: opts.userId, email: null, name: "Test" } as Session["user"], expires: "2999-01-01T00:00:00.000Z" }
    : null;
  return createCaller(createTRPCContext({ session, anonId: opts.anonId ?? null }));
}

// ---------------------------------------------------------------------------
// Fixtures: everything created here is prefixed "test-" and removed in cleanup()
// ---------------------------------------------------------------------------

const bi = (en: string, zh: string) => ({ en, zh });

export interface Fixtures {
  tag: string;
  userId: string;
  collection: { id: string; slug: string };
  /** THREE_ACT, MULTI_VALUE answer {1, 5}, choice guess A/B/C, sortOrder 1. */
  multi: { id: string; slug: string };
  /** THREE_ACT, ESTIMATE answer [4000, 6000] truth 5000, slider guess 0..100, sortOrder 2. */
  estimate: { id: string; slug: string };
  /** THREE_ACT but unpublished, sortOrder 0. */
  hidden: { id: string; slug: string };
  /** Legacy DRILL question with v1 answer "1 and 5", sortOrder 3. */
  drill: { id: string };
  questionIds: string[];
  anonIds: string[];
}

export async function createFixtures(suite: string): Promise<Fixtures> {
  const tag = `test-${suite}-${randomUUID().slice(0, 8)}`;

  const user = await db.user.create({
    data: { username: tag, displayName: "Test Kid", password: "not-a-real-hash", age: 10 },
    select: { id: true },
  });

  const collection = await db.collection.create({
    data: {
      slug: tag,
      titleEn: "Test World",
      titleZh: "测试世界",
      descEn: "Fixture collection",
      descZh: "测试用合集",
      emoji: "🧪",
      colorToken: "fun-purple",
      sortOrder: 9999,
    },
    select: { id: true, slug: true },
  });

  const base = {
    contentEn: "Fixture prompt",
    contentZh: "测试题目",
    difficulty: "MEDIUM",
    category: "ARITHMETIC",
    ageGroup: "AGE_10_12",
    isPublished: true,
    collectionId: collection.id,
    hints: [],
  } satisfies Partial<Prisma.QuestionUncheckedCreateInput>;

  const multi = await db.question.create({
    data: {
      ...base,
      titleEn: "Test multi",
      titleZh: "测试多值",
      slug: `${tag}-multi`,
      sortOrder: 1,
      kind: "THREE_ACT",
      answerType: "MULTI_VALUE",
      answer: "1 and 5",
      answerExplainEn: "Because.",
      answerExplainZh: "因为。",
      hookEn: "Two numbers hide here.",
      hookZh: "这里藏着两个数。",
      ahaEn: "Both ends meet.",
      ahaZh: "两头相遇。",
      extensionEn: "What about 1 to 1000?",
      extensionZh: "那 1 到 1000 呢？",
      discussionPromptEn: "How did you find both?",
      discussionPromptZh: "你是怎么找到两个数的？",
      solutionTags: ["pair", "draw"],
      guessConfig: {
        type: "choice",
        options: [
          { id: "A", en: "Small", zh: "小" },
          { id: "B", en: "Medium", zh: "中" },
          { id: "C", en: "Large", zh: "大" },
        ],
      },
      choices: [
        { id: "A", en: "1 and 5", zh: "1 和 5", isCorrect: true },
        { id: "B", en: "1 and 7", zh: "1 和 7", isCorrect: false },
      ],
      answerRule: { type: "MULTI_VALUE", values: ["1", "5"] },
      wrongAnswerFeedback: [
        { match: "1 and 7", feedback: bi("7 is too far: check the second one.", "7 太远了，再看看第二个。") },
        { match: "regex:^\\s*1\\s*$", feedback: bi("There are two answers.", "答案有两个。") },
      ],
    },
    select: { id: true, slug: true },
  });

  const estimate = await db.question.create({
    data: {
      ...base,
      titleEn: "Test estimate",
      titleZh: "测试估算",
      slug: `${tag}-estimate`,
      sortOrder: 2,
      kind: "THREE_ACT",
      answerType: "ESTIMATE",
      answer: "5000",
      guessConfig: { type: "slider", min: 0, max: 100, step: 1 },
      answerRule: { type: "ESTIMATE", min: 4000, max: 6000, truth: 5000 },
      wrongAnswerFeedback: [
        { match: "lt:correct", en: "Much bigger than that.", zh: "比这个大得多。" },
        { match: "gt:correct", en: "Too big.", zh: "太大了。" },
      ],
      ahaEn: "Round first, then multiply.",
      ahaZh: "先取整，再相乘。",
    },
    select: { id: true, slug: true },
  });

  const hidden = await db.question.create({
    data: {
      ...base,
      titleEn: "Test hidden",
      titleZh: "测试隐藏",
      slug: `${tag}-hidden`,
      sortOrder: 0,
      kind: "THREE_ACT",
      isPublished: false,
      answer: "1",
      guessConfig: { type: "slider", min: 0, max: 10, step: 1 },
    },
    select: { id: true, slug: true },
  });

  const drill = await db.question.create({
    data: { ...base, titleEn: "Test drill", titleZh: "测试练习", sortOrder: 3, answer: "1 and 5" },
    select: { id: true },
  });

  return {
    tag,
    userId: user.id,
    collection: { id: collection.id, slug: collection.slug },
    multi: { id: multi.id, slug: multi.slug ?? "" },
    estimate: { id: estimate.id, slug: estimate.slug ?? "" },
    hidden: { id: hidden.id, slug: hidden.slug ?? "" },
    drill,
    questionIds: [multi.id, estimate.id, hidden.id, drill.id],
    anonIds: [],
  };
}

/** Removes every fixture row (guesses, submissions and daily rows cascade) and Redis key. */
export async function cleanupFixtures(f: Fixtures | undefined): Promise<void> {
  if (!f) return;
  const identityKeys = [f.userId, ...f.anonIds];
  await db.event.deleteMany({
    where: {
      OR: [{ questionId: { in: f.questionIds } }, { userId: f.userId }, { anonId: { in: f.anonIds } }],
    },
  });
  await db.question.deleteMany({ where: { id: { in: f.questionIds } } });
  await db.collection.deleteMany({ where: { id: f.collection.id } });
  await db.user.deleteMany({ where: { id: f.userId } });

  const keys = [
    ...f.questionIds.map((q) => `guess:hist:${q}`),
    ...f.questionIds.flatMap((q) => identityKeys.map((k) => `guess:mine:${q}:${k}`)),
    ...identityKeys.flatMap((k) => [`rl:guess:${k}`, `rl:event:${k}`]),
  ];
  await redis.del(...keys);
}

/** Tracks an anon id on the fixtures so cleanup removes its rows and keys. */
export function trackAnon(f: Fixtures, anonId: string = newAnonId()): string {
  f.anonIds.push(anonId);
  return anonId;
}
