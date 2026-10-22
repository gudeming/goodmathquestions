import { redis } from "../redis";

/**
 * Best-effort JSON cache on Redis. Every helper fails open: on a Redis error it
 * logs and behaves like a cache miss / no-op, so callers fall back to the DB.
 */
export async function cacheGetJson(key: string): Promise<unknown> {
  try {
    const raw = await redis.get(key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch (err) {
    console.error(`[cache] get ${key} failed:`, err instanceof Error ? err.message : err);
    return undefined;
  }
}

export async function cacheSetJson(key: string, value: unknown, ttlSec: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch (err) {
    console.error(`[cache] set ${key} failed:`, err instanceof Error ? err.message : err);
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    console.error(`[cache] del ${keys.join(",")} failed:`, err instanceof Error ? err.message : err);
  }
}
