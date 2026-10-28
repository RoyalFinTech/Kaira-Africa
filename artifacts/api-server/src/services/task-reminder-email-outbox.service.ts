import { and, asc, eq, lt, or } from "drizzle-orm";
import { db, workTaskReminderEmailOutbox } from "@workspace/db";
import { isEmailDeliveryConfigured, sendTaskReminderEmail } from "./email.service";
import { logger } from "../lib/logger";

const INTERVAL_MS = 60 * 1000;
const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 8;
const STALE_SENDING_MS = 10 * 60 * 1000;

type OutboxRow = typeof workTaskReminderEmailOutbox.$inferSelect;

/** Claim a small batch transactionally; network I/O happens after locks are released. */
async function claimBatch(now: Date): Promise<OutboxRow[]> {
  return db.transaction(async (tx) => {
    const staleBefore = new Date(now.getTime() - STALE_SENDING_MS);
    const rows = await tx.select().from(workTaskReminderEmailOutbox).where(and(
      or(
        eq(workTaskReminderEmailOutbox.status, "pending"),
        and(eq(workTaskReminderEmailOutbox.status, "sending"), lt(workTaskReminderEmailOutbox.updatedAt, staleBefore)),
      ),
      lt(workTaskReminderEmailOutbox.attemptCount, MAX_ATTEMPTS),
      lt(workTaskReminderEmailOutbox.nextAttemptAt, new Date(now.getTime() + 1)),
    )).orderBy(asc(workTaskReminderEmailOutbox.nextAttemptAt), asc(workTaskReminderEmailOutbox.createdAt))
      .limit(BATCH_SIZE).for("update", { skipLocked: true });

    const claimed: OutboxRow[] = [];
    for (const row of rows) {
      const [updated] = await tx.update(workTaskReminderEmailOutbox).set({
        status: "sending",
        attemptCount: row.attemptCount + 1,
        updatedAt: now,
      }).where(eq(workTaskReminderEmailOutbox.id, row.id)).returning();
      if (updated) claimed.push(updated);
    }
    return claimed;
  });
}

function retryDelayMs(attempt: number): number {
  return Math.min(6 * 60 * 60 * 1000, 60 * 1000 * 2 ** Math.max(0, attempt - 1));
}

export async function runTaskReminderEmailOutbox(now = new Date()): Promise<number> {
  // Do not consume retries or mark messages sent in development when no SMTP transport exists.
  if (!isEmailDeliveryConfigured()) return 0;
  const batch = await claimBatch(now);
  let sent = 0;
  for (const row of batch) {
    try {
      const delivered = await sendTaskReminderEmail({
        to: row.recipientEmail,
        subject: row.subject,
        message: row.message,
        actionUrl: "/work-management/tasks",
      });
      if (!delivered) {
        await db.update(workTaskReminderEmailOutbox).set({
          status: "pending",
          nextAttemptAt: new Date(now.getTime() + 5 * 60 * 1000),
          updatedAt: new Date(),
          lastError: "SMTP delivery is not configured.",
        }).where(eq(workTaskReminderEmailOutbox.id, row.id));
        continue;
      }
      await db.update(workTaskReminderEmailOutbox).set({
        status: "sent",
        sentAt: new Date(),
        updatedAt: new Date(),
        lastError: null,
      }).where(eq(workTaskReminderEmailOutbox.id, row.id));
      sent += 1;
    } catch (error) {
      const attempt = row.attemptCount;
      const terminal = attempt >= MAX_ATTEMPTS;
      const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown SMTP delivery error";
      await db.update(workTaskReminderEmailOutbox).set({
        status: terminal ? "failed" : "pending",
        nextAttemptAt: new Date(now.getTime() + retryDelayMs(attempt)),
        updatedAt: new Date(),
        lastError: message,
      }).where(eq(workTaskReminderEmailOutbox.id, row.id));
      logger.error({ outboxId: row.id, attempt, terminal, errorName: error instanceof Error ? error.name : "UnknownError" }, "Task reminder email delivery failed");
    }
  }
  if (sent > 0) logger.info({ sent, batchSize: batch.length }, "Delivered task reminder emails");
  return sent;
}

export function startTaskReminderEmailOutboxWorker(): void {
  const runSafely = async () => {
    try {
      await runTaskReminderEmailOutbox();
    } catch (error) {
      logger.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "Task reminder email outbox worker failed");
    }
  };
  void runSafely();
  setInterval(() => { void runSafely(); }, INTERVAL_MS);
}
