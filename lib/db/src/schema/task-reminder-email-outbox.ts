import { pgTable, uuid, text, date, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";
import { workTasks } from "./work-management";

/** Durable, idempotent queue for opted-in task reminder email delivery. */
export const workTaskReminderEmailOutbox = pgTable("work_task_reminder_email_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").notNull().references(() => workTasks.id, { onDelete: "cascade" }),
  recipientUserId: uuid("recipient_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email").notNull(),
  reminderKind: text("reminder_kind").notNull(),
  reminderDate: date("reminder_date", { mode: "string" }).notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  lastError: text("last_error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("work_task_reminder_email_outbox_once_per_day").on(t.taskId, t.recipientUserId, t.reminderKind, t.reminderDate),
  index("work_task_reminder_email_outbox_pending_idx").on(t.status, t.nextAttemptAt, t.createdAt),
]);
