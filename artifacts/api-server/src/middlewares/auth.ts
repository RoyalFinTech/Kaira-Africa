import type { NextFunction, Request, Response } from "express";
import { hashToken, tokenKind } from "../lib/tokens";
import { findActiveUserSession, findActiveAdminSession } from "../repositories/sessions";
import { getUserById } from "../repositories/users";
import { getAdminById } from "../repositories/admin-users";
import { UnauthorizedError, ForbiddenError } from "../lib/http-errors";

export interface AuthedUser {
  id: string;
  businessId: string | null;
  role: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export interface AuthedAdmin {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
      admin?: AuthedAdmin;
      /** Raw bearer token's hash, for logout/logout-all to revoke the exact session presented. */
      sessionTokenHash?: string;
    }
  }
}

function extractBearerToken(req: Request): string {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }
  const rawToken = header.slice("Bearer ".length).trim();
  if (!rawToken) {
    throw new UnauthorizedError("Missing bearer token");
  }
  return rawToken;
}

/**
 * Resolves the current business user from a "usr_"-prefixed session
 * token against `user_sessions`. Genuinely wired to real server-side
 * session data — never trusts anything the client asserts about
 * itself (e.g. a business_id in the request body).
 */
export async function requireUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawToken = extractBearerToken(req);
    if (tokenKind(rawToken) !== "usr") {
      throw new UnauthorizedError("This endpoint requires a user session token");
    }
    const tokenHash = hashToken(rawToken);
    const session = await findActiveUserSession(tokenHash);
    if (!session) throw new UnauthorizedError("Session is invalid or has expired");

    const user = await getUserById(session.userId);
    if (!user) throw new UnauthorizedError("Session user no longer exists");

    req.user = {
      id: user.id,
      businessId: user.businessId,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
    req.sessionTokenHash = tokenHash;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Resolves the current admin from an "adm_"-prefixed session token
 * against `admin_sessions` — a completely separate table/flow from
 * user auth, per the Kaira Africa security requirements.
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawToken = extractBearerToken(req);
    if (tokenKind(rawToken) !== "adm") {
      throw new UnauthorizedError("This endpoint requires an admin session token");
    }
    const tokenHash = hashToken(rawToken);
    const session = await findActiveAdminSession(tokenHash);
    if (!session) throw new UnauthorizedError("Session is invalid or has expired");

    const admin = await getAdminById(session.adminUserId);
    if (!admin) throw new UnauthorizedError("Session admin no longer exists");
    if (admin.status !== "active") {
      throw new ForbiddenError("This administrator account is restricted");
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      firstName: admin.firstName,
      lastName: admin.lastName,
    };
    req.sessionTokenHash = tokenHash;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * For endpoints shared by both auth surfaces (logout, logout-all):
 * resolves whichever session type the presented token belongs to.
 */
export async function requireAnySession(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawToken = extractBearerToken(req);
    const kind = tokenKind(rawToken);
    const tokenHash = hashToken(rawToken);

    if (kind === "usr") {
      const session = await findActiveUserSession(tokenHash);
      if (!session) throw new UnauthorizedError("Session is invalid or has expired");
      const user = await getUserById(session.userId);
      if (!user) throw new UnauthorizedError("Session user no longer exists");
      req.user = {
        id: user.id,
        businessId: user.businessId,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      };
    } else if (kind === "adm") {
      const session = await findActiveAdminSession(tokenHash);
      if (!session) throw new UnauthorizedError("Session is invalid or has expired");
      const admin = await getAdminById(session.adminUserId);
      if (!admin) throw new UnauthorizedError("Session admin no longer exists");
      req.admin = {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        firstName: admin.firstName,
        lastName: admin.lastName,
      };
    } else {
      throw new UnauthorizedError("Unrecognized token");
    }

    req.sessionTokenHash = tokenHash;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Guards routes that require the current user to already belong to a
 * business (i.e. have completed business onboarding).
 */
export function requireBusiness(req: Request): string {
  if (!req.user?.businessId) {
    throw new UnauthorizedError(
      "This action requires an active business — complete business onboarding first",
    );
  }
  return req.user.businessId;
}

/** Alias kept for call sites that want the "business isolation" framing explicitly. */
export const requireBusinessAccess = requireBusiness;

/**
 * RBAC gate for business-user routes. Must run after requireUser.
 * Example: requireRole("owner", "admin") on team member creation.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(
        new ForbiddenError(
          `This action requires one of the following roles: ${roles.join(", ")}`,
        ),
      );
      return;
    }
    next();
  };
}

/** RBAC gate for admin-portal routes (uses admin_role, a separate enum). */
export function requireAdminRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.admin) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.admin.role)) {
      next(
        new ForbiddenError(
          `This action requires one of the following admin roles: ${roles.join(", ")}`,
        ),
      );
      return;
    }
    next();
  };
}
