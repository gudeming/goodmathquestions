import Redis from "ioredis";

// Singleton Redis client for cross-process battle state sharing.
// Uses the same REDIS_URL that infrastructure/docker-compose provides.
const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  });
  client.on("error", (err) => {
    // Log but don't crash — battle features degrade gracefully when Redis is unavailable
    console.error("[Redis] connection error:", err.message);
  });
  return client;
}

export const redis: Redis =
  globalForRedis.redis ?? (globalForRedis.redis = createRedisClient());
