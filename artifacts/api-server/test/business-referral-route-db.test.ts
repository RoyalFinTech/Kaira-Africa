import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { randomInt } from "node:crypto";
import type { Server } from "node:http";
import { after, test } from "node:test";
import express from "express";
import {
  businesses,
  db,
  pool,
  teamMembers,
  users,
} from "@workspace/db";
import businessRouter from "../src/routes/businesses";
import { errorHandler } from "../src/middlewares/error-handler";
import { generateSessionToken, hashToken } from "../src/lib/tokens";
import { createUserSession } from "../src/repositories/sessions";
import { createBusinessForUser } from "../src/repositories/businesses";

// The live route is exercised only on the Backend CI workflow's disposable
// PostgreSQL service after the full migration set has been applied.
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
    name: `CI Referral API ${label} ${randomInt(100_000, 999_999)}`,
    type: "small_business",
    industry: "retail",
    country: "The Gambia",
    city: "Banjul",
  };
}

async function createTestUser(
  role: "owner" | "admin" | "manager" | "staff" = "owner",
  businessId?: string,
) {
  const phone = phoneNumber();
  const [user] = await db
    .insert(users)
    .values({
      phoneCountryCode: "+220",
      phoneNumber: phone,
      role,
      ...(businessId ? { businessId } : {}),
    })
    .returning({ id: users.id, role: users.role });
  testUserIds.push(user.id);
  return { ...user, phoneNumber: phone };
}

async function createTeamRoleUser(
  businessId: string,
  role: "manager" | "staff",
) {
  const user = await createTestUser(role, businessId);
  await db.insert(teamMembers).values({
    businessId,
    userId: user.id,
    firstName: "CI",
    lastName: role,
    email: null,
    phone: `+220${user.phoneNumber}`,
    role,
    accessRole: role,
    status: "active",
  });
  return user;
}

async function createSession(userId: string): Promise<string> {
  const rawToken = generateSessionToken("usr");
  await createUserSession({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    userAgent: "kaira-referral-route-ci",
    ipAddress: "127.0.0.1",
  });
  return rawToken;
}

async function startTestServer(): Promise<void> {
  const app = express();
  app.use("/api", businessRouter);
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

async function getReferral(token?: string): Promise<Response> {
  return fetch(`${baseUrl}/api/businesses/me/referral`, {
    method: "GET",
    headers: token
      ? { Authorization: `Bearer ${token}`, Accept: "application/json" }
      : { Accept: "application/json" },
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

    // Delete only this suite's fixtures from the disposable CI database.
    for (const userId of testUserIds) {
      await db.update(users)
        .set({ businessId: null })
        .where(eq(users.id, userId));
    }
    for (const userId of testUserIds) {
      await db.delete(businesses)
        .where(eq(businesses.ownerId, userId));
    }
    for (const userId of testUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
  } finally {
    await pool.end();
  }
});

test("referral endpoint enforces anonymous, invalid-session, role and owner access", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const ownerA = await createTestUser();
  const ownerBusinessA = await createBusinessForUser(
    ownerA.id,
    businessInput("owner-a"),
  );
  const ownerB = await createTestUser();
  const ownerBusinessB = await createBusinessForUser(
    ownerB.id,
    businessInput("owner-b"),
  );

  const manager = await createTeamRoleUser(ownerBusinessA.id, "manager");
  const staff = await createTeamRoleUser(ownerBusinessA.id, "staff");
  const unassignedOwner = await createTestUser();

  const ownerAToken = await createSession(ownerA.id);
  const ownerBToken = await createSession(ownerB.id);
  const managerToken = await createSession(manager.id);
  const staffToken = await createSession(staff.id);
  const unassignedToken = await createSession(unassignedOwner.id);

  await startTestServer();

  const anonymousResponse = await getReferral();
  assert.equal(anonymousResponse.status, 401);
  await anonymousResponse.body?.cancel();

  const invalidSessionResponse = await getReferral("usr_invalid-session-for-ci");
  assert.equal(invalidSessionResponse.status, 401);
  await invalidSessionResponse.body?.cancel();

  const managerResponse = await getReferral(managerToken);
  assert.equal(managerResponse.status, 403);
  await managerResponse.body?.cancel();

  const staffResponse = await getReferral(staffToken);
  assert.equal(staffResponse.status, 403);
  await staffResponse.body?.cancel();

  const unassignedResponse = await getReferral(unassignedToken);
  assert.equal(
    unassignedResponse.status,
    401,
    "an owner without an active business must not receive a referral summary",
  );
  await unassignedResponse.body?.cancel();

  const ownerAResponse = await getReferral(ownerAToken);
  assert.equal(ownerAResponse.status, 200);
  const ownerASummary = await ownerAResponse.json() as {
    businessName: string;
    referralCode: string;
    referredBusinessCount: number;
  };
  assert.equal(ownerASummary.businessName, ownerBusinessA.name);
  assert.equal(ownerASummary.referralCode, ownerBusinessA.referralCode);
  assert.match(ownerASummary.referralCode, /^KAI-[A-F0-9]{16}$/);
  assert.equal(ownerASummary.referredBusinessCount, 0);

  const ownerBResponse = await getReferral(ownerBToken);
  assert.equal(ownerBResponse.status, 200);
  const ownerBSummary = await ownerBResponse.json() as {
    businessName: string;
    referralCode: string;
    referredBusinessCount: number;
  };
  assert.equal(ownerBSummary.businessName, ownerBusinessB.name);
  assert.equal(ownerBSummary.referralCode, ownerBusinessB.referralCode);
  assert.notEqual(
    ownerASummary.referralCode,
    ownerBSummary.referralCode,
    "each owner must receive only their own business's distinct referral code",
  );
});
