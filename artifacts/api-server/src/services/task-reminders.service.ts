import { and, lte, notInArray, sql } from "drizzle-orm";
import {
  db,
  notifications,
  workTaskReminderDeliveries,
  workTasks,
} from "@workspace/db";
import { logger } from "../lib/logger";

const REMINDER_INTERVAL_MS = 15 * 60 * 1000;

export function reminderKindForDueDate(dueDate: string, today: string): "due_today" | "overdue" | null {
  if (dueDate > today) return null;
  return dueDate === today ? "due_today" : "overdue";
}

/**
 * Create in-app due-date reminders only. The unique delivery key and a
 * PostgreSQL advisory lock make repeated runs/restarts safe and prevent
 * duplicate notifications for the same task, recipient, kind and date.
 * All dates currently use UTC (same civil date as The Gambia); configurable
 * per-business time zones and email/web-push delivery are separate follow-up work.
 */
export async function runTaskDueReminders(now = new Date()): Promise<number> {
  const today = now.toISOString().slice(0, 10);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('kaira-work-task-reminders', 0))`);
    const tasks = await tx.select({
      id: workTasks.id,
      businessId: workTasks.businessId,
      title: workTasks.title,
      dueDate: workTasks.dueDate,
      assignedTo: workTasks.assignedTo,
      createdBy: workTasks.createdBy,
    }).from(workTasks).where(and(
      lte(workTasks.dueDate, today),
      notInArray(workTasks.status, ["done", "cancelled"]),
    ));

    let createdCount = 0;
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const kind = reminderKindForDueDate(task.dueDate, today);
      if (!kind) continue;
      const recipientUserId = task.assignedTo ?? task.createdBy;
      const [delivery] = await tx.insert(taskReminderDeliveries).values({
        businessId: task.businessId,
        taskId: task.id,
        recipientUserId,
        reminderKind: kind,
        reminderDate: today,
      }).onConflictDoNothing().returning({ id: workTaskReminderDeliveries.id });
      if (!delivery) continue;

      const isOverdue = kind === "overdue";
      await tx.insert(notifications).values({
        recipientUserId,
        title: isOverdue ? "Task overdue" : "Task due today",
        message: isOverdue
          ? `"${task.title}" was due ${task.dueDate}. Review the task and update its status.`
          : `"${task.title}" is due today. Review your next steps.`,
        type: "task",
        actionUrl: "/work-management/tasks",
      });
      createdCount += 1;
    }
    return createdCount;
  });
}

export function startTaskReminderScheduler(): void {
  const runSafely = async () => {
    try {
      const count = await runTaskDueReminders();
      if (count > 0) logger.info({ count }, "Created task due-date reminders");
    } catch (err) {
      logger.error({ err }, "Task due-date reminder run failed; it will retry on the next interval");
    }
  };
  void runSafely();
  setInterval(() => { void runSafely(); }, REMINDER_INTERVAL_MS);
}
