import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";
import { workTasks } from "./work-management";

export const workTimeEntries = pgTable("work_time_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  taskId: uuid("task_id").references(() => workTasks.id, { onDelete: "set null" }),
  note: text("note"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("work_time_entries_business_started_idx").on(t.businessId, t.startedAt),
  index("work_time_entries_user_started_idx").on(t.businessId, t.userId, t.startedAt),
]);
