/**
 * Vercel serverless entrypoint. Vercel's Node.js runtime invokes the
 * default export as a request handler per invocation — it does NOT
 * call app.listen() (see src/index.ts, which is what's actually
 * used by Docker/Railway/Render's long-running-process deployments).
 *
 * See vercel.json at the repo root for the routing config that sends
 * all requests here.
 *
 * IMPORTANT CAVEATS — read before deploying this way:
 *  - This architecture (Redis-backed rate limiting via a persistent
 *    ioredis connection, see lib/redis.ts) was designed for a
 *    long-running process, not a serverless one. Serverless functions
 *    are invoked fresh per-request (or reuse a "warm" instance
 *    briefly) — ioredis will keep reconnecting across cold starts,
 *    which works but is not the efficient/intended usage pattern.
 *    Consider Upstash Redis (REST-based, actually designed for
 *    serverless) if deploying here for real, rather than the ioredis
 *    TCP client this app uses by default.
 *  - Cold starts add latency that Railway/Render's long-running
 *    process doesn't have.
 *  - The rate limiter's in-memory fallback (lib/middlewares/rate-limit.ts)
 *    is meaningless here — each invocation may be a different
 *    process, so in-memory state doesn't persist the way it does on a
 *    single long-running instance.
 *  - Railway (railway.json) or Render (render.yaml) are the better
 *    fit for this codebase as it's actually built. This file exists
 *    because Vercel deployment was explicitly requested, not because
 *    it's the recommended path.
 */
import app from "../src/app";

export default app;
