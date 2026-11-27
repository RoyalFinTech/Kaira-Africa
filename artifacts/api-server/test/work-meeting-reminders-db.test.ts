import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { after, test } from "node:test";
import { eq } from "drizzle-orm";
import {
  businesses,
  db,
  notifications,
  pool,
  teamMembers,
  users,
  workMeetings,
  workMeetingReminderDeliveries,
} from "@workspace/db";
import { createBusinessForUser } from "../src/repositories/businesses";
import { runMeetingStartReminders } from "../src/services/work-meeting-reminders.service";

// Runs against Backend CI's disposable PostgreSQL database only.
const databaseAcceptanceEnabled = process.env.KAIRA_DB_INTEGRATION_TESTS === "true";
const testUserIds: string[] = [];

function phoneNumber(): string {
  return `87${randomInt(1_000_000, 9_999_999)}`;
}

async function createTestUser() {
  const [user] = await db.insert(users).values({
    phoneCountryCode: "+220",
    phoneNumber: phoneNumber(),
    role: "owner",
  }).returning({ id: users.id });
  testUserIds.push(user.id);
  return user;
}

async function createActiveMember(businessId: string, userId: string, status: "active" | "inactive") {
  await db.insert(teamMembers).values({
    businessId,
    userId,
    firstName: "CI",
    lastName: status === "active" ? "Active Attendee" : "Inactive Attendee",
    role: "staff",
    accessRole: "staff",
    status,
  });
}

after(async () => {
  try {
    for (const userId of testUserIds) {
      await db.update(users).set({ businessId: null }).where(eq(users.id, userId));
    }
    for (const userId of testUserIds) {
      await db.delete(businesses).where(eq(businesses.ownerId, userId));
    }
    for (const userId of testUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
  } finally {
    await pool.end();
  }
});

test("meeting reminders are timely, idempotent, reschedule-aware and tenant-safe", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const owner = await createTestUser();
  const business = await createBusinessForUser(owner.id, {
    name: `CI meeting reminder ${randomInt(100_000, 999_999)}`,
    type: "small_business",
    industry: "services",
    country: "The Gambia",
    city: "Banjul",
  });

  const activeAttendee = await createTestUser();
  const inactiveAttendee = await createTestUser();
  const nonMember = await createTestUser();
  await createActiveMember(business.id, activeAttendee.id, "active");
  await createActiveMember(business.id, inactiveAttendee.id, "inactive");

  const firstStart = new Date("2026-12-01T10:30:00.000Z");
  const [meeting] = await db.insert(workMeetings).values({
    businessId: business.id,
    createdBy: owner.id,
    title: "CI product review",
    meetingType: "review",
    startsAt: firstStart,
    timeZone: "Africa/Banjul",
    attendees: ["Active attendee", "Inactive attendee"],
    attendeeUserIds: [owner.id, activeAttendee.id, inactiveAttendee.id, nonMember.id],
    status: "scheduled",
  }).returning({ id: workMeetings.id });

  const [cancelledMeeting] = await db.insert(workMeetings).values({
    businessId: business.id,
    createdBy: owner.id,
    title: "CI cancelled meeting",
    meetingType: "team",
    startsAt: firstStart,
    timeZone: "Africa/Banjul",
    attendees: [],
    attendeeUserIds: [activeAttendee.id],
    status: "cancelled",
  }).returning({ id: workMeetings.id });

  const firstRunAt = new Date("2026-12-01T10:15:00.000Z");
  assert.equal(await runMeetingStartReminders(firstRunAt), 1);
  // A repeated scheduler tick cannot create a duplicate for the same schedule.
  assert.equal(await runMeetingStartReminders(firstRunAt), 0);

  const firstNotifications = await db.select({
    title: notifications.title,
    message: notifications.message,
    actionUrl: notifications.actionUrl,
  }).from(notifications).where(eq(notifications.recipientUserId, activeAttendee.id));
  assert.equal(firstNotifications.length, 1);
  assert.equal(firstNotifications[0]?.title, "Meeting starting soon");
  assert.match(firstNotifications[0]?.message ?? "", /starts in about 15 minutes/);
  assert.equal(firstNotifications[0]?.actionUrl, "/work-management/meetings");

  for (const recipientUserId of [owner.id, inactiveAttendee.id, nonMember.id]) {
    const rows = await db.select({ id: notifications.id }).from(notifications)
      .where(eq(notifications.recipientUserId, recipientUserId));
    assert.equal(rows.length, 0, "owner, inactive and non-member users must not receive this reminder");
  }

  const [firstDelivery] = await db.select({
    meetingId: workMeetingReminderDeliveries.meetingId,
    recipientUserId: workMeetingReminderDeliveries.recipientUserId,
    scheduledFor: workMeetingReminderDeliveries.scheduledFor,
  }).from(workMeetingReminderDeliveries).where(eq(workMeetingReminderDeliveries.meetingId, meeting.id));
  assert.equal(firstDelivery?.recipientUserId, activeAttendee.id);
  assert.equal(firstDelivery?.scheduledFor.toISOString(), firstStart.toISOString());

  // Moving the meeting to a different start time creates a new delivery key.
  const rescheduledStart = new Date("2026-12-01T11:00:00.000Z");
  await db.update(workMeetings).set({ startsAt: rescheduledStart, updatedAt: new Date() })
    .where(eq(workMeetings.id, meeting.id));
  assert.equal(
    await runMeetingStartReminders(new Date("2026-12-01T10:45:00.000Z")),
    1,
  );
  const afterReschedule = await db.select({ id: notifications.id }).from(notifications)
    .where(eq(notifications.recipientUserId, activeAttendee.id));
  assert.equal(afterReschedule.length, 2);

  const cancelledDeliveries = await db.select({ id: workMeetingReminderDeliveries.id })
    .from(workMeetingReminderDeliveries)
    .where(eq(workMeetingReminderDeliveries.meetingId, cancelledMeeting.id));
  assert.equal(cancelledDeliveries.length, 0, "cancelled meetings must not create reminders");
});
