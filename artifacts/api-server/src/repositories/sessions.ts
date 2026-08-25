import { and, eq, gt, isNull } from "drizzle-orm";
import {
  db,
  userSessions,
  adminSessions,
  type UserSession,
  type AdminSession,
} from "@workspace/db";

export async function createUserSession(entry: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<UserSession> {
  const [row] = await db.insert(userSessions).values(entry).returning();
  return row;
}

export async function findActiveUserSession(
  tokenHash: string,
): Promise<UserSession | undefined> {
  const [row] = await db
    .select()
    .from(userSessions)
    .where(
      and(
        eq(userSessions.tokenHash, tokenHash),
        isNull(userSessions.revokedAt),
        gt(userSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row;
}

export async function revokeUserSession(tokenHash: string): Promise<void> {
  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(eq(userSessions.tokenHash, tokenHash));
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
}

export async function createAdminSession(entry: {
  adminUserId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<AdminSession> {
  const [row] = await db.insert(adminSessions).values(entry).returning();
  return row;
}

export async function findActiveAdminSession(
  tokenHash: string,
): Promise<AdminSession | undefined> {
  const [row] = await db
    .select()
    .from(adminSessions)
    .where(
      and(
        eq(adminSessions.tokenHash, tokenHash),
        isNull(adminSessions.revokedAt),
        gt(adminSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row;
}

export async function revokeAdminSession(tokenHash: string): Promise<void> {
  await db
    .update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(eq(adminSessions.tokenHash, tokenHash));
}

export async function revokeAllAdminSessions(
  adminUserId: string,
): Promise<void> {
  await db
    .update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(adminSessions.adminUserId, adminUserId),
        isNull(adminSessions.revokedAt),
      ),
    );
}
