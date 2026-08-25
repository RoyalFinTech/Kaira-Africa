import pino from "pino";
import { env, isProd } from "../config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
    "*.password",
    "*.currentPassword",
    "*.newPassword",
    "*.passwordHash",
    "*.codeHash",
    "*.tokenHash",
  ],
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});

/**
 * Dedicated child logger for security/audit-relevant log lines (as
 * opposed to routine request logs from pino-http). This is a
 * *logging* companion to the persisted `auth_audit_logs` table (see
 * repositories/auth-audit.ts) — the DB table is the queryable source
 * of truth, this just makes the same events visible in log
 * aggregation (Datadog/CloudWatch/etc) without a DB query.
 */
export const auditLogger = logger.child({ component: "audit" });
