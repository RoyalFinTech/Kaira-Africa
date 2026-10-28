import { and, inArray, lte, notInArray, sql } from "drizzle-orm";
import {
  db,
  businesses,
  notifications,
  users,
  workTaskReminderDeliveries,
  workTaskReminderEmailOutbox,
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
 * Reminder dates are evaluated in each business's configured IANA time zone.
 * Delivery is in-app only; email/web-push are separate integrations.
 */
export async function runTaskDueReminders(now = new Date()): Promise<number> {
  const utcDate = now.toISOString().slice(0, 10);
  const upperBound = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('kaira-work-task-reminders', 0))`);
    const tasks = await tx.select({
      id: workTasks.id,
      businessId: workTasks.businessId,
      businessTimeZone: businesses.timeZone,
      title: workTasks.title,
      dueDate: workTasks.dueDate,
      assignedTo: workTasks.assignedTo,
      createdBy: workTasks.createdBy,
    }).from(workTasks).innerJoin(businesses, sql`${businesses.id} = ${workTasks.businessId}`).where(and(
      lte(workTasks.dueDate, upperBound),
      notInArray(workTasks.status, ["done", "cancelled"]),
    ));
    const recipientIds = [...new Set(tasks.map(task => task.assignedTo ?? task.createdBy))];
    const recipientRows = recipientIds.length
      ? await tx.select({ id: users.id, email: users.email, preferences: users.notificationPreferences })
          .from(users).where(inArray(users.id, recipientIds))
      : [];
    const recipientByUser = new Map(recipientRows.map(user => [user.id, user]));

    let createdCount = 0;
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const recipientUserId = task.assignedTo ?? task.createdBy;
      const recipient = recipientByUser.get(recipientUserId);
      if (recipient?.preferences?.taskReminders === false) continue;
      let today: string;
      try {
        const parts = new Intl.DateTimeFormat("en-CA", { timeZone: task.businessTimeZone || "Africa/Banjul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
        const part = (type: string) => parts.find(value => value.type === type)?.value ?? "";
        today = `${part("year")}-${part("month")}-${part("day")}`;
      } catch {
        today = utcDate;
      }
      const kind = reminderKindForDueDate(task.dueDate, today);
      if (!kind) continue;
      const [delivery] = await tx.insert(workTaskReminderDeliveries).values({
        businessId: task.businessId,
        taskId: task.id,
        recipientUserId,
        reminderKind: kind,
        reminderDate: today,
      }).onConflictDoNothing().returning({ id: workTaskReminderDeliveries.id });

      const isOverdue = kind === "overdue";
      if (recipient?.preferences?.taskReminderEmail === true && recipient.email) {
        await tx.insert(workTaskReminderEmailOutbox).values({
          businessId: task.businessId,
          taskId: task.id,
          recipientUserId,
          recipientEmail: recipient.email,
          reminderKind: kind,
          reminderDate: today,
          subject: isOverdue ? "Kaira Africa: task overdue" : "Kaira Africa: task due today",
          message: isOverdue
            ? '"' + task.title + '" was due ' + task.dueDate + '. Review the task and update its status.'
            : '"' + task.title + '" is due today. Review your next steps.',
        }).onConflictDoNothing();
      }
      if (!delivery) continue;
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
