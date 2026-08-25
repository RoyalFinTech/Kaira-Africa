import { and, eq } from "drizzle-orm";
import { db, users, type User } from "@workspace/db";

export async function getUserById(id: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

export async function getUserByPhone(
  phoneCountryCode: string,
  phoneNumber: string,
): Promise<User | undefined> {
  const [row] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.phoneCountryCode, phoneCountryCode),
        eq(users.phoneNumber, phoneNumber),
      ),
    )
    .limit(1);
  return row;
}

/**
 * Finds an existing user by phone, or creates a brand-new one with no
 * name yet (they haven't reached the Full Name screen). Returns the
 * user plus whether it was newly created, so the caller can route the
 * client to the right next step.
 */
export async function findOrCreateUserByPhone(
  phoneCountryCode: string,
  phoneNumber: string,
): Promise<{ user: User; isNewUser: boolean }> {
  const existing = await getUserByPhone(phoneCountryCode, phoneNumber);
  if (existing) return { user: existing, isNewUser: false };

  const [created] = await db
    .insert(users)
    .values({
      phoneCountryCode,
      phoneNumber,
      role: "owner",
      status: "active",
    })
    .returning();
  return { user: created, isNewUser: true };
}

export async function touchLastLogin(id: string): Promise<void> {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
}

export async function updateUserProfile(
  id: string,
  patch: {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  },
): Promise<User | undefined> {
  // Note: `phone` is intentionally not patchable here even though it
  // appears on UserProfileInput in the OpenAPI contract — changing the
  // phone number that authenticates this account should require
  // re-verifying it via OTP (Phase 3), not a plain profile PATCH.
  const [row] = await db
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return row;
}
