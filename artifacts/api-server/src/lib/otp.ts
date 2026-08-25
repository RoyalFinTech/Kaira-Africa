import { createHmac, randomInt } from "node:crypto";
import { env } from "../config/env";

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 5;
export const MAX_OTP_ATTEMPTS = 5;
// Minimum time between OTP requests for the same phone number.
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

// In production, env.ts refuses to boot without OTP_SECRET, so this
// fallback only ever runs in development/test.
const OTP_PEPPER = env.OTP_SECRET ?? "dev-insecure-otp-pepper";

export function generateOtp(): string {
  // randomInt is cryptographically secure (unlike Math.random).
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(randomInt(min, max + 1));
}

/**
 * A 6-digit code only has 1,000,000 possibilities — an unpeppered hash
 * of it is trivially brute-forceable if otp_verifications ever leaks
 * (rainbow-table it once, done). HMAC with a server-only secret makes
 * that infeasible without also compromising OTP_SECRET.
 */
export function hashOtp(code: string, phoneKey: string): string {
  return createHmac("sha256", OTP_PEPPER).update(`${phoneKey}:${code}`).digest("hex");
}
