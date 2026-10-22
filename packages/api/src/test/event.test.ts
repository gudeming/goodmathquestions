import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { db } from "@gmq/db";
import { EVENT_NAMES, MAX_EVENT_PROPS_BYTES } from "../routers/event";
import { callerFor, cleanupFixtures, createFixtures, probeServices, trackAnon, type Fixtures } from "./helpers";

const servicesUp = await probeServices("event");

describe.skipIf(!servicesUp)("event router (Postgres + Redis)", () => {
  let f: Fixtures;

  beforeAll(async () => {
    f = await createFixtures("event");
  });

  afterAll(async () => {
    await cleanupFixtures(f);
  });

  afterEach(() => {
    delete process.env.GMQ_RL_EVENT_PER_MIN;
  });

  it("records every whitelisted event for an anonymous visitor", async () => {
    const anon = trackAnon(f);
    const caller = callerFor({ anonId: anon });
    for (const name of EVENT_NAMES) {
      await expect(
        caller.event.track({ name, questionId: f.multi.id, props: { step: 1, ok: true, from: "test" } })
      ).resolves.toEqual({ ok: true });
    }
    const rows = await db.event.findMany({ where: { anonId: anon }, orderBy: { createdAt: "asc" } });
    expect(rows.map((r) => r.name).sort()).toEqual([...EVENT_NAMES].sort());
    expect(rows[0]).toMatchObject({ userId: null, questionId: f.multi.id, props: { step: 1, ok: true, from: "test" } });
  });

  it("records a signed-in user by userId only", async () => {
    const anon = trackAnon(f);
    await callerFor({ userId: f.userId, anonId: anon }).event.track({ name: "question_view" });
    const rows = await db.event.findMany({ where: { userId: f.userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ anonId: null, questionId: null, props: {} });
  });

  it("rejects names outside the whitelist", async () => {
    const p = callerFor({ anonId: trackAnon(f) }).event.track({ name: "drop_table" as "question_view" });
    await expect(p).rejects.toBeInstanceOf(TRPCError);
    await expect(p).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects props over 2 KB and non-flat props", async () => {
    const caller = callerFor({ anonId: trackAnon(f) });
    const big = { blob: "x".repeat(400), a: "x".repeat(400), b: "x".repeat(400), c: "x".repeat(400), d: "x".repeat(400), e: "x".repeat(400) };
    expect(JSON.stringify(big).length).toBeGreaterThan(MAX_EVENT_PROPS_BYTES);
    await expect(caller.event.track({ name: "scene_interact", props: big })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const nested = { deep: { no: 1 } } as unknown as Record<string, string>;
    await expect(caller.event.track({ name: "scene_interact", props: nested })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const justFits = { a: "x".repeat(490), b: "x".repeat(490), c: "x".repeat(490), d: "x".repeat(490) };
    expect(JSON.stringify(justFits).length).toBeLessThanOrEqual(MAX_EVENT_PROPS_BYTES);
    await expect(caller.event.track({ name: "scene_interact", props: justFits })).resolves.toEqual({ ok: true });
  });

  it("drops events silently without an identity or once rate-limited", async () => {
    const before = await db.event.count({ where: { name: "reveal_seen", userId: null, anonId: null } });
    await expect(callerFor().event.track({ name: "reveal_seen" })).resolves.toEqual({ ok: true });
    expect(await db.event.count({ where: { name: "reveal_seen", userId: null, anonId: null } })).toBe(before);

    process.env.GMQ_RL_EVENT_PER_MIN = "2";
    const anon = trackAnon(f);
    const caller = callerFor({ anonId: anon });
    for (let i = 0; i < 4; i++) {
      await expect(caller.event.track({ name: "extension_open", props: { i } })).resolves.toEqual({ ok: true });
    }
    expect(await db.event.count({ where: { anonId: anon } })).toBe(2);
  });
});
