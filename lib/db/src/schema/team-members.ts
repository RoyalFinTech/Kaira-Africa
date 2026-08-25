import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamMemberStatusEnum } from "./enums";
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
    email: text("email").notNull(),
    phone: text("phone"),

    role: text("role").notNull(),
    department: text("department"),
    avatarUrl: text("avatar_url"),

    status: teamMemberStatusEnum("status").notNull().default("pending"),

    invitedAt: timestamp("invited_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  },
  (table) => [
    index("team_members_business_idx").on(table.businessId),
    index("team_members_email_idx").on(table.businessId, table.email),
  ],
);

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  invitedAt: true,
});
export const selectTeamMemberSchema = createSelectSchema(teamMembers);
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
