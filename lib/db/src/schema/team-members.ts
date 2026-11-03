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
import { teamMemberStatusEnum, userRoleEnum } from "./enums";
import { businesses } from "./businesses";
import { users } from "./users";

/**
 * A person on a business's team. `userId` is nullable because an
 * invited member starts out as `status: pending` before they ever
 * create a platform account — the row exists first, the login
 * identity attaches later once they accept the invite.
 */
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    // Set once the invited person accepts and creates/links an account.
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),

    role: text("role").notNull(),
    accessRole: userRoleEnum("access_role").notNull().default("staff"),
    department: text("department"),
    avatarUrl: text("avatar_url"),

    status: teamMemberStatusEnum("status").notNull().default("pending"),

    invitedAt: timestamp("invited_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  },
  (table) => [
    index("team_members_business_idx").on(table.businessId),
    index("team_members_email_idx").on(table.businessId, table.email),
    uniqueIndex("team_members_business_user_unique").on(table.businessId, table.userId).where(sql`${table.userId} IS NOT NULL`),
    uniqueIndex("team_members_business_phone_pending_unique").on(table.businessId, table.phone).where(sql`${table.phone} IS NOT NULL AND ${table.status} = 'pending'`),
    check("team_members_access_role_not_owner", sql`${table.accessRole} <> 'owner'`),
  ],
);

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  invitedAt: true,
});
export const selectTeamMemberSchema = createSelectSchema(teamMembers);
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
