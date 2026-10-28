import { pgTable, uuid, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";

export const workTaskReminderPreferences = pgTable("work_task_reminder_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dueTodayEnabled: boolean("due_today_enabled").notNull().default(true),
  overdueEnabled: boolean("overdue_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("work_task_reminder_preferences_business_user_unique").on(t.businessId, t.userId),
  index("work_task_reminder_preferences_user_idx").on(t.userId, t.businessId),
]);
