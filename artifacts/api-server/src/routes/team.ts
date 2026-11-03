import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { displayName } from "../lib/display-name";
import {
  ListTeamMembersQueryParams,
  ListTeamMembersResponse,
  CreateTeamMemberBody,
  CreateTeamMemberResponse,
  GetTeamMemberParams,
  GetTeamMemberResponse,
  UpdateTeamMemberParams,
  UpdateTeamMemberBody,
  UpdateTeamMemberResponse,
  DeleteTeamMemberParams,
} from "@workspace/api-zod";
import { requireUser, requireBusiness, requireRole } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { rateLimit, ipKey } from "../middlewares/rate-limit";
import {
  listTeamMembers,
  getTeamMember,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from "../repositories/team-members";
import {
  acceptTeamInvitation,
  createTeamInvitation,
  expirePendingTeamInvitations,
  findTeamInvitationPreview,
  listTeamInvitations,
  revokeTeamInvitation,
  rotateTeamInvitation,
  setTeamInvitationEmailDelivery,
} from "../repositories/team-invitations";
import { getBusinessById } from "../repositories/businesses";
import { recordActivity, recordActivitySafely } from "../repositories/activity-logs";
import { revokeAllUserSessions } from "../repositories/sessions";
import { sendTeamInvitationEmail } from "../services/email.service";
import { logger } from "../lib/logger";
import { normalizeGambianPhone } from "../lib/phone";
import { BadRequestError, NotFoundError } from "../lib/http-errors";
import {
  generateTeamInvitationToken,
  hashTeamInvitationToken,
  isAssignableTeamInvitationRole,
  maskInvitationPhone,
  teamInvitationExpiresAt,
} from "../lib/team-invitations";
import { env, isProd } from "../config/env";
import type { TeamMember } from "@workspace/db";

const router: IRouter = Router();

const invitationTokenSchema = z.string()
  .min(40)
  .max(50)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid invitation token.");

const InvitationBody = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().min(1).max(40),
  jobTitle: z.string().trim().min(2).max(80),
  department: z.string().trim().max(80).optional(),
  accessRole: z.enum(["manager", "staff"]),
}).strict();

const InvitationTokenBody = z.object({ token: invitationTokenSchema }).strict();
const InvitationIdParams = z.object({ id: z.string().uuid() });

function serialize(member: TeamMember) {
  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    role: member.role,
    accessRole: member.accessRole,
    department: member.department,
    avatarUrl: member.avatarUrl,
    status: member.status,
    lastActiveAt: member.lastActiveAt?.toISOString() ?? null,
    joinedAt: member.joinedAt?.toISOString() ?? null,
  };
}

function invitationUrl(token: string): string {
  const baseUrl = env.FRONTEND_URL ?? (isProd
    ? "https://kaira-africa-frontend.onrender.com"
    : env.WEB_BASE_URL);
  return new URL("/invite/" + token, baseUrl).toString();
}

async function sendInvitationEmail(input: {
  businessId: string;
  invitationId: string;
  to?: string | null;
  firstName: string;
  jobTitle: string;
  accessRole: string;
  businessName: string;
  inviterName: string;
  url: string;
}): Promise<"sent" | "not_configured" | "failed"> {
  let delivery: "sent" | "not_configured" | "failed" = "failed";
  const recipient = input.to;
  if (!recipient) {
    await setTeamInvitationEmailDelivery(input.businessId, input.invitationId, "not_configured");
    return "not_configured";
  }
  try {
    const sent = await sendTeamInvitationEmail({
      to: recipient,
      firstName: input.firstName,
      jobTitle: input.jobTitle,
      accessRole: input.accessRole,
      businessName: input.businessName,
      inviterName: input.inviterName,
      inviteUrl: input.url,
      expiresInDays: 7,
    });
    delivery = sent ? "sent" : "not_configured";
  } catch (error) {
    logger.warn({
      businessId: input.businessId,
      invitationId: input.invitationId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }, "Team invitation email delivery failed; manual sharing remains available");
  }
  await setTeamInvitationEmailDelivery(input.businessId, input.invitationId, delivery);
  return delivery;
}

function invitationPayload(row: Awaited<ReturnType<typeof listTeamInvitations>>[number]) {
  const status = row.status === "pending" && row.expiresAt.getTime() <= Date.now()
    ? "expired"
    : row.status;
  return {
    id: row.id,
    status,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    jobTitle: row.jobTitle,
    department: row.department,
    accessRole: row.accessRole,
    expiresAt: row.expiresAt.toISOString(),
    lastSentAt: row.lastSentAt.toISOString(),
    emailDeliveryStatus: row.emailDeliveryStatus,
  };
}

router.get(
  "/team",
  requireUser,
  validate({ query: ListTeamMembersQueryParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const rows = await listTeamMembers(businessId, req.validatedQuery as never);
    res.json(ListTeamMembersResponse.parse(rows.map(serialize)));
  },
);

router.post(
  "/team",
  requireUser,
  requireRole("owner", "admin"),
  validate({ body: CreateTeamMemberBody }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const member = await createTeamMember(businessId, req.body);
    await recordActivity({
      businessId,
      userId: req.user!.id,
      userName: displayName(req.user!),
      action: "invited",
      entityType: "team_member",
      entityId: member.id,
      entityName: req.body.firstName + " " + req.body.lastName,
      description: displayName(req.user!) + " created a team roster entry for " + member.firstName + " " + member.lastName,
      status: "success",
    });
    res.status(201).json(CreateTeamMemberResponse.parse(serialize(member)));
  },
);

// A pending roster entry is not an invitation. These endpoints own delivery,
// token lifecycle, identity verification, and account-to-membership linking.
router.post(
  "/team/invitations",
  requireUser,
  requireRole("owner", "admin"),
  rateLimit({
    scope: "team_invite_create",
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyFn: (req) => req.user?.id ?? ipKey(req),
    message: "Too many invitations have been created. Try again later.",
  }),
  validate({ body: InvitationBody }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const phone = normalizeGambianPhone(req.body.phone);
    if (!isAssignableTeamInvitationRole(req.body.accessRole)) {
      throw new BadRequestError("Choose a supported team access role.");
    }
    const business = await getBusinessById(businessId);
    if (!business || business.status !== "active") {
      throw new NotFoundError("Active business not found");
    }

    const token = generateTeamInvitationToken();
    const expiresAt = teamInvitationExpiresAt();
    const { invitation, member } = await createTeamInvitation({
      businessId,
      invitedByUserId: req.user!.id,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email ?? null,
      phone: phone.countryCode + phone.number,
      targetPhoneCountryCode: phone.countryCode,
      targetPhoneNumber: phone.number,
      jobTitle: req.body.jobTitle,
      department: req.body.department || undefined,
      accessRole: req.body.accessRole,
      tokenHash: hashTeamInvitationToken(token),
      expiresAt,
    });

    const url = invitationUrl(token);
    const emailDeliveryStatus = await sendInvitationEmail({
      businessId,
      invitationId: invitation.id,
      to: member.email,
      firstName: member.firstName,
      jobTitle: member.role,
      accessRole: invitation.accessRole,
      businessName: business.name,
      inviterName: displayName(req.user!),
      url,
    });

    await recordActivitySafely({
      businessId,
      userId: req.user!.id,
      userName: displayName(req.user!),
      action: "invited",
      entityType: "team_member",
      entityId: member.id,
      entityName: member.firstName + " " + member.lastName,
      description: displayName(req.user!) + " invited " + member.firstName + " " + member.lastName + " to join " + business.name,
      status: "success",
    });

    res.status(201).json({
      id: invitation.id,
      inviteUrl: url,
      expiresAt: expiresAt.toISOString(),
      emailDeliveryStatus,
      inviteeFirstName: member.firstName,
      businessName: business.name,
      jobTitle: member.role,
      accessRole: invitation.accessRole,
    });
  },
);

router.get(
  "/team/invitations",
  requireUser,
  requireRole("owner", "admin"),
  async (req, res) => {
    const businessId = requireBusiness(req);
    await expirePendingTeamInvitations(businessId);
    const rows = await listTeamInvitations(businessId);
    res.json(rows.map(invitationPayload));
  },
);

router.post(
  "/team/invitations/preview",
  rateLimit({
    scope: "team_invite_preview_ip",
    windowMs: 15 * 60 * 1000,
    max: 30,
    keyFn: ipKey,
    message: "Too many invitation preview attempts. Try again shortly.",
  }),
  validate({ body: InvitationTokenBody }),
  async (req, res) => {
    const row = await findTeamInvitationPreview(hashTeamInvitationToken(req.body.token));
    if (!row) throw new NotFoundError("This invitation link is invalid.");
    const status = row.invitation.status === "pending" &&
      row.invitation.expiresAt.getTime() <= Date.now()
      ? "expired"
      : row.invitation.status;
    res.json({
      status,
      firstName: row.member.firstName,
      lastName: row.member.lastName,
      businessName: row.businessName,
      jobTitle: row.member.role,
      department: row.member.department,
      accessRole: row.invitation.accessRole,
      phone: maskInvitationPhone(
        row.invitation.targetPhoneCountryCode,
        row.invitation.targetPhoneNumber,
      ),
      expiresAt: row.invitation.expiresAt.toISOString(),
    });
  },
);

router.post(
  "/team/invitations/accept",
  requireUser,
  rateLimit({
    scope: "team_invite_accept_user",
    windowMs: 15 * 60 * 1000,
    max: 8,
    keyFn: (req) => req.user?.id ?? ipKey(req),
    message: "Too many invitation acceptance attempts. Try again later.",
  }),
  validate({ body: InvitationTokenBody }),
  async (req, res) => {
    const result = await acceptTeamInvitation(
      hashTeamInvitationToken(req.body.token),
      req.user!.id,
    );
    await recordActivitySafely({
      businessId: result.member.businessId,
      userId: req.user!.id,
      userName: result.firstName + " " + result.lastName,
      action: "joined",
      entityType: "team_member",
      entityId: result.member.id,
      entityName: result.firstName + " " + result.lastName,
      description: result.firstName + " " + result.lastName + " accepted a team invitation to join " + result.businessName,
      status: "success",
    });
    res.json({
      teamMemberId: result.member.id,
      businessName: result.businessName,
      firstName: result.firstName,
      lastName: result.lastName,
      accessRole: result.member.accessRole,
    });
  },
);

router.post(
  "/team/invitations/:id/resend",
  requireUser,
  requireRole("owner", "admin"),
  rateLimit({
    scope: "team_invite_resend",
    windowMs: 60 * 60 * 1000,
    max: 12,
    keyFn: (req) => req.user?.id ?? ipKey(req),
    message: "Too many invitation resends. Try again later.",
  }),
  validate({ params: InvitationIdParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const token = generateTeamInvitationToken();
    const expiresAt = teamInvitationExpiresAt();
    const rotated = await rotateTeamInvitation(
      businessId,
      req.params.id as string,
      hashTeamInvitationToken(token),
      expiresAt,
    );
    const url = invitationUrl(token);
    const emailDeliveryStatus = await sendInvitationEmail({
      businessId,
      invitationId: rotated.invitation.id,
      to: rotated.member.email,
      firstName: rotated.member.firstName,
      jobTitle: rotated.member.role,
      accessRole: rotated.invitation.accessRole,
      businessName: rotated.businessName,
      inviterName: displayName(req.user!),
      url,
    });
    res.json({
      id: rotated.invitation.id,
      inviteUrl: url,
      expiresAt: expiresAt.toISOString(),
      emailDeliveryStatus,
      inviteeFirstName: rotated.member.firstName,
      businessName: rotated.businessName,
      jobTitle: rotated.member.role,
      accessRole: rotated.invitation.accessRole,
    });
  },
);

router.delete(
  "/team/invitations/:id",
  requireUser,
  requireRole("owner", "admin"),
  validate({ params: InvitationIdParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const revoked = await revokeTeamInvitation(businessId, req.params.id as string);
    if (!revoked) throw new NotFoundError("Pending invitation not found");
    res.status(204).end();
  },
);

router.get(
  "/team/:id",
  requireUser,
  validate({ params: GetTeamMemberParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const member = await getTeamMember(businessId, (req.params.id as string));
    if (!member) throw new NotFoundError("Team member not found");
    res.json(GetTeamMemberResponse.parse(serialize(member)));
  },
);

router.put(
  "/team/:id",
  requireUser,
  requireRole("owner", "admin"),
  validate({ params: UpdateTeamMemberParams, body: UpdateTeamMemberBody }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const member = await updateTeamMember(businessId, (req.params.id as string), req.body);
    if (!member) throw new NotFoundError("Team member not found");
    res.json(UpdateTeamMemberResponse.parse(serialize(member)));
  },
);

router.delete(
  "/team/:id",
  requireUser,
  requireRole("owner", "admin"),
  validate({ params: DeleteTeamMemberParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const deleted = await deleteTeamMember(businessId, (req.params.id as string));
    if (!deleted.deleted) throw new NotFoundError("Team member not found");
    if (deleted.userId) {
      await revokeAllUserSessions(deleted.userId);
    }
    res.status(204).end();
  },
);

export default router;
