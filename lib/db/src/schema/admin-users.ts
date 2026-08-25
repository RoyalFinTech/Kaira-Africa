import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { adminRoleEnum, adminStatusEnum } from "./enums";

/**
 * Administrators for the 🛡️ Admin Portal. Deliberately a separate table
 * from `users` — admin auth (email + password) must never share
 * infrastructure with customer-facing phone/OTP auth, per the Kaira
 * Africa security requirements. Authorization must be enforced here
 * server-side (role checks), never inferred from the frontend route.
 */
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),

  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),

  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),

  role: adminRoleEnum("role").notNull().default("support"),
  status: adminStatusEnum("status").notNull().default("active"),

  // Simple lockout bookkeeping for failed login attempts.
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectAdminUserSchema = createSelectSchema(adminUsers).omit({
  passwordHash: true,
});
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
