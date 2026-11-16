import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import type { Server } from "node:http";
import { after, test } from "node:test";
import express from "express";
import { eq } from "drizzle-orm";
import { businesses, db, notifications, pool, teamMembers, users, workMeetings } from "@workspace/db";
import workManagementRouter from "../src/routes/work-management";
import { errorHandler } from "../src/middlewares/error-handler";
import { generateSessionToken, hashToken } from "../src/lib/tokens";
import { createUserSession } from "../src/repositories/sessions";
import { createBusinessForUser } from "../src/repositories/businesses";

// Runs against disposable PostgreSQL only in Backend CI after migrations.
const databaseAcceptanceEnabled =
  process.env.KAIRA_DB_INTEGRATION_TESTS === "true";
const testUserIds: string[] = [];
let server: Server | null = null;
let baseUrl = "";

function phoneNumber(): string {
  return `87${randomInt(1_000_000, 9_999_999)}`;
}

function businessInput(label: string) {
  return {
    name: `CI meeting route ${label} ${randomInt(100_000, 999_999)}`,
    type: "small_business",
    industry: "services",
    country: "The Gambia",
    city: "Banjul",
  };
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

async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken("usr");
  await createUserSession({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    userAgent: "kaira-meeting-route-ci",
    ipAddress: "127.0.0.1",
  });
  return token;
}

async function startTestServer(): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use("/api", workManagementRouter);
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server!.once("listening", resolve);
    server!.once("error", reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function request(
  method: "GET" | "POST" | "PATCH",
  path: string,
  token?: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(5_000),
  });
}

after(async () => {
  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => error ? reject(error) : resolve());
      });
      server = null;
    }
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

test("meeting routes authenticate, validate time zones and isolate business records", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const owner = await createTestUser();
  const business = await createBusinessForUser(owner.id, businessInput("owner"));
  const attendeeUser = await createTestUser();
  await db.insert(teamMembers).values({
    businessId: business.id,
    userId: attendeeUser.id,
    firstName: "CI",
    lastName: "Attendee",
    role: "staff",
    accessRole: "staff",
    status: "active",
  });
  const outsiderOwner = await createTestUser();
  const outsiderBusiness = await createBusinessForUser(
    outsiderOwner.id,
    businessInput("outsider"),
  );
  const ownerToken = await createSession(owner.id);
  const outsiderToken = await createSession(outsiderOwner.id);
  await startTestServer();

  const anonymousResponse = await request("GET", "/api/work/meetings");
  assert.equal(anonymousResponse.status, 401);
  await anonymousResponse.body?.cancel();

  const startsAt = "2026-12-01T10:30:00.000Z";
  const createResponse = await request("POST", "/api/work/meetings", ownerToken, {
    title: "CI planning meeting",
    meetingType: "planning",
    startsAt,
    timeZone: "Africa/Banjul",
    attendees: ["CI Owner", "External Participant"],
    attendeeUserIds: [attendeeUser.id],
    agenda: "Review the release plan",
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json() as {
    id: string;
    businessId: string;
    title: string;
    startsAt: string;
    timeZone: string;
    attendees: string[];
    attendeeUserIds: string[];
  };
  assert.equal(created.businessId, business.id);
  assert.equal(created.title, "CI planning meeting");
  assert.equal(new Date(created.startsAt).toISOString(), startsAt);
  assert.equal(created.timeZone, "Africa/Banjul");
  assert.deepEqual(created.attendees, ["CI Owner", "External Participant"]);
  assert.deepEqual(created.attendeeUserIds, [attendeeUser.id]);
  const delivered = await db.select({recipientUserId:notifications.recipientUserId,title:notifications.title})
    .from(notifications).where(eq(notifications.recipientUserId,attendeeUser.id));
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0]?.title, "Meeting scheduled");
  const creatorNotifications = await db.select({id:notifications.id}).from(notifications)
    .where(eq(notifications.recipientUserId,owner.id));
  assert.equal(creatorNotifications.length, 0);

  const listResponse = await request("GET", "/api/work/meetings", ownerToken);
  assert.equal(listResponse.status, 200);
  const listed = await listResponse.json() as Array<{ id: string; businessId: string }>;
  assert.ok(listed.some((meeting) => meeting.id === created.id));
  assert.ok(listed.every((meeting) => meeting.businessId === business.id));

  const invalidAttendeeResponse = await request("POST", "/api/work/meetings", ownerToken, {
    title: "Invalid attendee test",
    attendeeUserIds: [outsiderOwner.id],
  });
  assert.equal(invalidAttendeeResponse.status, 400);
  await invalidAttendeeResponse.body?.cancel();

  const invalidTimeZoneResponse = await request(
    "PATCH",
    `/api/work/meetings/${created.id}`,
    ownerToken,
    { timeZone: "Not/A_Real_Time_Zone" },
  );
  assert.equal(invalidTimeZoneResponse.status, 400);
  await invalidTimeZoneResponse.body?.cancel();

  const crossBusinessUpdateResponse = await request(
    "PATCH",
    `/api/work/meetings/${created.id}`,
    outsiderToken,
    { title: "Unauthorized change" },
  );
  assert.equal(crossBusinessUpdateResponse.status, 404);
  await crossBusinessUpdateResponse.body?.cancel();

  const updateResponse = await request(
    "PATCH",
    `/api/work/meetings/${created.id}`,
    ownerToken,
    { title: "Updated planning meeting", status: "held" },
  );
  assert.equal(updateResponse.status, 200);
  const updated = await updateResponse.json() as { title: string; status: string; attendeeUserIds: string[] };
  assert.equal(updated.title, "Updated planning meeting");
  assert.equal(updated.status, "held");
  assert.deepEqual(updated.attendeeUserIds, [attendeeUser.id]);
  const updateNotifications = await db.select({title:notifications.title}).from(notifications)
    .where(eq(notifications.recipientUserId,attendeeUser.id));
  assert.equal(updateNotifications.length, 2);
  assert.ok(updateNotifications.some((notification) => notification.title === "Meeting updated"));

  const [persisted] = await db.select({
    businessId: workMeetings.businessId,
    title: workMeetings.title,
    status: workMeetings.status,
  }).from(workMeetings).where(eq(workMeetings.id, created.id)).limit(1);
  assert.equal(persisted?.businessId, business.id);
  assert.equal(persisted?.title, "Updated planning meeting");
  assert.equal(persisted?.status, "held");

  // An unrelated business cannot enumerate another business's meeting records.
  const outsiderListResponse = await request("GET", "/api/work/meetings", outsiderToken);
  assert.equal(outsiderListResponse.status, 200);
  const outsiderMeetings = await outsiderListResponse.json() as Array<{ id: string }>;
  assert.ok(!outsiderMeetings.some((meeting) => meeting.id === created.id));
  assert.notEqual(outsiderBusiness.id, business.id);
});
