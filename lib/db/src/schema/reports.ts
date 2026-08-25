import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { reportTypeEnum, reportStatusEnum } from "./enums";
import { businesses } from "./businesses";

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    description: text("description").notNull(),
    type: reportTypeEnum("type").notNull(),
    status: reportStatusEnum("status").notNull().default("generating"),

    period: text("period"),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    downloadUrl: text("download_url"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("reports_business_idx").on(table.businessId)],
);

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});
export const selectReportSchema = createSelectSchema(reports);
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;
