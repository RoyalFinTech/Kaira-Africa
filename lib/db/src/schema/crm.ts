import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businesses } from "./businesses";
import { customers } from "./customers";
import { users } from "./users";

export const crmInteractions = pgTable(
  "crm_interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull().default("note"),
    title: text("title").notNull(),
    note: text("note").notNull(),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("crm_interactions_business_idx").on(table.businessId),
    index("crm_interactions_customer_idx").on(table.customerId),
    index("crm_interactions_next_action_idx").on(table.businessId, table.nextActionAt),
  ],
);

export const insertCrmInteractionSchema = createInsertSchema(crmInteractions).omit({ id: true, createdAt: true });
export const selectCrmInteractionSchema = createSelectSchema(crmInteractions);
export type InsertCrmInteraction = z.infer<typeof insertCrmInteractionSchema>;
export type CrmInteraction = typeof crmInteractions.$inferSelect;
