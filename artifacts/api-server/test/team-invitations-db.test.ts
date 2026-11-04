import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { after, test } from "node:test";
import { and, eq } from "drizzle-orm";
import {
  businesses,
  db,
  pool,
  teamInvitations,
  teamMembers,
  users,
} from "@workspace/db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../src/lib/http-errors";
import {
  generateTeamInvitationToken,
  hashTeamInvitationToken,
  teamInvitationExpiresAt,
} from "../src/lib/team-invitations";
import { createBusinessForUser } from "../src/repositories/businesses";
import {
  acceptTeamInvitation,
  createTeamInvitation,
  expirePendingTeamInvitations,
  rotateTeamInvitation,
  revokeTeamInvitation,
} from "../src/repositories/team-invitations";

// Only the backend workflow opts in after applying all migrations to its
// disposable PostgreSQL service. No production or shared staging database is used.
const databaseAcceptanceEnabled =
  process.env.KAIRA_DB_INTEGRATION_TESTS === "true";
const testUserIds: string[] = [];

async function createTestUser(): Promise<{
  id: string;
  phoneNumber: string;
}> {
  const phoneNumber = `87${randomInt(1_000_000, 9_999_999)}`;
  const [user] = await db
    .insert(users)
    .values({
      phoneCountryCode: "+220",
      phoneNumber,
    })
    .returning({ id: users.id });

  testUserIds.push(user.id);
  return { id: user.id, phoneNumber };
}

function businessInput(label: string) {
  return {
    name: `CI Invitation ${label} ${randomInt(100_000, 999_999)}`,
    type: "small_business",
    industry: "retail",
    country: "The Gambia",
    city: "Banjul",
  };
}

function newTokenHash(): string {
  return hashTeamInvitationToken(generateTeamInvitationToken());
}

async function createOwnerBusiness(ownerId: string, label: string) {
  return createBusinessForUser(ownerId, businessInput(label));
}

async function createInvitation(args: {
  businessId: string;
  invitedByUserId: string;
  targetPhoneNumber: string;
  tokenHash?: string;
  expiresAt?: Date;
}) {
  const tokenHash = args.tokenHash ?? newTokenHash();
  const created = await createTeamInvitation({
    businessId: args.businessId,
    invitedByUserId: args.invitedByUserId,
    firstName: "CI",
    lastName: "Invitee",
    email: null,
    phone: `+220 ${args.targetPhoneNumber}`,
    targetPhoneCountryCode: "+220",
    targetPhoneNumber: args.targetPhoneNumber,
    jobTitle: "Cashier",
    department: "Operations",
    accessRole: "staff",
    tokenHash,
    expiresAt: args.expiresAt ?? teamInvitationExpiresAt(),
  });
  return { ...created, tokenHash };
}

after(async () => {
  try {
    // Delete only rows created by this suite in disposable CI PostgreSQL.
    // Business deletion cascades invitation and roster rows.
    for (const userId of testUserIds) {
      await db
        .update(users)
        .set({ businessId: null })
        .where(eq(users.id, userId));
      await db
        .delete(businesses)
        .where(eq(businesses.ownerId, userId));
    }
    for (const userId of testUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
  } finally {
    await pool.end();
  }
});

test("only the invited phone can accept, and successful acceptance is one-time", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const owner = await createTestUser();
  const business = await createOwnerBusiness(owner.id, "phone-match");
  const invitee = await createTestUser();
  const wrongPhoneUser = await createTestUser();
  const invitation = await createInvitation({
    businessId: business.id,
    invitedByUserId: owner.id,
    targetPhoneNumber: invitee.phoneNumber,
  });

  await assert.rejects(
    acceptTeamInvitation(invitation.tokenHash, wrongPhoneUser.id),
    (error: unknown) =>
      error instanceof ForbiddenError &&
      /phone number this invitation was sent to/i.test(error.message),
  );

  const [afterWrongPhoneAttempt] = await db
    .select({ status: teamInvitations.status })
    .from(teamInvitations)
    .where(eq(teamInvitations.id, invitation.invitation.id))
    .limit(1);
  assert.equal(
    afterWrongPhoneAttempt?.status,
    "pending",
    "a wrong-phone attempt must not consume or alter the invitation",
  );

  const accepted = await acceptTeamInvitation(
    invitation.tokenHash,
    invitee.id,
  );
  assert.equal(accepted.member.userId, invitee.id);
  assert.equal(accepted.member.status, "active");
  assert.equal(accepted.member.accessRole, "staff");

  const [storedUser] = await db
    .select({ businessId: users.businessId, role: users.role })
    .from(users)
    .where(eq(users.id, invitee.id))
    .limit(1);
  assert.equal(storedUser?.businessId, business.id);
  assert.equal(storedUser?.role, "staff");

  const [storedInvitation] = await db
    .select({
      status: teamInvitations.status,
      acceptedByUserId: teamInvitations.acceptedByUserId,
    })
    .from(teamInvitations)
    .where(eq(teamInvitations.id, invitation.invitation.id))
    .limit(1);
  assert.equal(storedInvitation?.status, "accepted");
  assert.equal(storedInvitation?.acceptedByUserId, invitee.id);

  await assert.rejects(
    acceptTeamInvitation(invitation.tokenHash, invitee.id),
    (error: unknown) =>
      error instanceof ConflictError &&
      /already been accepted/i.test(error.message),
  );
});

test("expired and revoked invitations cannot be accepted", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const owner = await createTestUser();
  const business = await createOwnerBusiness(owner.id, "expiry-revoke");
  const expiredInvitee = await createTestUser();
  const revokedInvitee = await createTestUser();

  const expiredInvitation = await createInvitation({
    businessId: business.id,
    invitedByUserId: owner.id,
    targetPhoneNumber: expiredInvitee.phoneNumber,
    expiresAt: new Date(Date.now() - 60_000),
  });
  await expirePendingTeamInvitations(business.id);

  const [expiredRow] = await db
    .select({
      status: teamInvitations.status,
      memberStatus: teamMembers.status,
    })
    .from(teamInvitations)
    .innerJoin(
      teamMembers,
      eq(teamMembers.id, teamInvitations.teamMemberId),
    )
    .where(eq(teamInvitations.id, expiredInvitation.invitation.id))
    .limit(1);
  assert.equal(expiredRow?.status, "expired");
  assert.equal(
    expiredRow?.memberStatus,
    "inactive",
    "expiring an invitation must also remove its roster row from pending state",
  );

  await assert.rejects(
    acceptTeamInvitation(expiredInvitation.tokenHash, expiredInvitee.id),
    (error: unknown) =>
      error instanceof ConflictError && /invitation has expired/i.test(error.message),
  );

  const revokedInvitation = await createInvitation({
    businessId: business.id,
    invitedByUserId: owner.id,
    targetPhoneNumber: revokedInvitee.phoneNumber,
  });
  assert.equal(
    await revokeTeamInvitation(business.id, revokedInvitation.invitation.id),
    true,
  );

  const [revokedRow] = await db
    .select({
      status: teamInvitations.status,
      memberStatus: teamMembers.status,
    })
    .from(teamInvitations)
    .innerJoin(
      teamMembers,
      eq(teamMembers.id, teamInvitations.teamMemberId),
    )
    .where(eq(teamInvitations.id, revokedInvitation.invitation.id))
    .limit(1);
  assert.equal(revokedRow?.status, "revoked");
  assert.equal(revokedRow?.memberStatus, "inactive");

  await assert.rejects(
    acceptTeamInvitation(revokedInvitation.tokenHash, revokedInvitee.id),
    (error: unknown) =>
      error instanceof ConflictError && /invitation has been revoked/i.test(error.message),
  );
  assert.equal(
    await revokeTeamInvitation(business.id, revokedInvitation.invitation.id),
    false,
    "a revoked invitation must not be revocable a second time",
  );
});

test("resending rotates the token hash and invalidates the previous link", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const owner = await createTestUser();
  const business = await createOwnerBusiness(owner.id, "token-rotation");
  const invitee = await createTestUser();
  const previousTokenHash = newTokenHash();
  const invitation = await createInvitation({
    businessId: business.id,
    invitedByUserId: owner.id,
    targetPhoneNumber: invitee.phoneNumber,
    tokenHash: previousTokenHash,
  });
  const replacementTokenHash = newTokenHash();
  assert.notEqual(replacementTokenHash, previousTokenHash);

  // Simulate an invitation sent more than the resend cooldown ago without
  // waiting in real time. This timestamp update is CI-fixture-only.
  await db
    .update(teamInvitations)
    .set({ lastSentAt: new Date(Date.now() - 120_000) })
    .where(eq(teamInvitations.id, invitation.invitation.id));

  const rotated = await rotateTeamInvitation(
    business.id,
    invitation.invitation.id,
    replacementTokenHash,
    teamInvitationExpiresAt(),
  );
  assert.equal(rotated.invitation.tokenHash, replacementTokenHash);
  assert.equal(rotated.invitation.status, "pending");

  await assert.rejects(
    acceptTeamInvitation(previousTokenHash, invitee.id),
    (error: unknown) =>
      error instanceof NotFoundError && /invalid/i.test(error.message),
  );

  const accepted = await acceptTeamInvitation(
    replacementTokenHash,
    invitee.id,
  );
  assert.equal(accepted.member.userId, invitee.id);
  assert.equal(accepted.member.status, "active");
});

test("an account already attached to another business cannot accept an invitation", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const invitingOwner = await createTestUser();
  const invitedBusinessOwner = await createTestUser();
  const invitingBusiness = await createOwnerBusiness(
    invitingOwner.id,
    "cross-business-inviter",
  );
  const existingBusiness = await createOwnerBusiness(
    invitedBusinessOwner.id,
    "cross-business-invitee",
  );
  const invitation = await createInvitation({
    businessId: invitingBusiness.id,
    invitedByUserId: invitingOwner.id,
    targetPhoneNumber: invitedBusinessOwner.phoneNumber,
  });

  await assert.rejects(
    acceptTeamInvitation(
      invitation.tokenHash,
      invitedBusinessOwner.id,
    ),
    (error: unknown) =>
      error instanceof ConflictError &&
      /already belongs to another business/i.test(error.message),
  );

  const [unchangedUser] = await db
    .select({ businessId: users.businessId, role: users.role })
    .from(users)
    .where(eq(users.id, invitedBusinessOwner.id))
    .limit(1);
  assert.equal(unchangedUser?.businessId, existingBusiness.id);
  assert.equal(unchangedUser?.role, "owner");

  const [unconsumedInvitation] = await db
    .select({
      status: teamInvitations.status,
      memberStatus: teamMembers.status,
    })
    .from(teamInvitations)
    .innerJoin(
      teamMembers,
      eq(teamMembers.id, teamInvitations.teamMemberId),
    )
    .where(eq(teamInvitations.id, invitation.invitation.id))
    .limit(1);
  assert.equal(unconsumedInvitation?.status, "pending");
  assert.equal(unconsumedInvitation?.memberStatus, "pending");

  const crossBusinessMembership = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(
      eq(teamMembers.businessId, invitingBusiness.id),
      eq(teamMembers.userId, invitedBusinessOwner.id),
    ));
  assert.equal(crossBusinessMembership.length, 0);
});
