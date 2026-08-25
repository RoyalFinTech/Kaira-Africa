import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { activityStatusEnum } from "./enums";
import { businesses } from "./businesses";
import { users } from "./users";

/**
 * `userName` / `userAvatarUrl` are snapshotted at write-time (not
 * joined live from `users`) so the activity feed stays accurate even
 * if a user is later renamed or removed. `userId` is kept for anyone
 * who wants to join back to the live user record.
 */
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    userName: text("user_name").notNull(),
    userAvatarUrl: text("user_avatar_url"),

    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    entityName: text("entity_name"),

    description: text("description").notNull(),
    status: activityStatusEnum("status").notNull().default("info"),

    // Free-form structured context (e.g. before/after values) for
    // future audit needs — optional, not exposed via the current API.
    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activity_logs_business_idx").on(table.businessId),
    index("activity_logs_business_created_idx").on(
      table.businessId,
      table.createdAt,
    ),
  ],
);

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});
export const selectActivityLogSchema = createSelectSchema(activityLogs);
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
