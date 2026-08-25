import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { userStatusEnum, userRoleEnum } from "./enums";
import { businesses } from "./businesses";

/**
 * Business-side users. Authenticated via Gambian phone number + OTP
 * (see otp_verifications / user_sessions). Distinct from admin_users,
 * which is a separate table/flow for the internal 🛡️ admin portal.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Auth identity — phone is the primary login credential.
    phoneCountryCode: text("phone_country_code").notNull().default("+220"),
    phoneNumber: text("phone_number").notNull(),

    // Contact / profile. firstName/lastName are nullable because a
    // user exists as soon as their phone is OTP-verified — the Full
    // Name screen (and business onboarding) come after, in a later
    // step of the same signup flow, matching the real product's
    // Phone -> OTP -> Full Name -> Business Onboarding sequence.
    email: text("email"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    avatarUrl: text("avatar_url"),

    // Business-level permission role. See userRoleEnum — distinct from
    // admin_users.role, which governs the separate 🛡️ admin portal.
    role: userRoleEnum("role").notNull().default("owner"),

    // The business this user currently belongs to (nullable until they
    // complete business onboarding). A user can only belong to one
    // business at a time in this version of the product.
    businessId: uuid("business_id").references(
      (): AnyPgColumn => businesses.id,
      { onDelete: "set null" },
    ),

    status: userStatusEnum("status").notNull().default("active"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (table) => [
    // Full phone number (country code + number) must be unique platform-wide.
    uniqueIndex("users_phone_unique").on(
      table.phoneCountryCode,
      table.phoneNumber,
    ),
  ],
);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
