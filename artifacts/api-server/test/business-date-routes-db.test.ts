import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import type { Server } from "node:http";
import { after, test } from "node:test";
import express from "express";
import { eq } from "drizzle-orm";
import {
  db,
  pool,
  users,
  businesses,
} from "@workspace/db";
import savingsRouter from "../src/routes/savings";
import investmentsRouter from "../src/routes/investments";
import { errorHandler } from "../src/middlewares/error-handler";
import { generateSessionToken, hashToken } from "../src/lib/tokens";
import { createUserSession } from "../src/repositories/sessions";
import { createBusinessForUser, updateBusiness } from "../src/repositories/businesses";
import { dateInBusinessTimeZone } from "../src/lib/business-date";

// Runs against disposable PostgreSQL only in Backend CI after migrations.
const databaseAcceptanceEnabled =
  process.env.KAIRA_DB_INTEGRATION_TESTS === "true";
const testUserIds: string[] = [];
let server: Server | null = null;
let baseUrl = "";

function phoneNumber(): string {
  return `87${randomInt(1_000_000, 9_999_999)}`;
}

function addCalendarDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
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
    userAgent: "kaira-business-date-route-ci",
    ipAddress: "127.0.0.1",
  });
  return token;
}

async function startTestServer(): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use("/api", savingsRouter);
  app.use("/api", investmentsRouter);
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
  method: "POST",
  path: string,
  token: string,
  body: unknown,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
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

test("Savings and Investment routes use the configured business-local date for defaults and future-date guards", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const owner = await createTestUser();
  const business = await createBusinessForUser(owner.id, {
    name: `CI business date ${randomInt(100_000, 999_999)}`,
    type: "small_business",
    industry: "retail",
    country: "The Gambia",
    city: "Banjul",
  });
  const updatedBusiness = await updateBusiness(business.id, {
    timeZone: "Pacific/Kiritimati",
  });
  assert.equal(updatedBusiness?.timeZone, "Pacific/Kiritimati");

  const token = await createSession(owner.id);
  await startTestServer();

  const expectedLocalToday = dateInBusinessTimeZone(
    new Date(),
    "Pacific/Kiritimati",
  );
  const futureLocalDate = addCalendarDays(expectedLocalToday, 1);

  const savingsDeposit = await request("POST", "/api/savings/entries", token, {
    entryType: "deposit",
    amount: 10,
    currency: "GMD",
    destinationType: "cash",
    provider: "CI local date default",
  });
  assert.equal(savingsDeposit.status, 201);
  const savedEntry = await savingsDeposit.json() as { savedDate: string };
  assert.equal(savedEntry.savedDate, expectedLocalToday);

  const futureSavingsDeposit = await request("POST", "/api/savings/entries", token, {
    entryType: "deposit",
    amount: 1,
    currency: "GMD",
    savedDate: futureLocalDate,
    destinationType: "cash",
    provider: "CI future date guard",
  });
  assert.equal(futureSavingsDeposit.status, 400);
  await futureSavingsDeposit.body?.cancel();

  const planResponse = await request("POST", "/api/investment-plans", token, {
    name: "CI business-local date plan",
    businessCategory: "Other",
    customCategory: "Local date acceptance",
    businessModel: "offline",
    currency: "GMD",
    initialInvestment: 10,
    additionalCosts: 0,
    expectedRevenue: 20,
    expectedProfit: 10,
  });
  assert.equal(planResponse.status, 201);
  const plan = await planResponse.json() as { id: string };

  const dailyRecord = await request(
    "POST",
    `/api/investment-plans/${plan.id}/daily`,
    token,
    { sales: 2, expenses: 1 },
  );
  assert.equal(dailyRecord.status, 201);
  const savedDailyRecord = await dailyRecord.json() as { recordDate: string };
  assert.equal(savedDailyRecord.recordDate, expectedLocalToday);

  const futureDailyRecord = await request(
    "POST",
    `/api/investment-plans/${plan.id}/daily`,
    token,
    { recordDate: futureLocalDate, sales: 2, expenses: 1 },
  );
  assert.equal(futureDailyRecord.status, 400);
  await futureDailyRecord.body?.cancel();
});
