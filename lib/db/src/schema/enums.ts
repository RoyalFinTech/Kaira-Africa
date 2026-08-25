import { pgEnum } from "drizzle-orm/pg-core";

// ─── Users / auth ────────────────────────────────────────────────────────────
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "inactive",
  "suspended",
]);

// Business-level permission role (distinct from admin_role, which is
// for the internal 🛡️ admin portal only).
export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "admin",
  "manager",
  "staff",
]);

export const adminRoleEnum = pgEnum("admin_role", [
  "super_admin",
  "admin",
  "accounts",
  "compliance",
  "support",
  "operations",
  "technology",
]);

export const adminStatusEnum = pgEnum("admin_status", [
  "active",
  "restricted",
  "suspended",
]);

export const otpPurposeEnum = pgEnum("otp_purpose", ["login", "signup"]);

// ─── Business ────────────────────────────────────────────────────────────────
export const businessStatusEnum = pgEnum("business_status", [
  "active",
  "inactive",
  "suspended",
]);

// ─── Team ────────────────────────────────────────────────────────────────────
export const teamMemberStatusEnum = pgEnum("team_member_status", [
  "active",
  "inactive",
  "pending",
]);

// ─── Customers ───────────────────────────────────────────────────────────────
export const customerStatusEnum = pgEnum("customer_status", [
  "active",
  "inactive",
]);

// ─── Transactions ────────────────────────────────────────────────────────────
export const transactionTypeEnum = pgEnum("transaction_type", [
  "payment",
  "refund",
  "transfer",
  "withdrawal",
  "deposit",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "completed",
  "pending",
  "failed",
  "cancelled",
]);

// ─── Activity ────────────────────────────────────────────────────────────────
export const activityStatusEnum = pgEnum("activity_status", [
  "success",
  "warning",
  "error",
  "info",
]);

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationTypeEnum = pgEnum("notification_type", [
  "transaction",
  "team",
  "customer",
  "system",
  "security",
  "report",
]);

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportTypeEnum = pgEnum("report_type", [
  "revenue",
  "transaction",
  "customer",
  "activity",
  "team",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "available",
  "generating",
  "failed",
]);
