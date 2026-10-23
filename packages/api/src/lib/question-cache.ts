import superjson from "superjson";
import type { Prisma, PrismaClient } from "@gmq/db";
import { cacheGetJson, cacheSetJson } from "./cache";
import { publicQuestionSelect, toPublicQuestion, type PublicQuestion, type PublicQuestionRow } from "./question-public";

/**
 * Redis cache for the public question payload (README Phase 7 item 5).
 *
 * - Content is keyed by `id + updatedAt`, so any Prisma update (admin edit, re-seed,
 *   publish toggle) moves the key and the old entry just expires: no explicit
 *   invalidation. 10 minutes.
 * - `_count` (submissions / comments / likes) changes on every answer and comment and
 *   does not bump `updatedAt`, so it is cached separately for 60 s. A child's own
 *   comment shows in the list immediately (comment router); only the counter lags.
 * - Every request still runs one indexed lookup (`id`/`slug` + `isPublished` →
 *   `updatedAt`), which is what keeps unpublishing and edits immediate.
 *   That replaces the wide select + three COUNT subqueries + tag join.
 * - Known staleness: tag changes (`TagsOnQuestions`) do not bump `updatedAt`, so a
 *   question's tags can lag by up to 10 minutes.
 * - Redis down: helpers fail open and this falls back to the database.
 */
export const QUESTION_PAYLOAD_TTL_SEC = 600;
export const QUESTION_COUNT_TTL_SEC = 60;

// v2: the payload gained `variantCount`.
const KEY_VERSION = "v2";
export const questionPayloadKey = (id: string, updatedAt: Date): string =>
  `q:pub:${KEY_VERSION}:${id}:${updatedAt.getTime()}`;
export const questionCountKey = (id: string): string => `q:count:${KEY_VERSION}:${id}`;

const { _count: _omitCount, ...contentSelect } = publicQuestionSelect;
const countSelect = { _count: publicQuestionSelect._count } satisfies Prisma.QuestionSelect;

type ContentRow = Omit<PublicQuestionRow, "_count">;
type CountRow = PublicQuestionRow["_count"];
type Db = Pick<PrismaClient, "question">;

/** Superjson keeps `createdAt`/`updatedAt` as Dates through Redis. Bad entries count as a miss. */
async function readSuper<T>(key: string): Promise<T | undefined> {
  const raw = await cacheGetJson(key);
  if (raw === undefined) return undefined;
  try {
    return superjson.deserialize<T>(raw as Parameters<typeof superjson.deserialize>[0]);
  } catch {
    return undefined;
  }
}

async function contentOf(db: Db, id: string, updatedAt: Date): Promise<ContentRow | null> {
  const key = questionPayloadKey(id, updatedAt);
  const cached = await readSuper<ContentRow>(key);
  if (cached) return cached;
  const row = await db.question.findUnique({ where: { id }, select: contentSelect });
  if (row) await cacheSetJson(key, superjson.serialize(row), QUESTION_PAYLOAD_TTL_SEC);
  return row;
}

async function countOf(db: Db, id: string): Promise<CountRow | null> {
  const key = questionCountKey(id);
  const cached = await readSuper<CountRow>(key);
  if (cached) return cached;
  const row = await db.question.findUnique({ where: { id }, select: countSelect });
  if (row) await cacheSetJson(key, superjson.serialize(row._count), QUESTION_COUNT_TTL_SEC);
  return row?._count ?? null;
}

/**
 * The public payload of a published question by id or slug, or null when there is none.
 * Same shape as `toPublicQuestion(findFirst({ select: publicQuestionSelect }))`.
 */
export async function loadPublicQuestion(db: Db, where: { id: string } | { slug: string }): Promise<PublicQuestion | null> {
  const head = await db.question.findFirst({
    where: { ...where, isPublished: true },
    select: { id: true, updatedAt: true },
  });
  if (!head) return null;
  const [content, count] = await Promise.all([contentOf(db, head.id, head.updatedAt), countOf(db, head.id)]);
  // Deleted between the lookup and the read: treat as not found.
  if (!content || !count) return null;
  return toPublicQuestion({ ...content, _count: count });
}
