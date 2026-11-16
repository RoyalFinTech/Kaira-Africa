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
  savingsGoals,
  savingsEntries,
  investmentPlans,
  investmentDailyRecords,
} from "@workspace/db";
import savingsRouter from "../src/routes/savings";
import investmentsRouter from "../src/routes/investments";
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
    name: `CI finance route ${label} ${randomInt(100_000, 999_999)}`,
    type: "small_business",
    industry: "retail",
    country: "The Gambia",
    city: "Banjul",
  };
}

async function createTestUser(businessId?: string) {
  const [user] = await db.insert(users).values({
    phoneCountryCode: "+220",
    phoneNumber: phoneNumber(),
    role: "owner",
    ...(businessId ? { businessId } : {}),
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
    userAgent: "kaira-finance-route-ci",
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

test("Savings and investment routes enforce business scope and preserve complete financial totals", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const owner = await createTestUser();
  const business = await createBusinessForUser(owner.id, businessInput("primary"));
  const outsiderOwner = await createTestUser();
  const outsiderBusiness = await createBusinessForUser(
    outsiderOwner.id,
    businessInput("outsider"),
  );
  const token = await createSession(owner.id);
  const outsiderToken = await createSession(outsiderOwner.id);
  await startTestServer();

  const unauthenticated = await request("GET", "/api/savings/overview");
  assert.equal(unauthenticated.status, 401);
  await unauthenticated.body?.cancel();

  const goalResponse = await request("POST", "/api/savings/goals", token, {
    name: "Emergency reserve",
    currency: "GMD",
    targetAmount: 1000,
    savingFrequency: "weekly",
  });
  assert.equal(goalResponse.status, 201);
  const goal = await goalResponse.json() as { id: string; currency: string; savedAmount: number };
  assert.equal(goal.currency, "GMD");
  assert.equal(goal.savedAmount, 0);

  const depositResponse = await request("POST", "/api/savings/entries", token, {
    goalId: goal.id,
    entryType: "deposit",
    amount: 100,
    currency: "GMD",
    destinationType: "cash",
    provider: "CI cash deposit",
  });
  assert.equal(depositResponse.status, 201);

  const overdrawResponse = await request("POST", "/api/savings/entries", token, {
    goalId: goal.id,
    entryType: "withdrawal",
    amount: 100.01,
    currency: "GMD",
    destinationType: "cash",
    provider: "CI overdraw attempt",
  });
  assert.equal(overdrawResponse.status, 400);
  await overdrawResponse.body?.cancel();

  const wrongCurrencyResponse = await request("POST", "/api/savings/entries", token, {
    goalId: goal.id,
    entryType: "deposit",
    amount: 10,
    currency: "NGN",
    destinationType: "cash",
    provider: "CI currency mismatch",
  });
  assert.equal(wrongCurrencyResponse.status, 400);
  await wrongCurrencyResponse.body?.cancel();

  const foreignGoal = await db.insert(savingsGoals).values({
    businessId: outsiderBusiness.id,
    createdBy: outsiderOwner.id,
    name: "Outsider goal",
    currency: "GMD",
    targetMinor: 100_000,
  }).returning({ id: savingsGoals.id });
  const crossBusinessStatus = await request(
    "PATCH",
    `/api/savings/goals/${foreignGoal[0].id}/status`,
    token,
    { status: "paused" },
  );
  assert.equal(crossBusinessStatus.status, 404);
  await crossBusinessStatus.body?.cancel();

  // More than the 500-row activity window: the overview must still aggregate
  // the full ledger, while returning only the newest 500 activity rows.
  await db.insert(savingsEntries).values(Array.from({ length: 505 }, (_, index) => ({
    businessId: business.id,
    goalId: null,
    createdBy: owner.id,
    entryType: "deposit",
    amountMinor: 100,
    currency: "GMD",
    savedDate: "2026-01-01",
    destinationType: "cash",
    provider: `CI history ${index}`,
  })));
  const overviewResponse = await request("GET", "/api/savings/overview", token);
  assert.equal(overviewResponse.status, 200);
  const overview = await overviewResponse.json() as {
    goals: Array<{ id: string; savedAmount: number }>;
    entries: unknown[];
    totals: Array<{ currency: string; deposits: number; withdrawals: number; balance: number }>;
  };
  assert.equal(overview.entries.length, 500);
  assert.equal(overview.goals.find((item) => item.id === goal.id)?.savedAmount, 100);
  const gmdTotals = overview.totals.find((item) => item.currency === "GMD");
  assert.equal(gmdTotals?.deposits, 105.05);
  assert.equal(gmdTotals?.withdrawals, 0);
  assert.equal(gmdTotals?.balance, 105.05);

  const planResponse = await request("POST", "/api/investment-plans", token, {
    name: "CI vegetable stall",
    businessCategory: "Other",
    customCategory: "Vegetable stall",
    businessModel: "offline",
    currency: "NGN",
    initialInvestment: 5000,
    additionalCosts: 500,
    expectedRevenue: 10000,
    expectedProfit: 2500,
  });
  assert.equal(planResponse.status, 201);
  const plan = await planResponse.json() as { id: string; currency: string };
  assert.equal(plan.currency, "NGN");

  const dailyResponse = await request(
    "POST",
    `/api/investment-plans/${plan.id}/daily`,
    token,
    { recordDate: "2026-01-01", sales: 150, expenses: 40, notes: "Opening day" },
  );
  assert.equal(dailyResponse.status, 201);
  const daily = await dailyResponse.json() as { sales: number; expenses: number };
  assert.equal(daily.sales, 150);
  assert.equal(daily.expenses, 40);

  const otherBusinessPlan = await db.insert(investmentPlans).values({
    businessId: outsiderBusiness.id,
    createdBy: outsiderOwner.id,
    name: "Outsider plan",
    businessCategory: "Retail shop / mini-market",
    businessModel: "offline",
    currency: "GMD",
    initialInvestmentMinor: 100_000,
    additionalCostsMinor: 0,
    expectedRevenueMinor: 200_000,
    expectedProfitMinor: 50_000,
  }).returning({ id: investmentPlans.id });
  const crossBusinessDaily = await request(
    "GET",
    `/api/investment-plans/${otherBusinessPlan[0].id}/daily`,
    token,
  );
  assert.equal(crossBusinessDaily.status, 404);
  await crossBusinessDaily.body?.cancel();

  // More than the 200-row daily history window: plan totals must include all
  // records even though the daily endpoint intentionally returns only 200.
  await db.insert(investmentDailyRecords).values(Array.from({ length: 205 }, (_, index) => ({
    planId: plan.id,
    businessId: business.id,
    createdBy: owner.id,
    recordDate: "2026-01-02",
    salesMinor: 100,
    expensesMinor: 25,
    notes: `CI daily history ${index}`,
  })));
  const planListResponse = await request("GET", "/api/investment-plans", token);
  assert.equal(planListResponse.status, 200);
  const planList = await planListResponse.json() as {
    plans: Array<{ id: string; actualSales: number; actualExpenses: number; actualNet: number; daysRecorded: number }>;
  };
  const planSummary = planList.plans.find((item) => item.id === plan.id);
  assert.equal(planSummary?.actualSales, 355);
  assert.equal(planSummary?.actualExpenses, 91.25);
  assert.equal(planSummary?.actualNet, 263.75);
  assert.equal(planSummary?.daysRecorded, 206);

  const dailyHistoryResponse = await request(
    "GET",
    `/api/investment-plans/${plan.id}/daily`,
    token,
  );
  assert.equal(dailyHistoryResponse.status, 200);
  const dailyHistory = await dailyHistoryResponse.json() as { records: unknown[] };
  assert.equal(dailyHistory.records.length, 200);

  const outsiderOverview = await request("GET", "/api/savings/overview", outsiderToken);
  assert.equal(outsiderOverview.status, 200);
  const outsiderData = await outsiderOverview.json() as {
    goals: Array<{ id: string }>;
    entries: unknown[];
  };
  assert.ok(!outsiderData.goals.some((item) => item.id === goal.id));
  assert.equal(outsiderData.entries.length, 0);
});
