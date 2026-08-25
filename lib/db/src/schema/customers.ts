import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customerStatusEnum } from "./enums";
import { businesses } from "./businesses";

/**
 * Note: `totalSpend`, `transactionCount`, and `lastTransactionAt` from
 * the OpenAPI `Customer` schema are intentionally NOT stored here —
 * they're derived by aggregating `transactions` at query time in
 * Phase 3, so they can never drift out of sync with the actual
 * transaction ledger. See the route layer for the aggregation query.
 */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    country: text("country"),
    city: text("city"),
    avatarUrl: text("avatar_url"),

    status: customerStatusEnum("status").notNull().default("active"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("customers_business_idx").on(table.businessId),
    index("customers_business_email_idx").on(table.businessId, table.email),
  ],
);

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectCustomerSchema = createSelectSchema(customers);
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
