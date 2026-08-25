import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { pingRedis } from "../lib/redis";

const router: IRouter = Router();

// Kept as-is: part of the OpenAPI contract, validated against the
// generated Zod schema like every other business endpoint.
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

async function checkDatabase(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

/**
 * /health, /ready, /live are deliberately NOT under /api and NOT part
 * of the OpenAPI contract — these are infrastructure endpoints that
 * deployment platforms (Railway/Render/k8s/etc) poll directly, a
 * different audience from the API's own clients. See app.ts for where
 * this router is mounted at the root path.
 */
export function registerInfraHealthRoutes(app: import("express").Express) {
  // Liveness: is the process up and able to respond at all? Does NOT
  // check dependencies — a DB outage shouldn't make an orchestrator
  // kill and restart otherwise-healthy pods.
  app.get("/live", (_req, res) => {
    res.status(200).json({ status: "alive" });
  });

  // Readiness: can this instance actually serve traffic right now?
  // Checks the dependencies requests will need. Used by load
  // balancers/orchestrators to decide whether to route traffic here.
  app.get("/ready", async (_req, res) => {
    const [dbOk, redisOk] = await Promise.all([checkDatabase(), pingRedis()]);
    // Redis is allowed to be down without failing readiness — the
    // rate limiter degrades gracefully (see lib/redis.ts) — but the
    // database is not optional.
    const ready = dbOk;
    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      checks: { database: dbOk, redis: redisOk },
    });
  });

  // Combined human/monitoring-friendly view of both.
  app.get("/health", async (_req, res) => {
    const [dbOk, redisOk] = await Promise.all([checkDatabase(), pingRedis()]);
    const healthy = dbOk;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: dbOk ? "ok" : "down",
        redis: redisOk ? "ok" : "unavailable (falling back to in-process rate limiting)",
      },
    });
  });
}

export default router;
