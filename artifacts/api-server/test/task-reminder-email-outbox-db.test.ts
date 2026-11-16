import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { after, test } from "node:test";
import { eq } from "drizzle-orm";
import {
  businesses,
  db,
  notifications,
  pool,
  users,
  workTaskReminderDeliveries,
  workTaskReminderEmailOutbox,
  workTasks,
} from "@workspace/db";
import { createBusinessForUser } from "../src/repositories/businesses";
import { runTaskDueReminders } from "../src/services/task-reminders.service";
import { runTaskReminderEmailOutbox } from "../src/services/task-reminder-email-outbox.service";
import { isEmailDeliveryConfigured } from "../src/services/email.service";

const databaseAcceptanceEnabled =
  process.env.KAIRA_DB_INTEGRATION_TESTS === "true";
const testUserIds: string[] = [];

function phoneNumber(): string {
  return `87${randomInt(1_000_000, 9_999_999)}`;
}

async function createUser(input: {
  email: string;
  notificationPreferences: { taskReminders?: boolean; taskReminderEmail?: boolean };
  role?: "owner" | "staff";
  businessId?: string;
}) {
  const [user] = await db.insert(users).values({
    phoneCountryCode: "+220",
    phoneNumber: phoneNumber(),
    email: input.email,
    role: input.role ?? "owner",
    businessId: input.businessId,
    notificationPreferences: input.notificationPreferences,
  }).returning({ id: users.id });
  testUserIds.push(user.id);
  return user;
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

test("task reminder email outbox respects channel opt-ins and is idempotent", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const ownerEmail = `ci-owner-${randomInt(100_000, 999_999)}@example.test`;
  const owner = await createUser({
    email: ownerEmail,
    notificationPreferences: {
      taskReminders: false,
      taskReminderEmail: true,
    },
  });
  const business = await createBusinessForUser(owner.id, {
    name: `CI reminder email ${randomInt(100_000, 999_999)}`,
    type: "small_business",
    industry: "services",
    country: "The Gambia",
    city: "Banjul",
  });
  const staff = await createUser({
    email: `ci-staff-${randomInt(100_000, 999_999)}@example.test`,
    role: "staff",
    businessId: business.id,
    notificationPreferences: {
      taskReminders: true,
      taskReminderEmail: false,
    },
  });

  const [emailOnlyTask] = await db.insert(workTasks).values({
    businessId: business.id,
    createdBy: owner.id,
    assignedTo: owner.id,
    title: "CI email-only reminder",
    status: "todo",
    priority: "medium",
    dueDate: "2026-11-16",
  }).returning({ id: workTasks.id });
  const [inAppOnlyTask] = await db.insert(workTasks).values({
    businessId: business.id,
    createdBy: owner.id,
    assignedTo: staff.id,
    title: "CI in-app-only reminder",
    status: "todo",
    priority: "medium",
    dueDate: "2026-11-16",
  }).returning({ id: workTasks.id });

  const fixedNow = new Date("2026-11-16T12:00:00.000Z");
  assert.equal(await runTaskDueReminders(fixedNow), 1);
  assert.equal(await runTaskDueReminders(fixedNow), 0);

  const emailRows = await db.select().from(workTaskReminderEmailOutbox)
    .where(eq(workTaskReminderEmailOutbox.recipientUserId, owner.id));
  assert.equal(emailRows.length, 1);
  assert.equal(emailRows[0].taskId, emailOnlyTask.id);
  assert.equal(emailRows[0].recipientEmail, ownerEmail);
  assert.equal(emailRows[0].status, "pending");
  assert.equal(emailRows[0].attemptCount, 0);

  const ownerNotifications = await db.select().from(notifications)
    .where(eq(notifications.recipientUserId, owner.id));
  assert.equal(ownerNotifications.length, 0);
  const staffNotifications = await db.select().from(notifications)
    .where(eq(notifications.recipientUserId, staff.id));
  assert.equal(staffNotifications.length, 1);
  assert.match(staffNotifications[0].message, /due today/i);

  const ownerDeliveries = await db.select().from(workTaskReminderDeliveries)
    .where(eq(workTaskReminderDeliveries.recipientUserId, owner.id));
  assert.equal(ownerDeliveries.length, 0);
  const staffDeliveries = await db.select().from(workTaskReminderDeliveries)
    .where(eq(workTaskReminderDeliveries.recipientUserId, staff.id));
  assert.equal(staffDeliveries.length, 1);
  assert.equal(staffDeliveries[0].taskId, inAppOnlyTask.id);

  // CI has no SMTP credentials. The worker must leave queued mail untouched
  // rather than consume retries or falsely mark it delivered.
  if (!isEmailDeliveryConfigured()) {
    assert.equal(await runTaskReminderEmailOutbox(fixedNow), 0);
    const [stillPending] = await db.select().from(workTaskReminderEmailOutbox)
      .where(eq(workTaskReminderEmailOutbox.id, emailRows[0].id)).limit(1);
    assert.equal(stillPending?.status, "pending");
    assert.equal(stillPending?.attemptCount, 0);
  }
});
