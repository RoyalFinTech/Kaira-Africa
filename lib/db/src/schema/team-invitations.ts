import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamInvitationStatusEnum, userRoleEnum } from "./enums";
import { businesses } from "./businesses";
import { teamMembers } from "./team-members";
import { users } from "./users";

export const teamInvitations = pgTable(
  "team_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    teamMemberId: uuid("team_member_id").notNull().unique().references(() => teamMembers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    targetPhoneCountryCode: text("target_phone_country_code").notNull().default("+220"),
    targetPhoneNumber: text("target_phone_number").notNull(),
    accessRole: userRoleEnum("access_role").notNull(),
    status: teamInvitationStatusEnum("status").notNull().default("pending"),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }).notNull().defaultNow(),
    emailDeliveryStatus: text("email_delivery_status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("team_invitations_business_status_idx").on(table.businessId, table.status),
    index("team_invitations_expiry_idx").on(table.expiresAt),
    uniqueIndex("team_invitations_business_phone_pending_unique")
      .on(table.businessId, table.targetPhoneCountryCode, table.targetPhoneNumber)
      .where(sql`${table.status} = 'pending'`),
    check("team_invitations_assignable_role_only", sql`${table.accessRole} IN ('manager', 'staff')`),
  ],
);

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectTeamInvitationSchema = createSelectSchema(teamInvitations);
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
export type TeamInvitation = typeof teamInvitations.$inferSelect;
