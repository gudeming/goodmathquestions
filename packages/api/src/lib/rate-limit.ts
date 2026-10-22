import { redis } from "../redis";

export interface RateLimitRule {
  /** Max hits per window. */
  limit: number;
  windowSec: number;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Limits are read on every call so tests (and ops) can tune them through env vars
 * without a restart of the module graph.
 */
export const RATE_LIMITS = {
  guess: (): RateLimitRule => ({ limit: envInt("GMQ_RL_GUESS_PER_HOUR", 30), windowSec: 3600 }),
  event: (): RateLimitRule => ({ limit: envInt("GMQ_RL_EVENT_PER_MIN", 120), windowSec: 60 }),
} as const;

/**
 * Fixed-window counter in Redis. Returns true when the hit is allowed.
 * Fails open: if Redis is down the request is allowed and the error logged,
 * matching how the rest of the API treats Redis as best-effort (see redis.ts).
 */
export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<boolean> {
  try {
    const results = await redis.multi().incr(key).ttl(key).exec();
    const count = Number(results?.[0]?.[1]);
    const ttl = Number(results?.[1]?.[1]);
    // ttl < 0: first hit, or a previous EXPIRE was lost. Either way, (re)arm the window.
    if (ttl < 0) await redis.expire(key, rule.windowSec);
    return !(Number.isFinite(count) && count > rule.limit);
  } catch (err) {
    console.error(`[rate-limit] Redis unavailable, allowing ${key}:`, err instanceof Error ? err.message : err);
    return true;
  }
}
