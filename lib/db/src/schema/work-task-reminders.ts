import { pgTable, uuid, text, date, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";
import { workTasks } from "./work-management";

export const workTaskReminderDeliveries = pgTable("work_task_reminder_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").notNull().references(() => workTasks.id, { onDelete: "cascade" }),
  recipientUserId: uuid("recipient_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reminderKind: text("reminder_kind").notNull(),
  reminderDate: date("reminder_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("work_task_reminder_deliveries_once_per_day").on(t.taskId, t.recipientUserId, t.reminderKind, t.reminderDate),
  index("work_task_reminder_deliveries_business_date_idx").on(t.businessId, t.reminderDate),
]);
