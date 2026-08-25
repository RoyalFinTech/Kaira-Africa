import { db, authAuditLogs } from "@workspace/db";
import { auditLogger } from "../lib/logger";

export async function recordAuthEvent(entry: {
  actorType: "user" | "admin" | "unknown";
  actorId?: string | null;
  event: string;
  success: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  auditLogger[entry.success ? "info" : "warn"](
    { event: entry.event, actorType: entry.actorType, actorId: entry.actorId, ip: entry.ipAddress },
    `auth_event:${entry.event}`,
  );

  // Best-effort — an audit-log write failure should never block the
  // actual auth flow, but it shouldn't be silent either.
  try {
    await db.insert(authAuditLogs).values(entry);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to write auth audit log", err);
  }
}
