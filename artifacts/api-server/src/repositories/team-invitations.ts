import { and, desc, eq, lte, or } from "drizzle-orm";
import {
  db,
  businesses,
  notifications,
  teamInvitations,
  teamMembers,
  users,
  type TeamInvitation,
  type TeamMember,
} from "@workspace/db";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/http-errors";

export interface CreateTeamInvitationInput {
  businessId: string;
  invitedByUserId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  targetPhoneCountryCode: string;
  targetPhoneNumber: string;
  jobTitle: string;
  department?: string;
  accessRole: "manager" | "staff";
  tokenHash: string;
  expiresAt: Date;
}

export async function createTeamInvitation(input: CreateTeamInvitationInput): Promise<{
  invitation: TeamInvitation;
  member: TeamMember;
}> {
  try {
    return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(teamInvitations)
      .where(and(
        eq(teamInvitations.businessId, input.businessId),
        eq(teamInvitations.targetPhoneCountryCode, input.targetPhoneCountryCode),
        eq(teamInvitations.targetPhoneNumber, input.targetPhoneNumber),
        eq(teamInvitations.status, "pending"),
      ))
      .limit(1)
      .for("update");

    if (existing) {
      if (existing.expiresAt.getTime() > Date.now()) {
        throw new ConflictError("A pending invitation already exists for this phone number. Resend it or revoke it first.");
      }
      await tx.update(teamInvitations)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(teamInvitations.id, existing.id));
    }

    const matchingIdentity = input.email
      ? or(eq(teamMembers.phone, input.phone), eq(teamMembers.email, input.email))!
      : eq(teamMembers.phone, input.phone);
    const matchingMembers = await tx.select().from(teamMembers)
      .where(and(eq(teamMembers.businessId, input.businessId), matchingIdentity))
      .for("update");
    if (matchingMembers.length > 1) {
      throw new ConflictError("The supplied phone number and email match different team records. Review the existing roster before creating an invitation.");
    }
    const existingMember = matchingMembers[0];

    let member: TeamMember;
    if (existingMember) {
      if (existingMember.userId || existingMember.status === "active") {
        throw new ConflictError("A team member with this phone number already exists. Update their existing membership instead.");
      }
      const [updatedMember] = await tx.update(teamMembers).set({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        role: input.jobTitle,
        department: input.department ?? null,
        accessRole: input.accessRole,
        status: "pending",
        joinedAt: null,
      }).where(eq(teamMembers.id, existingMember.id)).returning();
      member = updatedMember;
    } else {
      const [createdMember] = await tx.insert(teamMembers).values({
        businessId: input.businessId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        role: input.jobTitle,
        department: input.department ?? null,
        accessRole: input.accessRole,
        status: "pending",
        joinedAt: null,
      }).returning();
      member = createdMember;
    }

    const [previousInvitation] = await tx.select().from(teamInvitations)
      .where(eq(teamInvitations.teamMemberId, member.id))
      .limit(1)
      .for("update");

    let invitation: TeamInvitation;
    if (previousInvitation) {
      const now = new Date();
      const [updatedInvitation] = await tx.update(teamInvitations).set({
        tokenHash: input.tokenHash,
        targetPhoneCountryCode: input.targetPhoneCountryCode,
        targetPhoneNumber: input.targetPhoneNumber,
        accessRole: input.accessRole,
        status: "pending",
        invitedByUserId: input.invitedByUserId,
        acceptedByUserId: null,
        expiresAt: input.expiresAt,
        acceptedAt: null,
        revokedAt: null,
        lastSentAt: now,
        emailDeliveryStatus: "pending",
        updatedAt: now,
      }).where(eq(teamInvitations.id, previousInvitation.id)).returning();
      invitation = updatedInvitation;
    } else {
      const [createdInvitation] = await tx.insert(teamInvitations).values({
        businessId: input.businessId,
        teamMemberId: member.id,
        tokenHash: input.tokenHash,
        targetPhoneCountryCode: input.targetPhoneCountryCode,
        targetPhoneNumber: input.targetPhoneNumber,
        accessRole: input.accessRole,
        status: "pending",
        invitedByUserId: input.invitedByUserId,
        expiresAt: input.expiresAt,
      }).returning();
      invitation = createdInvitation;
    }

    return { invitation, member };
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw new ConflictError("A pending team invitation or roster entry already exists for this phone number or email. Refresh the team list and try again.");
    }
    throw error;
  }
}
export async function expirePendingTeamInvitations(businessId: string): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    const expired = await tx.update(teamInvitations)
      .set({ status: "expired", updatedAt: now })
      .where(and(
        eq(teamInvitations.businessId, businessId),
        eq(teamInvitations.status, "pending"),
        lte(teamInvitations.expiresAt, now),
      ))
      .returning({ teamMemberId: teamInvitations.teamMemberId });

    // Keep expired invitations in invitation history, but do not leave their
    // roster rows looking like active pending invitations.
    for (const invitation of expired) {
      await tx.update(teamMembers)
        .set({ status: "inactive", joinedAt: null })
        .where(and(
          eq(teamMembers.id, invitation.teamMemberId),
          eq(teamMembers.businessId, businessId),
          eq(teamMembers.status, "pending"),
        ));
    }
  });
}

export async function listTeamInvitations(businessId: string) {
  return db.select({
    id: teamInvitations.id,
    status: teamInvitations.status,
    firstName: teamMembers.firstName,
    lastName: teamMembers.lastName,
    email: teamMembers.email,
    phone: teamMembers.phone,
    jobTitle: teamMembers.role,
    department: teamMembers.department,
    accessRole: teamInvitations.accessRole,
    expiresAt: teamInvitations.expiresAt,
    lastSentAt: teamInvitations.lastSentAt,
    acceptedAt: teamInvitations.acceptedAt,
    revokedAt: teamInvitations.revokedAt,
    emailDeliveryStatus: teamInvitations.emailDeliveryStatus,
  }).from(teamInvitations)
    .innerJoin(teamMembers, eq(teamMembers.id, teamInvitations.teamMemberId))
    .where(eq(teamInvitations.businessId, businessId))
    .orderBy(desc(teamInvitations.createdAt));
}

export async function findTeamInvitationPreview(tokenHash: string) {
  const [row] = await db.select({
    invitation: teamInvitations,
    member: teamMembers,
    businessName: businesses.name,
  }).from(teamInvitations)
    .innerJoin(teamMembers, eq(teamMembers.id, teamInvitations.teamMemberId))
    .innerJoin(businesses, eq(businesses.id, teamInvitations.businessId))
    .where(eq(teamInvitations.tokenHash, tokenHash))
    .limit(1);
  return row;
}

export async function setTeamInvitationEmailDelivery(
  businessId: string,
  invitationId: string,
  status: "sent" | "not_configured" | "failed",
): Promise<void> {
  await db.update(teamInvitations)
    .set({ emailDeliveryStatus: status, updatedAt: new Date() })
    .where(and(
      eq(teamInvitations.businessId, businessId),
      eq(teamInvitations.id, invitationId),
    ));
}

export async function rotateTeamInvitation(
  businessId: string,
  invitationId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<{ invitation: TeamInvitation; member: TeamMember; businessName: string }> {
  return db.transaction(async (tx) => {
    const [invitation] = await tx.select().from(teamInvitations)
      .where(and(
        eq(teamInvitations.businessId, businessId),
        eq(teamInvitations.id, invitationId),
      ))
      .limit(1)
      .for("update");
    if (!invitation) throw new NotFoundError("Invitation not found");
    if (invitation.status === "accepted" || invitation.status === "revoked") {
      throw new ConflictError("This invitation can no longer be resent.");
    }
    const now = new Date();
    if (invitation.status === "pending" &&
        invitation.expiresAt.getTime() > now.getTime() &&
        now.getTime() - invitation.lastSentAt.getTime() < 60_000) {
      throw new ConflictError("Please wait one minute before resending this invitation.");
    }

    const [member] = await tx.select().from(teamMembers)
      .where(and(
        eq(teamMembers.id, invitation.teamMemberId),
        eq(teamMembers.businessId, businessId),
      )).limit(1);
    if (!member || (member.status !== "pending" && member.status !== "inactive")) {
      throw new ConflictError("The pending team member record is no longer available.");
    }
    const [business] = await tx.select({ name: businesses.name }).from(businesses)
      .where(eq(businesses.id, businessId)).limit(1);
    if (!business) throw new NotFoundError("Business not found");

    const [updated] = await tx.update(teamInvitations).set({
      tokenHash,
      expiresAt,
      status: "pending",
      lastSentAt: now,
      emailDeliveryStatus: "pending",
      updatedAt: now,
    }).where(eq(teamInvitations.id, invitation.id)).returning();

    const [restoredMember] = member.status === "inactive"
      ? await tx.update(teamMembers).set({
          status: "pending",
          joinedAt: null,
        }).where(eq(teamMembers.id, member.id)).returning()
      : [member];

    return { invitation: updated, member: restoredMember, businessName: business.name };
  });
}

export async function revokeTeamInvitation(businessId: string, invitationId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [updated] = await tx.update(teamInvitations).set({
      status: "revoked",
      revokedAt: now,
      updatedAt: now,
    }).where(and(
      eq(teamInvitations.businessId, businessId),
      eq(teamInvitations.id, invitationId),
      or(eq(teamInvitations.status, "pending"), eq(teamInvitations.status, "expired")),
    )).returning({
      id: teamInvitations.id,
      teamMemberId: teamInvitations.teamMemberId,
    });

    if (!updated) return false;

    // A revoked invitation is not an active pending roster entry. Keep the
    // invitation record for history, but remove the member from pending state.
    await tx.update(teamMembers).set({
      status: "inactive",
      joinedAt: null,
    }).where(and(
      eq(teamMembers.id, updated.teamMemberId),
      eq(teamMembers.businessId, businessId),
      eq(teamMembers.status, "pending"),
    ));

    return true;
  });
}

export async function acceptTeamInvitation(tokenHash: string, userId: string): Promise<{
  member: TeamMember;
  businessName: string;
  firstName: string;
  lastName: string;
}> {
  return db.transaction(async (tx) => {
    const [invitation] = await tx.select().from(teamInvitations)
      .where(eq(teamInvitations.tokenHash, tokenHash))
      .limit(1)
      .for("update");
    if (!invitation) throw new NotFoundError("This invitation link is invalid.");
    if (invitation.status === "accepted") throw new ConflictError("This invitation has already been accepted.");
    if (invitation.status === "revoked") throw new ConflictError("This invitation has been revoked.");
    if (invitation.status === "expired" || invitation.expiresAt.getTime() <= Date.now()) {
      throw new ConflictError("This invitation has expired. Ask the business owner or administrator to resend it.");
    }

    const [user] = await tx.select().from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .for("update");
    if (!user) throw new NotFoundError("Your Kaira Africa account could not be found.");
    if (user.status !== "active") throw new ForbiddenError("This Kaira Africa account is restricted.");
    if (user.phoneCountryCode !== invitation.targetPhoneCountryCode ||
        user.phoneNumber !== invitation.targetPhoneNumber) {
      throw new ForbiddenError("Sign in with the Gambian phone number this invitation was sent to.");
    }

    const [business] = await tx.select().from(businesses)
      .where(eq(businesses.id, invitation.businessId))
      .limit(1)
      .for("update");
    if (!business || business.status !== "active") {
      throw new ConflictError("This business is not currently accepting team members.");
    }
    if (business.ownerId === user.id) {
      throw new ConflictError("The business owner cannot accept a team-member invitation to their own business.");
    }
    if (user.businessId) {
      if (user.businessId !== invitation.businessId) {
        throw new ConflictError("This Kaira Africa account already belongs to another business. Sign in with the account intended for this invitation.");
      }
      throw new ConflictError("This Kaira Africa account already belongs to this business.");
    }

    const [member] = await tx.select().from(teamMembers)
      .where(and(
        eq(teamMembers.id, invitation.teamMemberId),
        eq(teamMembers.businessId, invitation.businessId),
      ))
      .limit(1)
      .for("update");
    if (!member || member.status !== "pending") {
      throw new ConflictError("This team invitation is no longer available.");
    }
    if (member.userId && member.userId !== user.id) {
      throw new ConflictError("This invitation has already been linked to another account.");
    }

    const [existingMembership] = await tx.select({ id: teamMembers.id })
      .from(teamMembers)
      .where(and(
        eq(teamMembers.businessId, invitation.businessId),
        eq(teamMembers.userId, user.id),
      ))
      .limit(1);
    if (existingMembership && existingMembership.id !== member.id) {
      throw new ConflictError("This account is already linked to a team member in this business.");
    }

    const now = new Date();
    const firstName = user.firstName?.trim() ? user.firstName : member.firstName;
    const lastName = user.lastName?.trim() ? user.lastName : member.lastName;

    await tx.update(users).set({
      businessId: invitation.businessId,
      role: invitation.accessRole,
      firstName,
      lastName,
      updatedAt: now,
    }).where(eq(users.id, user.id));

    const [updatedMember] = await tx.update(teamMembers).set({
      userId: user.id,
      status: "active",
      accessRole: invitation.accessRole,
      joinedAt: now,
    }).where(eq(teamMembers.id, member.id)).returning();

    await tx.update(teamInvitations).set({
      status: "accepted",
      acceptedByUserId: user.id,
      acceptedAt: now,
      updatedAt: now,
    }).where(eq(teamInvitations.id, invitation.id));

    if (invitation.invitedByUserId && invitation.invitedByUserId !== user.id) {
      await tx.insert(notifications).values({
        recipientUserId: invitation.invitedByUserId,
        title: "Team invitation accepted",
        message: firstName + " " + lastName + " accepted your invitation to join " + business.name + ".",
        type: "team",
        actionUrl: "/team",
      });
    }

    return { member: updatedMember, businessName: business.name, firstName, lastName };
  });
}
