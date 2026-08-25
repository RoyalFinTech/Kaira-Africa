import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-errors";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";

/**
 * Redis-backed sliding-window rate limiter (sorted set per bucket:
 * member = unique request id, score = timestamp). Atomic via a single
 * Lua script (EVAL) so concurrent requests across multiple API server
 * replicas can't race past the limit — this is the actual reason to
 * move off the old in-process Map implementation.
 *
 * Falls back to an in-process Map if REDIS_URL isn't configured (dev)
 * or if Redis is transiently unreachable, so an outage degrades rate
 * limiting rather than taking the API down. The fallback is
 * per-process, so it only enforces limits correctly for a single
 * instance — acceptable in the (documented) fallback case.
 */
const LUA_SLIDING_WINDOW = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local max = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, '-inf', now - windowMs)
local count = redis.call('ZCARD', key)

if count >= max then
  return 0
end

redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, windowMs)
return 1
`;

// In-process fallback store (only used when Redis is unavailable).
const fallbackBuckets = new Map<string, number[]>();
setInterval(
  () => {
    const now = Date.now();
    for (const [key, hits] of fallbackBuckets) {
      const fresh = hits.filter((t) => now - t < 60 * 60 * 1000);
      if (fresh.length === 0) fallbackBuckets.delete(key);
      else fallbackBuckets.set(key, fresh);
    }
  },
  10 * 60 * 1000,
).unref();

function fallbackCheck(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const hits = (fallbackBuckets.get(key) ?? []).filter(
    (t) => now - t < windowMs,
  );
  if (hits.length >= max) return false;
  hits.push(now);
  fallbackBuckets.set(key, hits);
  return true;
}

let loggedFallbackUse = false;

export function rateLimit(options: {
  scope: string;
  windowMs: number;
  max: number;
  keyFn: (req: Request) => string;
  message?: string;
}) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // Namespaced by `scope` so two independent limiters never share a
    // bucket just because they happen to key on the same value (e.g.
    // IP address) — see the two /auth/request-otp limiters as an
    // example (per-IP and per-phone-number).
    const key = `ratelimit:${options.scope}:${options.keyFn(req)}`;

    let allowed: boolean;
    if (redis) {
      try {
        const now = Date.now();
        const member = `${now}:${Math.random().toString(36).slice(2)}`;
        const result = await redis.eval(
          LUA_SLIDING_WINDOW,
          1,
          key,
          now,
          options.windowMs,
          options.max,
          member,
        );
        allowed = result === 1;
      } catch (err) {
        if (!loggedFallbackUse) {
          loggedFallbackUse = true;
          logger.error(
            { err },
            "Redis rate-limit check failed — falling back to in-process limiting for this request",
          );
        }
        allowed = fallbackCheck(key, options.windowMs, options.max);
      }
    } else {
      allowed = fallbackCheck(key, options.windowMs, options.max);
    }

    if (!allowed) {
      next(
        new HttpError(
          429,
          "rate_limited",
          options.message ?? "Too many requests — please try again shortly.",
        ),
      );
      return;
    }

    next();
  };
}

/** Keys by IP + a request field (e.g. phone number or email), so a
 * single IP can't brute-force many different accounts, and a single
 * account can't be hammered from many IPs either — both dimensions
 * are limited independently by using two rateLimit() calls. */
export function requestBodyKey(field: string) {
  return (req: Request) =>
    String((req.body as Record<string, unknown> | undefined)?.[field] ?? "");
}

export function ipKey(req: Request): string {
  return req.ip ?? "unknown";
}
