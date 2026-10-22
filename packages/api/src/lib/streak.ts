import type { PrismaClient } from "@gmq/db";
import { redis } from "../redis";

/**
 * Daily "thinking" streak. A day counts when the child makes an Act 1 guess or
 * interacts with a scene (guess.submit / event.track "scene_interact"), not when
 * they answer correctly: the streak rewards showing up and thinking.
 */

/** The guard outlives the day so a retry just after midnight still sees it. */
export const STREAK_GUARD_TTL_SEC = 48 * 60 * 60;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const streakGuardKey = (userId: string, dateString: string) => `streak:${userId}:${dateString}`;

/** Days since the epoch for the UTC calendar day of `d`. */
export function utcDayNumber(d: Date): number {
  return Math.floor(d.getTime() / MS_PER_DAY);
}

/**
 * Next streak value. `dayGap` is today's UTC day number minus the day of
 * `lastActiveAt`: 0 = already active today, 1 = yesterday, more = a gap.
 * A negative gap (clock skew) is treated like "today".
 */
export function nextStreak(current: number, dayGap: number): number {
  if (dayGap <= 0) return Math.max(current, 1);
  if (dayGap === 1) return current + 1;
  return 1;
}

export interface StreakResult {
  /** The user's streak after this call, or null when nothing was read (guarded or unknown user). */
  streak: number | null;
  changed: boolean;
}

type StreakDb = Pick<PrismaClient, "user">;

/** SET NX on the per-day guard. true = first touch today (or Redis is down: fail open). */
async function acquireDayGuard(key: string): Promise<boolean> {
  try {
    return (await redis.set(key, "1", "EX", STREAK_GUARD_TTL_SEC, "NX")) === "OK";
  } catch (err) {
    console.error(`[streak] Redis unavailable, checking ${key} in the DB:`, err instanceof Error ? err.message : err);
    return true;
  }
}

async function releaseDayGuard(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // Best effort: a stuck guard only skips today's touch.
  }
}

/**
 * Records that `userId` was active on `now`'s UTC day, at most once per day.
 * Redis keeps this to one SET on repeat calls; the DB write is a compare-and-set
 * on `lastActiveAt`, so concurrent calls (or Redis being down) can't double-count.
 * Never throws: a streak failure must not fail the guess or event that triggered it.
 */
export async function touchStreak(db: StreakDb, userId: string, now: Date = new Date()): Promise<StreakResult> {
  const dateString = now.toISOString().slice(0, 10);
  const key = streakGuardKey(userId, dateString);
  if (!(await acquireDayGuard(key))) return { streak: null, changed: false };

  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { streak: true, lastActiveAt: true } });
    if (!user) return { streak: null, changed: false };

    const gap = utcDayNumber(now) - utcDayNumber(user.lastActiveAt);
    const streak = nextStreak(user.streak, gap);
    if (gap <= 0 && streak === user.streak) return { streak, changed: false };

    const { count } = await db.user.updateMany({
      where: { id: userId, lastActiveAt: user.lastActiveAt },
      data: { streak, lastActiveAt: now },
    });
    // count 0: another request updated the row first; it did today's work.
    return { streak, changed: count > 0 };
  } catch (err) {
    await releaseDayGuard(key);
    console.error(`[streak] failed for user ${userId}:`, err instanceof Error ? err.message : err);
    return { streak: null, changed: false };
  }
}
