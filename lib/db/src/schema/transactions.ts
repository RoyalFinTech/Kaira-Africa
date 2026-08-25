import {
  pgTable,
  uuid,
  text,
  bigint,
  char,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { transactionTypeEnum, transactionStatusEnum } from "./enums";
import { businesses } from "./businesses";
import { customers } from "./customers";

/**
 * Money is stored as an integer count of the currency's minor unit
 * (e.g. bututs/cents) in `amountMinor` — never as a float. The API
 * layer (Phase 3) is responsible for converting to/from the decimal
 * `amount` shape the OpenAPI contract exposes.
 */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    // Nullable — not every transaction (e.g. some withdrawals) is tied
    // to a customer.
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),

    reference: text("reference").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("GMD"),

    type: transactionTypeEnum("type").notNull(),
    status: transactionStatusEnum("status").notNull().default("pending"),

    description: text("description"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("transactions_business_idx").on(table.businessId),
    index("transactions_customer_idx").on(table.customerId),
    index("transactions_business_created_idx").on(
      table.businessId,
      table.createdAt,
    ),
    // Reference numbers must be unique per business (not globally —
    // different businesses may independently generate the same
    // human-readable reference format).
    uniqueIndex("transactions_business_reference_unique").on(
      table.businessId,
      table.reference,
    ),
  ],
);

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});
export const selectTransactionSchema = createSelectSchema(transactions);
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
