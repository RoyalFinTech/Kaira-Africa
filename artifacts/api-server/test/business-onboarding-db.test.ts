import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { after, test } from "node:test";
import { count, eq } from "drizzle-orm";
import { businesses, db, pool, teamMembers, users } from "@workspace/db";
import { BadRequestError, ConflictError } from "../src/lib/http-errors";
import { createBusinessForUser } from "../src/repositories/businesses";

// This suite is opt-in and runs only after the CI workflow has applied the
// complete Drizzle migration set to its disposable PostgreSQL service.
// Other CI workflows keep this disabled and continue to run the unit suite.
const databaseAcceptanceEnabled = process.env.KAIRA_DB_INTEGRATION_TESTS === "true";
const testUserIds: string[] = [];

async function createTestUser(): Promise<string> {
  const [user] = await db.insert(users).values({
    phoneCountryCode: "+220",
    phoneNumber: `87${randomInt(1_000_000, 9_999_999)}`,
  }).returning({ id: users.id });

  testUserIds.push(user.id);
  return user.id;
}

function businessInput(label: string) {
  return {
    name: `CI ${label} ${randomInt(100_000, 999_999)}`,
    type: "small_business",
    industry: "retail",
    country: "The Gambia",
    city: "Banjul",
  };
}

after(async () => {
  try {
    // Remove only rows created by this test from the disposable CI database.
    // Clear the user's back-reference before deleting the owner business.
    for (const userId of testUserIds) {
      await db.update(users)
        .set({ businessId: null })
        .where(eq(users.id, userId));
      await db.delete(businesses)
        .where(eq(businesses.ownerId, userId));
      await db.delete(users)
        .where(eq(users.id, userId));
    }
  } finally {
    await pool.end();
  }
});

test("serializes concurrent workspace creation for one user", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const userId = await createTestUser();

  const attempts = await Promise.allSettled(
    Array.from({ length: 8 }, (_, index) =>
      createBusinessForUser(userId, businessInput(`concurrent-${index}`)),
    ),
  );

  const created = attempts.filter((attempt) => attempt.status === "fulfilled");
  const rejected = attempts.filter((attempt) => attempt.status === "rejected");

  assert.equal(created.length, 1, "exactly one concurrent onboarding request must create a workspace");
  assert.equal(rejected.length, 7, "all other onboarding requests must be rejected");
  for (const attempt of rejected) {
    assert.ok(
      attempt.reason instanceof ConflictError,
      "subsequent requests must receive the existing-business conflict",
    );
  }

  const ownedBusinesses = await db.select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.ownerId, userId));
  const [storedUser] = await db.select({ businessId: users.businessId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  assert.equal(ownedBusinesses.length, 1, "the account must not own duplicate workspaces");
  assert.equal(storedUser?.businessId, ownedBusinesses[0]?.id);
});

test("attributes a referred workspace without creating team membership or sharing ownership", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const referrerUserId = await createTestUser();
  const referredUserId = await createTestUser();

  const referrerBusiness = await createBusinessForUser(
    referrerUserId,
    businessInput("referrer"),
  );
  const referredBusiness = await createBusinessForUser(
    referredUserId,
    businessInput("referred"),
    referrerBusiness.referralCode,
  );

  assert.notEqual(referredBusiness.id, referrerBusiness.id);
  assert.notEqual(referredBusiness.ownerId, referrerBusiness.ownerId);
  assert.notEqual(referredBusiness.referralCode, referrerBusiness.referralCode);
  assert.equal(referredBusiness.referredByBusinessId, referrerBusiness.id);

  const [referralCount] = await db.select({ value: count() })
    .from(businesses)
    .where(eq(businesses.referredByBusinessId, referrerBusiness.id));
  assert.equal(Number(referralCount?.value ?? 0), 1);

  const [referredUser] = await db.select({
    businessId: users.businessId,
    role: users.role,
  }).from(users).where(eq(users.id, referredUserId)).limit(1);
  assert.equal(referredUser?.businessId, referredBusiness.id);
  assert.equal(referredUser?.role, "owner");

  const teamMemberships = await db.select({ id: teamMembers.id })
    .from(teamMembers)
    .where(eq(teamMembers.userId, referredUserId));
  assert.equal(teamMemberships.length, 0, "a referral must not create team membership in the referring business");
});

test("rejects an unknown referral code without creating a workspace", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const userId = await createTestUser();

  await assert.rejects(
    createBusinessForUser(
      userId,
      businessInput("unknown-referral"),
      "KAI-0000000000000000",
    ),
    (error: unknown) =>
      error instanceof BadRequestError && /not recognised/i.test(error.message),
  );

  const [storedUser] = await db.select({ businessId: users.businessId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const ownedBusinesses = await db.select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.ownerId, userId));

  assert.equal(storedUser?.businessId, null);
  assert.equal(ownedBusinesses.length, 0, "invalid referral attribution must roll back business creation");
});
