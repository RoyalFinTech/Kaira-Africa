import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { otpPurposeEnum } from "./enums";
import { users } from "./users";
import { adminUsers } from "./admin-users";

/**
 * OTP codes for phone-based user auth. Never store the raw code —
 * only a hash of it. Not exposed via the OpenAPI contract; this is
 * internal auth-flow state.
 */
export const otpVerifications = pgTable(
  "otp_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    phoneCountryCode: text("phone_country_code").notNull().default("+220"),
    phoneNumber: text("phone_number").notNull(),

    codeHash: text("code_hash").notNull(),
    purpose: otpPurposeEnum("purpose").notNull().default("login"),

    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("otp_phone_idx").on(table.phoneCountryCode, table.phoneNumber),
  ],
);

/**
 * Server-side sessions for `users` (phone/OTP auth). Kept separate from
 * admin_sessions so a bug in one auth flow can never grant access to
 * the other.
 */
export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    tokenHash: text("token_hash").notNull().unique(),

    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("user_sessions_user_idx").on(table.userId)],
);

/**
 * Server-side sessions for admin_users (email/password auth).
 */
export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),

    tokenHash: text("token_hash").notNull().unique(),

    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("admin_sessions_admin_idx").on(table.adminUserId)],
);

/**
 * Reset tokens for admin_users (email-based "forgot password" flow).
 * Kept separate from otp_verifications, which is phone-based and
 * belongs to the user/customer auth surface, not the admin portal.
 */
export const adminPasswordResets = pgTable(
  "admin_password_resets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),

    tokenHash: text("token_hash").notNull().unique(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("admin_password_resets_admin_idx").on(table.adminUserId)],
);

/**
 * General-purpose security audit trail for authentication events
 * (OTP requests/verifications, admin logins, password changes,
 * lockouts, etc). Deliberately NOT scoped to a business — this exists
 * for security/ops visibility across the whole platform, unlike
 * activity_logs which is a per-business feature the business owner
 * sees in their own dashboard.
 */
export const authAuditLogs = pgTable(
  "auth_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    actorType: text("actor_type").notNull(), // "user" | "admin" | "unknown"
    actorId: uuid("actor_id"),

    event: text("event").notNull(), // e.g. "otp_requested", "otp_verified", "admin_login_failed"
    success: boolean("success").notNull().default(true),

    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("auth_audit_logs_actor_idx").on(table.actorType, table.actorId),
    index("auth_audit_logs_event_idx").on(table.event),
  ],
);

export const insertOtpVerificationSchema = createInsertSchema(
  otpVerifications,
).omit({ id: true, createdAt: true });
export const selectOtpVerificationSchema =
  createSelectSchema(otpVerifications);
export type InsertOtpVerification = z.infer<
  typeof insertOtpVerificationSchema
>;
export type OtpVerification = typeof otpVerifications.$inferSelect;

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});
export type UserSession = typeof userSessions.$inferSelect;

export const insertAdminSessionSchema = createInsertSchema(
  adminSessions,
).omit({ id: true, createdAt: true });
export type AdminSession = typeof adminSessions.$inferSelect;

export const insertAdminPasswordResetSchema = createInsertSchema(
  adminPasswordResets,
).omit({ id: true, createdAt: true });
export type AdminPasswordReset = typeof adminPasswordResets.$inferSelect;

export const insertAuthAuditLogSchema = createInsertSchema(
  authAuditLogs,
).omit({ id: true, createdAt: true });
export type AuthAuditLog = typeof authAuditLogs.$inferSelect;
