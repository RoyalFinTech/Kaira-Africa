import { pgTable, uuid, text, bigint, char, date, timestamp, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";

/** User-recorded savings goals. Balances are calculated from recorded entries, not external wallet APIs. */
export const savingsGoals = pgTable("savings_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  purpose: text("purpose"),
  currency: char("currency", { length: 3 }).notNull().default("GMD"),
  targetMinor: bigint("target_minor", { mode: "number" }).notNull(),
  targetDate: date("target_date", { mode: "string" }),
  savingFrequency: text("saving_frequency").notNull().default("weekly"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("savings_goals_business_status_idx").on(table.businessId, table.status),
  index("savings_goals_business_created_idx").on(table.businessId, table.createdAt),
]);

export const savingsEntries = pgTable("savings_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  goalId: uuid("goal_id").references(() => savingsGoals.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  entryType: text("entry_type").notNull().default("deposit"),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  currency: char("currency", { length: 3 }).notNull().default("GMD"),
  savedDate: date("saved_date", { mode: "string" }).notNull().defaultNow(),
  destinationType: text("destination_type").notNull().default("mobile_money"),
  provider: text("provider").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("savings_entries_business_date_idx").on(table.businessId, table.savedDate),
  index("savings_entries_goal_date_idx").on(table.goalId, table.savedDate),
]);
