import { pgTable, uuid, text, bigint, char, date, timestamp, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";

/**
 * Day-to-day operator ledger. Monetary values are stored as minor units so
 * totals remain exact; the API presents decimal GMD amounts.
 */
export const dailyLedgerEntries = pgTable(
  "daily_ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    entryType: text("entry_type").notNull(),
    description: text("description").notNull(),
    category: text("category"),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("GMD"),
    customerName: text("customer_name"),
    dueDate: date("due_date", { mode: "string" }),
    status: text("status").notNull().default("recorded"),
    recordedDate: date("recorded_date", { mode: "string" }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("daily_ledger_business_date_idx").on(table.businessId, table.recordedDate),
    index("daily_ledger_business_type_date_idx").on(table.businessId, table.entryType, table.recordedDate),
    index("daily_ledger_business_status_idx").on(table.businessId, table.status),
  ],
);

export type DailyLedgerEntry = typeof dailyLedgerEntries.$inferSelect;
