import { eq } from "drizzle-orm";
import { db, businesses, users, type Business, type InsertBusiness } from "@workspace/db";
import { BadRequestError, ConflictError } from "../lib/http-errors";
import { createBusinessReferralCode, normalizeBusinessReferralCode } from "../lib/business-referral";

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
  data: Omit<InsertBusiness, "ownerId" | "referralCode" | "referredByBusinessId">,
  referralCodeInput?: string | null,
): Promise<Business> {
  const hasReferralInput = Boolean(referralCodeInput?.trim());
  const normalizedReferralCode = hasReferralInput
    ? normalizeBusinessReferralCode(referralCodeInput)
    : null;
  if (hasReferralInput && !normalizedReferralCode) {
    throw new BadRequestError("The Kaira business referral link is invalid. Remove the referral link to continue without referral attribution.");
  }

  return db.transaction(async (tx) => {
    const [existingUser] = await tx
      .select({ businessId: users.businessId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser?.businessId) {
      throw new ConflictError("You already belong to a business");
    }

    let referredByBusinessId: string | null = null;
    if (normalizedReferralCode) {
      const [referrer] = await tx
        .select({ id: businesses.id, ownerId: businesses.ownerId })
        .from(businesses)
        .where(eq(businesses.referralCode, normalizedReferralCode))
        .limit(1);
      if (!referrer) {
        throw new BadRequestError("This Kaira business referral link is not recognised. Remove the referral link to continue without referral attribution.");
      }
      if (referrer.ownerId === userId) {
        throw new BadRequestError("You cannot use your own business referral link.");
      }
      referredByBusinessId = referrer.id;
    }

    const [business] = await tx
      .insert(businesses)
      .values({
        ...data,
        ownerId: userId,
        referralCode: createBusinessReferralCode(),
        referredByBusinessId,
      })
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
