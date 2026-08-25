import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger";

/**
 * Single shared Redis client for distributed rate limiting (see
 * middlewares/rate-limit.ts). In production this is required — env.ts
 * refuses to boot without REDIS_URL. In development it's optional: if
 * unset, `redis` stays null and the rate limiter falls back to an
 * in-process store (fine for a single local instance, not for
 * multiple replicas — see the fallback's own comment).
 */
export const redis: Redis | null = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
      retryStrategy(times) {
        // Cap backoff at 5s; keep retrying indefinitely rather than
        // giving up — a transient Redis outage shouldn't permanently
        // wedge rate limiting into "no Redis" mode.
        return Math.min(times * 200, 5000);
      },
    })
  : null;

let hasWarnedNoRedis = false;

redis?.on("error", (err) => {
  logger.error({ err }, "Redis connection error");
});

redis?.on("connect", () => {
  logger.info("Redis connected");
});

if (!redis && !hasWarnedNoRedis) {
  hasWarnedNoRedis = true;
  logger.warn(
    "REDIS_URL not set — rate limiting will use an in-process fallback (fine for a single instance, not for multiple replicas).",
  );
}

export async function pingRedis(): Promise<boolean> {
  if (!redis) return false;
  try {
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}
