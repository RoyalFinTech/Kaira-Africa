import { and, desc, eq, ilike, or } from "drizzle-orm";
import {
  db,
  teamMembers,
  type TeamMember,
  type InsertTeamMember,
} from "@workspace/db";

export interface ListTeamMembersFilters {
  search?: string;
  status?: "active" | "inactive" | "pending";
  role?: string;
}

export async function listTeamMembers(
  businessId: string,
  filters: ListTeamMembersFilters,
): Promise<TeamMember[]> {
  const conditions = [eq(teamMembers.businessId, businessId)];

  if (filters.status) {
    conditions.push(eq(teamMembers.status, filters.status));
  }
  if (filters.role) {
    conditions.push(eq(teamMembers.role, filters.role));
  }
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(teamMembers.firstName, pattern),
        ilike(teamMembers.lastName, pattern),
        ilike(teamMembers.email, pattern),
      )!,
    );
  }

  return db
    .select()
    .from(teamMembers)
    .where(and(...conditions))
    .orderBy(desc(teamMembers.invitedAt));
}

export async function getTeamMember(
  businessId: string,
  id: string,
): Promise<TeamMember | undefined> {
  const [row] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.businessId, businessId), eq(teamMembers.id, id)))
    .limit(1);
  return row;
}

export async function createTeamMember(
  businessId: string,
  data: Omit<InsertTeamMember, "businessId">,
): Promise<TeamMember> {
  const [row] = await db
    .insert(teamMembers)
    .values({ ...data, businessId, status: data.status ?? "pending" })
    .returning();
  return row;
}

export async function updateTeamMember(
  businessId: string,
  id: string,
  patch: Partial<Omit<InsertTeamMember, "businessId">>,
): Promise<TeamMember | undefined> {
  const [row] = await db
    .update(teamMembers)
    .set(patch)
    .where(and(eq(teamMembers.businessId, businessId), eq(teamMembers.id, id)))
    .returning();
  return row;
}

export async function deleteTeamMember(
  businessId: string,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.businessId, businessId), eq(teamMembers.id, id)))
    .returning({ id: teamMembers.id });
  return deleted.length > 0;
}
