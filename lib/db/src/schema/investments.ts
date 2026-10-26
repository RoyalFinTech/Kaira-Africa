import { pgTable, uuid, text, bigint, char, date, timestamp, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";

/** Business-specific investment goals. Monetary values are stored in minor units. */
export const investmentPlans = pgTable("investment_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  businessCategory: text("business_category").notNull(),
  customCategory: text("custom_category"),
  businessModel: text("business_model").notNull().default("offline"),
  description: text("description"),
  currency: char("currency", { length: 3 }).notNull().default("GMD"),
  initialInvestmentMinor: bigint("initial_investment_minor", { mode: "number" }).notNull(),
  additionalCostsMinor: bigint("additional_costs_minor", { mode: "number" }).notNull().default(0),
  expectedRevenueMinor: bigint("expected_revenue_minor", { mode: "number" }).notNull(),
  expectedProfitMinor: bigint("expected_profit_minor", { mode: "number" }).notNull(),
  targetDate: date("target_date", { mode: "string" }),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("investment_plans_business_status_idx").on(table.businessId, table.status),
  index("investment_plans_business_created_idx").on(table.businessId, table.createdAt),
]);

/** Daily actuals are kept separate from forecasts so the plan never pretends expected profit is achieved profit. */
export const investmentDailyRecords = pgTable("investment_daily_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => investmentPlans.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  recordDate: date("record_date", { mode: "string" }).notNull().defaultNow(),
  salesMinor: bigint("sales_minor", { mode: "number" }).notNull().default(0),
  expensesMinor: bigint("expenses_minor", { mode: "number" }).notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("investment_daily_business_date_idx").on(table.businessId, table.recordDate),
  index("investment_daily_plan_date_idx").on(table.planId, table.recordDate),
]);
