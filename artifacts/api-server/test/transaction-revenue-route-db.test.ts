import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import type { Server } from "node:http";
import { after, test } from "node:test";
import express from "express";
import { eq } from "drizzle-orm";
import { businesses, db, pool, users } from "@workspace/db";
import businessesRouter from "../src/routes/businesses";
import transactionsRouter from "../src/routes/transactions";
import analyticsRouter from "../src/routes/analytics";
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
    userAgent: "kaira-transaction-revenue-ci",
    ipAddress: "127.0.0.1",
  });
  return token;
}

async function startTestServer(): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use("/api", businessesRouter);
  app.use("/api", transactionsRouter);
  app.use("/api", analyticsRouter);
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
  method: "GET" | "POST",
  path: string,
  token: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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

test("confirmed payment transactions contribute to dashboard revenue while pending and non-payment records do not", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const owner = await createTestUser();
  await createBusinessForUser(owner.id, {
    name: `CI transaction revenue ${randomInt(100_000, 999_999)}`,
    type: "small_business",
    industry: "retail",
    country: "The Gambia",
    city: "Banjul",
  });
  const token = await createSession(owner.id);
  await startTestServer();

  const completedPaymentResponse = await request("POST", "/api/transactions", token, {
    amount: 125,
    currency: "GMD",
    type: "payment",
    status: "completed",
    description: "CI confirmed sale",
  });
  assert.equal(completedPaymentResponse.status, 201);
  const completedPayment = await completedPaymentResponse.json() as {
    status: string;
    completedAt: string | null;
  };
  assert.equal(completedPayment.status, "completed");
  assert.ok(completedPayment.completedAt);

  const pendingPaymentResponse = await request("POST", "/api/transactions", token, {
    amount: 60,
    currency: "GMD",
    type: "payment",
    description: "CI awaiting confirmation",
  });
  assert.equal(pendingPaymentResponse.status, 201);
  const pendingPayment = await pendingPaymentResponse.json() as {
    status: string;
    completedAt: string | null;
  };
  assert.equal(pendingPayment.status, "pending");
  assert.equal(pendingPayment.completedAt, null);

  const completedDepositResponse = await request("POST", "/api/transactions", token, {
    amount: 80,
    currency: "GMD",
    type: "deposit",
    status: "completed",
    description: "CI non-revenue deposit",
  });
  assert.equal(completedDepositResponse.status, 201);

  const revenueResponse = await request("GET", "/api/analytics/revenue?period=month", token);
  assert.equal(revenueResponse.status, 200);
  const revenue = await revenueResponse.json() as { total: number };
  assert.equal(revenue.total, 125);

  const dashboardStatsResponse = await request("GET", "/api/businesses/me/stats", token);
  assert.equal(dashboardStatsResponse.status, 200);
  const dashboardStats = await dashboardStatsResponse.json() as {
    totalRevenue: number;
    totalTransactions: number;
  };
  assert.equal(dashboardStats.totalRevenue, 125);
  assert.equal(dashboardStats.totalTransactions, 3);
});
