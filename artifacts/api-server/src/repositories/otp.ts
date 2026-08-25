import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, otpVerifications, type OtpVerification } from "@workspace/db";
import { OTP_TTL_MINUTES, MAX_OTP_ATTEMPTS } from "../lib/otp";

export async function getMostRecentOtp(
  phoneCountryCode: string,
  phoneNumber: string,
): Promise<OtpVerification | undefined> {
  const [row] = await db
    .select()
    .from(otpVerifications)
    .where(
      and(
        eq(otpVerifications.phoneCountryCode, phoneCountryCode),
        eq(otpVerifications.phoneNumber, phoneNumber),
      ),
    )
    .orderBy(desc(otpVerifications.createdAt))
    .limit(1);
  return row;
}

export async function createOtp(entry: {
  phoneCountryCode: string;
  phoneNumber: string;
  codeHash: string;
  purpose: "login" | "signup";
}): Promise<OtpVerification> {
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  const [row] = await db
    .insert(otpVerifications)
    .values({ ...entry, expiresAt, maxAttempts: MAX_OTP_ATTEMPTS })
    .returning();
  return row;
}

export async function getActiveOtp(
  phoneCountryCode: string,
  phoneNumber: string,
): Promise<OtpVerification | undefined> {
  const [row] = await db
    .select()
    .from(otpVerifications)
    .where(
      and(
        eq(otpVerifications.phoneCountryCode, phoneCountryCode),
        eq(otpVerifications.phoneNumber, phoneNumber),
        isNull(otpVerifications.consumedAt),
        gt(otpVerifications.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpVerifications.createdAt))
    .limit(1);
  return row;
}

export async function incrementOtpAttempts(
  id: string,
): Promise<OtpVerification | undefined> {
  const [row] = await db
    .update(otpVerifications)
    .set({ attempts: sql`${otpVerifications.attempts} + 1` })
    .where(eq(otpVerifications.id, id))
    .returning();
  return row;
}

export async function consumeOtp(id: string): Promise<void> {
  await db
    .update(otpVerifications)
    .set({ consumedAt: new Date() })
    .where(eq(otpVerifications.id, id));
}
