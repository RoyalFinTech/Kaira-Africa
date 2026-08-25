import { eq, sql } from "drizzle-orm";
import { db, adminUsers, type AdminUser } from "@workspace/db";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function getAdminByEmail(
  email: string,
): Promise<AdminUser | undefined> {
  const [row] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email.toLowerCase()))
    .limit(1);
  return row;
}

export async function getAdminById(
  id: string,
): Promise<AdminUser | undefined> {
  const [row] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);
  return row;
}

export async function createAdminUser(entry: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: AdminUser["role"];
}): Promise<AdminUser> {
  const [row] = await db
    .insert(adminUsers)
    .values({ ...entry, email: entry.email.toLowerCase() })
    .returning();
  return row;
}

export async function recordFailedLogin(id: string): Promise<AdminUser> {
  const [row] = await db
    .update(adminUsers)
    .set({
      failedLoginAttempts: sql`${adminUsers.failedLoginAttempts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, id))
    .returning();

  if (row.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    const [locked] = await db
      .update(adminUsers)
      .set({ lockedUntil })
      .where(eq(adminUsers.id, id))
      .returning();
    return locked;
  }
  return row;
}

export async function resetFailedLogins(id: string): Promise<void> {
  await db
    .update(adminUsers)
    .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(adminUsers.id, id));
}

export async function updateAdminPassword(
  id: string,
  passwordHash: string,
): Promise<void> {
  await db
    .update(adminUsers)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(adminUsers.id, id));
}

export function isLocked(admin: AdminUser): boolean {
  return !!admin.lockedUntil && admin.lockedUntil.getTime() > Date.now();
}
