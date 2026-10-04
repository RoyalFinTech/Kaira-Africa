import pino from "pino";
import { env } from "../config/env";

// Keep the API logger runtime-safe in every deployment environment.
// Pretty-printing is intentionally not configured here because pino's
// transport loader resolves transport targets at process startup and can
// crash a production container when optional dev tooling is unavailable.
// Render/container logs remain structured JSON, which is also better for
// log aggregation.
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
});

/**
 * Dedicated child logger for security/audit-relevant log lines (as
 * opposed to routine request logs from pino-http). This is a
 * logging companion to the persisted `auth_audit_logs` table (see
 * repositories/auth-audit.ts) — the DB table is the queryable source
 * of truth, this just makes the same events visible in log
 * aggregation (Datadog/CloudWatch/etc) without a DB query.
 */
export const auditLogger = logger.child({ component: "audit" });
