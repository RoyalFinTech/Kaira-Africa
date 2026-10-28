import { eq, notInArray, sql } from "drizzle-orm";
import {
  db,
  notifications,
  workTaskReminderDeliveries,
  workTaskReminderPreferences,
  businesses,
  workTasks,
} from "@workspace/db";
import { logger } from "../lib/logger";

const REMINDER_INTERVAL_MS = 15 * 60 * 1000;

export function dateInTimezone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (key: string) => parts.find((part) => part.type === key)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function reminderKindForDueDate(dueDate: string, today: string): "due_today" | "overdue" | null {
  if (dueDate > today) return null;
  return dueDate === today ? "due_today" : "overdue";
}

/**
 * Create in-app due-date reminders only. The unique delivery key and a
 * PostgreSQL advisory lock make repeated runs/restarts safe and prevent
 * duplicate notifications for the same task, recipient, kind and date.
 * Each business uses its configured IANA time zone. Email and web-push delivery
 * are not implemented in this in-app reminder phase.
 */
export async function runTaskDueReminders(now = new Date()): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('kaira-work-task-reminders', 0))`);
    const tasks = await tx.select({
      id: workTasks.id,
      businessId: workTasks.businessId,
      title: workTasks.title,
      dueDate: workTasks.dueDate,
      assignedTo: workTasks.assignedTo,
      createdBy: workTasks.createdBy,
      businessTimezone: businesses.timezone,
    }).from(workTasks).innerJoin(businesses, eq(workTasks.businessId, businesses.id)).where(
      notInArray(workTasks.status, ["done", "cancelled"]),
    );

    const preferences = await tx.select().from(workTaskReminderPreferences);
    const preferenceByUserAndBusiness = new Map(preferences.map((item) => [`${item.businessId}:${item.userId}`, item]));
    let createdCount = 0;
    for (const task of tasks) {
      if (!task.dueDate) continue;
      let today: string;
      try { today = dateInTimezone(now, task.businessTimezone || "Africa/Banjul"); }
      catch { today = dateInTimezone(now, "Africa/Banjul"); }
      const kind = reminderKindForDueDate(task.dueDate, today);
      if (!kind) continue;
      const recipientUserId = task.assignedTo ?? task.createdBy;
      const preference = preferenceByUserAndBusiness.get(`${task.businessId}:${recipientUserId}`);
      if ((kind === "due_today" && preference?.dueTodayEnabled === false) || (kind === "overdue" && preference?.overdueEnabled === false)) continue;
      const [delivery] = await tx.insert(workTaskReminderDeliveries).values({
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
