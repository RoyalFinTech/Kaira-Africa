import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import type { Server } from "node:http";
import { after, test } from "node:test";
import express from "express";
import { and, eq } from "drizzle-orm";
import {
  businesses,
  crmInteractions,
  customers,
  db,
  pool,
  users,
} from "@workspace/db";
import crmRouter from "../src/routes/crm";
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
    name: `CI CRM route ${label} ${randomInt(100_000, 999_999)}`,
    type: "small_business",
    industry: "retail",
    country: "The Gambia",
    city: "Banjul",
  };
}

async function createTestUser(
  role: "owner" | "staff" = "owner",
  businessId?: string,
) {
  const [user] = await db.insert(users).values({
    phoneCountryCode: "+220",
    phoneNumber: phoneNumber(),
    role,
    ...(businessId ? { businessId } : {}),
  }).returning({ id: users.id, role: users.role });
  testUserIds.push(user.id);
  return user;
}

async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken("usr");
  await createUserSession({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    userAgent: "kaira-crm-route-ci",
    ipAddress: "127.0.0.1",
  });
  return token;
}

async function startTestServer(): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use("/api", crmRouter);
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
  method: "POST" | "PATCH",
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

test("CRM staff can create interactions only for their business and only follow-ups can be completed", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const owner = await createTestUser();
  const business = await createBusinessForUser(owner.id, businessInput("staff"));
  const staff = await createTestUser("staff", business.id);
  const outsiderOwner = await createTestUser();
  const outsiderBusiness = await createBusinessForUser(
    outsiderOwner.id,
    businessInput("outsider"),
  );

  const [customer] = await db.insert(customers).values({
    businessId: business.id,
    firstName: "CI",
    lastName: "Customer",
    status: "active",
    profileData: {},
  }).returning({ id: customers.id });
  const [outsiderCustomer] = await db.insert(customers).values({
    businessId: outsiderBusiness.id,
    firstName: "Other",
    lastName: "Business",
    status: "active",
    profileData: {},
  }).returning({ id: customers.id });

  const staffToken = await createSession(staff.id);
  await startTestServer();

  const anonymousResponse = await request("POST", "/api/crm/interactions", undefined, {
    customerId: customer.id,
    title: "Unauthorized note",
    note: "Must not be saved",
  });
  assert.equal(anonymousResponse.status, 401);
  await anonymousResponse.body?.cancel();

  const createdResponse = await request("POST", "/api/crm/interactions", staffToken, {
    customerId: customer.id,
    type: "note",
    title: "Staff customer note",
    note: "Recorded by an authenticated staff member",
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json() as {
    id: string;
    businessId: string;
    customerId: string;
    type: string;
    title: string;
  };
  assert.equal(created.businessId, business.id);
  assert.equal(created.customerId, customer.id);
  assert.equal(created.type, "note");
  assert.equal(created.title, "Staff customer note");

  const crossBusinessResponse = await request("POST", "/api/crm/interactions", staffToken, {
    customerId: outsiderCustomer.id,
    type: "note",
    title: "Cross-business attempt",
    note: "Must be rejected",
  });
  assert.equal(crossBusinessResponse.status, 404);
  await crossBusinessResponse.body?.cancel();

  const [note] = await db.insert(crmInteractions).values({
    businessId: business.id,
    customerId: customer.id,
    userId: staff.id,
    type: "note",
    title: "Ordinary note",
    note: "Not a follow-up",
  }).returning({ id: crmInteractions.id });

  const [followUp] = await db.insert(crmInteractions).values({
    businessId: business.id,
    customerId: customer.id,
    userId: staff.id,
    type: "follow_up",
    title: "Call customer",
    note: "Scheduled follow-up",
    nextActionAt: new Date(Date.now() + 60 * 60 * 1000),
  }).returning({ id: crmInteractions.id });

  const noteCompleteResponse = await request(
    "PATCH",
    `/api/crm/interactions/${note.id}/complete`,
    staffToken,
  );
  assert.equal(noteCompleteResponse.status, 404);
  await noteCompleteResponse.body?.cancel();

  const [unchangedNote] = await db.select({ completedAt: crmInteractions.completedAt })
    .from(crmInteractions)
    .where(and(eq(crmInteractions.id, note.id), eq(crmInteractions.businessId, business.id)))
    .limit(1);
  assert.equal(unchangedNote?.completedAt, null);

  const followUpCompleteResponse = await request(
    "PATCH",
    `/api/crm/interactions/${followUp.id}/complete`,
    staffToken,
  );
  assert.equal(followUpCompleteResponse.status, 200);
  const completed = await followUpCompleteResponse.json() as { id: string; completedAt: string | null };
  assert.equal(completed.id, followUp.id);
  assert.ok(completed.completedAt);

  const crossBusinessCompleteResponse = await request(
    "PATCH",
    `/api/crm/interactions/${followUp.id}/complete`,
    await createSession(outsiderOwner.id),
  );
  assert.equal(crossBusinessCompleteResponse.status, 404);
  await crossBusinessCompleteResponse.body?.cancel();
});
