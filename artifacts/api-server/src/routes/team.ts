import { Router, type IRouter } from "express";
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
import {
  listTeamMembers,
  getTeamMember,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from "../repositories/team-members";
import { recordActivity } from "../repositories/activity-logs";
import { NotFoundError } from "../lib/http-errors";
import type { TeamMember } from "@workspace/db";

const router: IRouter = Router();

function serialize(member: TeamMember) {
  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    role: member.role,
    department: member.department,
    avatarUrl: member.avatarUrl,
    status: member.status,
    lastActiveAt: member.lastActiveAt?.toISOString() ?? null,
    joinedAt: member.joinedAt.toISOString(),
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
      entityName: `${member.firstName} ${member.lastName}`,
      description: `${displayName(req.user!)} invited ${member.firstName} ${member.lastName} to the team`,
      status: "success",
    });
    res.status(201).json(CreateTeamMemberResponse.parse(serialize(member)));
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
    if (!deleted) throw new NotFoundError("Team member not found");
    res.status(204).end();
  },
);

export default router;
