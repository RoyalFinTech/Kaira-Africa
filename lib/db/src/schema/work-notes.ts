import { pgTable, uuid, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";

/** Business-scoped written notes. File uploads are deliberately not included in this first version. */
export const workNotes = pgTable("work_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  category: text("category").notNull().default("general"),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("work_notes_business_updated_idx").on(t.businessId, t.updatedAt),
  index("work_notes_business_category_idx").on(t.businessId, t.category),
]);
