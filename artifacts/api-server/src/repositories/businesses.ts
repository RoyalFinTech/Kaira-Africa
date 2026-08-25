import { eq } from "drizzle-orm";
import { db, businesses, users, type Business, type InsertBusiness } from "@workspace/db";
import { ConflictError } from "../lib/http-errors";

export async function getBusinessById(
  businessId: string,
): Promise<Business | undefined> {
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  return business;
}

/**
 * Creates a business during onboarding and assigns the creating user
 * as both owner and member (users.businessId) in one transaction —
 * a user can only belong to one business at a time in this version
 * of the product (see users.ts schema comment), so this is a
 * one-shot "become a business owner" action, not editable to add a
 * second business later.
 */
export async function createBusinessForUser(
  userId: string,
  data: Omit<InsertBusiness, "ownerId">,
): Promise<Business> {
  return db.transaction(async (tx) => {
    const [existingUser] = await tx
      .select({ businessId: users.businessId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser?.businessId) {
      throw new ConflictError("You already belong to a business");
    }

    const [business] = await tx
      .insert(businesses)
      .values({ ...data, ownerId: userId })
      .returning();

    await tx
      .update(users)
      .set({ businessId: business.id, role: "owner" })
      .where(eq(users.id, userId));

    return business;
  });
}

export async function updateBusiness(
  businessId: string,
  patch: Partial<InsertBusiness>,
): Promise<Business | undefined> {
  const [updated] = await db
    .update(businesses)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(businesses.id, businessId))
    .returning();
  return updated;
}
