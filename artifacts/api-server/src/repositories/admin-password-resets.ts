import { and, eq, gt, isNull } from "drizzle-orm";
import {
  db,
  adminPasswordResets,
  type AdminPasswordReset,
} from "@workspace/db";

const RESET_TTL_MINUTES = 30;

export async function createPasswordReset(
  adminUserId: string,
  tokenHash: string,
): Promise<AdminPasswordReset> {
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
  const [row] = await db
    .insert(adminPasswordResets)
    .values({ adminUserId, tokenHash, expiresAt })
    .returning();
  return row;
}

export async function getActivePasswordReset(
  tokenHash: string,
): Promise<AdminPasswordReset | undefined> {
  const [row] = await db
    .select()
    .from(adminPasswordResets)
    .where(
      and(
        eq(adminPasswordResets.tokenHash, tokenHash),
        isNull(adminPasswordResets.consumedAt),
        gt(adminPasswordResets.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row;
}

export async function consumePasswordReset(id: string): Promise<void> {
  await db
    .update(adminPasswordResets)
    .set({ consumedAt: new Date() })
    .where(eq(adminPasswordResets.id, id));
}
