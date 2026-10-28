import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";

export const teamMessages = pgTable("team_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  messageType: text("message_type").notNull().default("message"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("team_messages_business_created_idx").on(t.businessId, t.createdAt),
  index("team_messages_business_type_created_idx").on(t.businessId, t.messageType, t.createdAt),
]);
