import { pgTable, uuid, text, timestamp, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessStatusEnum } from "./enums";
import { users } from "./users";

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),

  // The user who created/owns this business. Kept separate from
  // users.businessId (which is "the business I currently belong to")
  // so ownership survives even if a future version supports transferring
  // ownership or a user leaving their own business.
  ownerId: uuid("owner_id")
    .notNull()
    .references((): AnyPgColumn => users.id, { onDelete: "restrict" }),

  name: text("name").notNull(),
  type: text("type").notNull(),
  industry: text("industry").notNull(),
  country: text("country").notNull().default("The Gambia"),
  city: text("city").notNull(),

  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  description: text("description"),
  logoUrl: text("logo_url"),
  address: text("address"),

  // Free text on purpose — matches the existing OpenAPI contract, which
  // treats team size as a display string (e.g. "1-10") rather than a
  // strict number.
  teamSize: text("team_size"),

  status: businessStatusEnum("status").notNull().default("active"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectBusinessSchema = createSelectSchema(businesses);
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;
