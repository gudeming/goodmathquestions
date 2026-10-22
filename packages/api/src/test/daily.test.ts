import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@gmq/db";
import { fnv1a32, getOrCreateDailyPuzzle, pickDailyIndex, utcDay } from "../routers/daily";
import { callerFor, cleanupFixtures, createFixtures, probeServices, type Fixtures } from "./helpers";

describe("daily helpers (pure)", () => {
  it("uses the UTC calendar day", () => {
    expect(utcDay(new Date("2026-10-22T23:59:59-07:00"))).toEqual({
      dateString: "2026-10-23",
      date: new Date("2026-10-23T00:00:00.000Z"),
    });
  });

  it("hashes deterministically and returns null when there are no candidates", () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
    expect(fnv1a32("2026-10-22")).toBe(fnv1a32("2026-10-22"));
    expect(fnv1a32("2026-10-22")).not.toBe(fnv1a32("2026-10-23"));
    expect(pickDailyIndex("2026-10-22", 0)).toBeNull();
    expect(pickDailyIndex("2026-10-22", 7)).toBe(fnv1a32("2026-10-22") % 7);
  });
});

const servicesUp = await probeServices("daily");

// Far-future dates so the test never collides with a real daily row.
const TEST_DAYS = ["2099-01-01", "2099-01-02", "2099-01-03"].map((d) => new Date(`${d}T12:00:00Z`));

describe.skipIf(!servicesUp)("daily router (Postgres)", () => {
  let f: Fixtures;

  beforeAll(async () => {
    f = await createFixtures("daily");
  });

  afterAll(async () => {
    await db.dailyPuzzle.deleteMany({ where: { date: { gte: new Date("2099-01-01T00:00:00Z") } } });
    await cleanupFixtures(f);
  });

  async function expectedPick(dateString: string): Promise<string> {
    const candidates = await db.question.findMany({
      where: { isPublished: true, kind: { not: "DRILL" } },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const index = pickDailyIndex(dateString, candidates.length);
    if (index === null) throw new Error("fixtures should provide candidates");
    return candidates[index].id;
  }

  it("picks hash(date) % count among published hero questions and persists it", async () => {
    const day = TEST_DAYS[0];
    const picked = await getOrCreateDailyPuzzle(db, day);
    expect(picked?.id).toBe(await expectedPick("2099-01-01"));
    expect(picked?.kind).not.toBe("DRILL");
    expect(picked).not.toHaveProperty("answer");

    const row = await db.dailyPuzzle.findUniqueOrThrow({ where: { date: utcDay(day).date } });
    expect(row.questionId).toBe(picked?.id);
  });

  it("is idempotent: later calls return the stored row even if candidates change", async () => {
    const day = TEST_DAYS[1];
    const first = await getOrCreateDailyPuzzle(db, day);
    // Move the stored question to the end of the order; the stored pick must not change.
    await db.question.update({ where: { id: f.estimate.id }, data: { sortOrder: 2 } });
    const second = await getOrCreateDailyPuzzle(db, new Date("2099-01-02T23:00:00Z"));
    expect(second?.id).toBe(first?.id);
    expect(await db.dailyPuzzle.count({ where: { date: utcDay(day).date } })).toBe(1);
  });

  it("survives a race of concurrent first calls with one row and one answer", async () => {
    const day = TEST_DAYS[2];
    const results = await Promise.all(Array.from({ length: 6 }, () => getOrCreateDailyPuzzle(db, day)));
    const ids = new Set(results.map((r) => r?.id));
    expect(ids.size).toBe(1);
    expect(await db.dailyPuzzle.count({ where: { date: utcDay(day).date } })).toBe(1);
  });

  it("re-picks when the stored question has been unpublished", async () => {
    const day = TEST_DAYS[0];
    const date = utcDay(day).date;
    await db.dailyPuzzle.update({ where: { date }, data: { questionId: f.hidden.id } });
    const picked = await getOrCreateDailyPuzzle(db, day);
    expect(picked?.id).toBe(await expectedPick("2099-01-01"));
    expect((await db.dailyPuzzle.findUniqueOrThrow({ where: { date } })).questionId).toBe(picked?.id);
  });

  it("daily.today returns a published hero question with public fields", async () => {
    const q = await callerFor().daily.today();
    expect(q).not.toBeNull();
    expect(q?.isPublished).toBe(true);
    expect(q?.kind).not.toBe("DRILL");
    expect(q).not.toHaveProperty("answerRule");
    // Same call again is stable.
    expect((await callerFor().daily.today())?.id).toBe(q?.id);
  });
});
