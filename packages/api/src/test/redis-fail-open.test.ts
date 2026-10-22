import { afterEach, describe, expect, it, vi } from "vitest";

// Simulate Redis being down: every command rejects.
vi.mock("../redis", () => {
  const fail = () => Promise.reject(new Error("connect ECONNREFUSED"));
  return {
    redis: {
      multi: () => ({ incr: () => ({ ttl: () => ({ exec: fail }) }) }),
      expire: fail,
      get: fail,
      set: fail,
      del: fail,
    },
  };
});

const { consumeRateLimit } = await import("../lib/rate-limit");
const { cacheDel, cacheGetJson, cacheSetJson } = await import("../lib/cache");

describe("Redis down: fail open", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows the request and logs when the rate limiter cannot reach Redis", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(consumeRateLimit("rl:guess:x", { limit: 1, windowSec: 60 })).resolves.toBe(true);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("[rate-limit]"), "connect ECONNREFUSED");
  });

  it("treats the cache as a miss / no-op", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(cacheGetJson("k")).resolves.toBeUndefined();
    await expect(cacheSetJson("k", { a: 1 }, 60)).resolves.toBeUndefined();
    await expect(cacheDel("k")).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledTimes(3);
  });
});
