import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customerStatusEnum } from "./enums";
import { businesses } from "./businesses";

/**
 * Extended CRM details intentionally live in profileData rather than a long
 * list of mandatory columns. Different industries collect different fields;
 * personal and sensitive details remain optional and should only be collected
 * when there is a clear business/legal need and the customer understands why.
 */
export type CustomerProfileData = {
  dateOfBirth?: string;
  preferredName?: string;
  gender?: string;
  maritalStatus?: string;
  occupation?: string;
  customerType?: string;
  preferredContactMethod?: string;
  preferredLanguage?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  region?: string;
  source?: string;
  tags?: string[];
  interests?: string;
  preferences?: string;
  consentNotes?: string;
  internalNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  organizationSpecific?: Record<string, string>;
};

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
    profileData: jsonb("profile_data").$type<CustomerProfileData>().notNull().default({}),
    status: customerStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
