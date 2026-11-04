import assert from "node:assert/strict";
import { count, eq } from "drizzle-orm";
import { randomInt } from "node:crypto";
import type { Server } from "node:http";
import type Redis from "ioredis";
import { after, test } from "node:test";
import express from "express";
import {
  businesses,
  db,
  pool,
  teamInvitations,
  teamMembers,
  users,
} from "@workspace/db";
import { errorHandler } from "../src/middlewares/error-handler";
import { generateSessionToken, hashToken } from "../src/lib/tokens";
import {
  generateTeamInvitationToken,
  hashTeamInvitationToken,
  teamInvitationExpiresAt,
} from "../src/lib/team-invitations";
import { createUserSession } from "../src/repositories/sessions";
import { createBusinessForUser } from "../src/repositories/businesses";
import { createTeamInvitation } from "../src/repositories/team-invitations";

// Runs only on the Backend CI workflow against its disposable PostgreSQL and
// Redis services after all Drizzle migrations have been applied. No email or
// SMS provider is invoked by these preview/accept/authorization paths.
const databaseAcceptanceEnabled =
  process.env.KAIRA_DB_INTEGRATION_TESTS === "true";
const testUserIds: string[] = [];
let server: Server | null = null;
let baseUrl = "";
let redisClient: Redis | null = null;

function randomPhone(): string {
  return `87${randomInt(1_000_000, 9_999_999)}`;
}

function businessInput(label: string) {
  return {
    name: `CI Invitation HTTP ${label} ${randomInt(100_000, 999_999)}`,
    type: "small_business",
    industry: "retail",
    country: "The Gambia",
    city: "Banjul",
  };
}

async function createTestUser(
  role: "owner" | "manager" | "staff" = "owner",
  businessId?: string,
) {
  const phoneNumber = randomPhone();
  const [user] = await db
    .insert(users)
    .values({
      phoneCountryCode: "+220",
      phoneNumber,
      role,
      ...(businessId ? { businessId } : {}),
    })
    .returning({ id: users.id, role: users.role });
  testUserIds.push(user.id);
  return { ...user, phoneNumber };
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
    role: role === "manager" ? "Manager" : "Staff",
    accessRole: role,
    status: "active",
  });
  return user;
}

async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken("usr");
  await createUserSession({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    userAgent: "kaira-team-invitation-route-ci",
    ipAddress: "127.0.0.1",
  });
  return token;
}

async function startTestServer(): Promise<void> {
  // Import lazily so the non-DB Work Management test workflow, which skips this
  // suite, does not open a Redis connection just by loading the test file.
  const redisModule = await import("../src/lib/redis");
  redisClient = redisModule.redis;
  const teamModule = await import("../src/routes/team");

  const app = express();
  app.use(express.json());
  app.use("/api", teamModule.default);
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

async function postJson(
  path: string,
  body: unknown,
  token?: string,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
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

    if (redisClient) {
      try {
        await redisClient.quit();
      } catch {
        redisClient.disconnect();
      }
      redisClient = null;
    }

    // Delete only rows created by this suite from disposable CI PostgreSQL.
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

test("team invitation preview, phone-verified acceptance and role denial work through HTTP", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const owner = await createTestUser();
  const business = await createBusinessForUser(
    owner.id,
    businessInput("owner"),
  );
  const intendedInvitee = await createTestUser();
  const wrongPhoneUser = await createTestUser();
  const manager = await createTeamRoleUser(business.id, "manager");
  const staff = await createTeamRoleUser(business.id, "staff");

  const rawToken = generateTeamInvitationToken();
  const created = await createTeamInvitation({
    businessId: business.id,
    invitedByUserId: owner.id,
    firstName: "Invited",
    lastName: "Colleague",
    email: null,
    phone: `+220${intendedInvitee.phoneNumber}`,
    targetPhoneCountryCode: "+220",
    targetPhoneNumber: intendedInvitee.phoneNumber,
    jobTitle: "Cashier",
    department: "Operations",
    accessRole: "staff",
    tokenHash: hashTeamInvitationToken(rawToken),
    expiresAt: teamInvitationExpiresAt(),
  });

  const wrongToken = await createSession(wrongPhoneUser.id);
  const inviteeToken = await createSession(intendedInvitee.id);
  const managerToken = await createSession(manager.id);
  const staffToken = await createSession(staff.id);

  await startTestServer();

  const previewResponse = await postJson(
    "/api/team/invitations/preview",
    { token: rawToken },
  );
  assert.equal(previewResponse.status, 200);
  const preview = await previewResponse.json() as {
    status: string;
    firstName: string;
    lastName: string;
    businessName: string;
    jobTitle: string;
    accessRole: string;
    phone: string;
  };
  assert.equal(preview.status, "pending");
  assert.equal(preview.firstName, "Invited");
  assert.equal(preview.lastName, "Colleague");
  assert.equal(preview.businessName, business.name);
  assert.equal(preview.jobTitle, "Cashier");
  assert.equal(preview.accessRole, "staff");
  assert.ok(preview.phone.includes("•••"));
  assert.ok(
    !preview.phone.includes(intendedInvitee.phoneNumber),
    "public invitation preview must not expose the full invited phone number",
  );

  const invalidPreviewResponse = await postJson(
    "/api/team/invitations/preview",
    { token: "invalid-invitation-token" },
  );
  assert.equal(invalidPreviewResponse.status, 400);
  await invalidPreviewResponse.body?.cancel();

  const anonymousAcceptResponse = await postJson(
    "/api/team/invitations/accept",
    { token: rawToken },
  );
  assert.equal(anonymousAcceptResponse.status, 401);
  await anonymousAcceptResponse.body?.cancel();

  const wrongPhoneResponse = await postJson(
    "/api/team/invitations/accept",
    { token: rawToken },
    wrongToken,
  );
  assert.equal(wrongPhoneResponse.status, 403);
  await wrongPhoneResponse.body?.cancel();

  const [stillPending] = await db
    .select({ status: teamInvitations.status })
    .from(teamInvitations)
    .where(eq(teamInvitations.id, created.invitation.id))
    .limit(1);
  assert.equal(
    stillPending?.status,
    "pending",
    "wrong-phone HTTP acceptance must leave the invitation pending",
  );

  const [businessUnassignedInvitee] = await db
    .select({ businessId: users.businessId })
    .from(users)
    .where(eq(users.id, intendedInvitee.id))
    .limit(1);
  assert.equal(businessUnassignedInvitee?.businessId, null);

  const invitationBody = {
    firstName: "Forbidden",
    lastName: "Create",
    phone: "+220 871234567",
    jobTitle: "Assistant",
    accessRole: "staff",
  };
  const managerCreateResponse = await postJson(
    "/api/team/invitations",
    invitationBody,
    managerToken,
  );
  assert.equal(managerCreateResponse.status, 403);
  await managerCreateResponse.body?.cancel();

  const staffCreateResponse = await postJson(
    "/api/team/invitations",
    invitationBody,
    staffToken,
  );
  assert.equal(staffCreateResponse.status, 403);
  await staffCreateResponse.body?.cancel();

  const [beforeAcceptCount] = await db
    .select({ value: count() })
    .from(teamInvitations)
    .where(eq(teamInvitations.businessId, business.id));
  assert.equal(Number(beforeAcceptCount?.value ?? 0), 1);

  const acceptedResponse = await postJson(
    "/api/team/invitations/accept",
    { token: rawToken },
    inviteeToken,
  );
  assert.equal(acceptedResponse.status, 200);
  const accepted = await acceptedResponse.json() as {
    teamMemberId: string;
    businessName: string;
    firstName: string;
    lastName: string;
    accessRole: string;
  };
  assert.equal(accepted.teamMemberId, created.member.id);
  assert.equal(accepted.businessName, business.name);
  assert.equal(accepted.firstName, "Invited");
  assert.equal(accepted.lastName, "Colleague");
  assert.equal(accepted.accessRole, "staff");

  const [acceptedInvitation] = await db
    .select({
      status: teamInvitations.status,
      acceptedByUserId: teamInvitations.acceptedByUserId,
    })
    .from(teamInvitations)
    .where(eq(teamInvitations.id, created.invitation.id))
    .limit(1);
  assert.equal(acceptedInvitation?.status, "accepted");
  assert.equal(acceptedInvitation?.acceptedByUserId, intendedInvitee.id);

  const [acceptedUser] = await db
    .select({ businessId: users.businessId, role: users.role })
    .from(users)
    .where(eq(users.id, intendedInvitee.id))
    .limit(1);
  assert.equal(acceptedUser?.businessId, business.id);
  assert.equal(acceptedUser?.role, "staff");

  const duplicateAcceptResponse = await postJson(
    "/api/team/invitations/accept",
    { token: rawToken },
    inviteeToken,
  );
  assert.equal(duplicateAcceptResponse.status, 409);
  await duplicateAcceptResponse.body?.cancel();
});
