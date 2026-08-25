import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { registerInfraHealthRoutes } from "./routes/health";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { rateLimit, ipKey } from "./middlewares/rate-limit";
import { env, isProd } from "./config/env";

const app: Express = express();

// Required for req.ip / X-Forwarded-For to be trusted correctly
// behind a reverse proxy (Railway/Render/any load balancer sit in
// front of this process in production) — without this, ipKey() in
// the rate limiter would key every request under the proxy's own IP,
// collapsing all users into one bucket.
app.set("trust proxy", 1);

app.use(
  helmet({
    // A JSON API serves no HTML/scripts/styles, so the tightest
    // possible policy is safe and meaningful defense-in-depth (e.g.
    // against the API being embedded/loaded in an unexpected
    // browser context) rather than a no-op.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);

app.use(
  cors({
    origin: [env.WEB_BASE_URL, env.FRONTEND_URL].filter(
      (v): v is string => !!v,
    ),
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global default rate limit (defense-in-depth against basic abuse).
// Auth endpoints layer their own, much stricter, per-endpoint limits
// on top of this — see routes/auth.ts.
app.use(
  "/api",
  rateLimit({
    scope: "global_ip",
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    keyFn: ipKey,
  }),
);

// Infra health checks — deliberately at the root path, outside /api
// and outside the OpenAPI contract (see routes/health.ts).
registerInfraHealthRoutes(app);

app.use("/api", router);
app.use("/api", notFoundHandler);
app.use(errorHandler);

if (!isProd) {
  // Never log this in production — informational only for local dev.
  logger.debug({ corsOrigins: [env.WEB_BASE_URL, env.FRONTEND_URL] }, "CORS configured");
}

export default app;
