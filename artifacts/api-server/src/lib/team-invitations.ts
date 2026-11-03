import { createHash, randomBytes } from "node:crypto";

export const TEAM_INVITATION_TTL_DAYS = 7;
export const TEAM_INVITATION_TTL_MS = TEAM_INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000;

export type TeamInvitationAccessRole = "manager" | "staff";

export function generateTeamInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashTeamInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function teamInvitationExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + TEAM_INVITATION_TTL_MS);
}

export function isAssignableTeamInvitationRole(value: string): value is TeamInvitationAccessRole {
  return value === "manager" || value === "staff";
}

export function maskInvitationPhone(countryCode: string, number: string): string {
  const prefix = number.slice(0, 2);
  return countryCode + " " + prefix + " ••• •••";
}
