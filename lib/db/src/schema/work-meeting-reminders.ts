import { pgTable, uuid, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";
import { workMeetings } from "./work-management";

/**
 * Idempotency ledger for the one pre-start reminder sent to each selected
 * attendee for a particular meeting schedule. A reschedule has a new
 * scheduledFor value and therefore receives a fresh reminder.
 */
export const workMeetingReminderDeliveries = pgTable("work_meeting_reminder_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  meetingId: uuid("meeting_id").notNull().references(() => workMeetings.id, { onDelete: "cascade" }),
  recipientUserId: uuid("recipient_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("work_meeting_reminder_deliveries_once_per_schedule")
    .on(t.meetingId, t.recipientUserId, t.scheduledFor),
  index("work_meeting_reminder_deliveries_business_schedule_idx")
    .on(t.businessId, t.scheduledFor),
]);
