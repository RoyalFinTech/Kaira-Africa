import { createHmac, randomInt } from "node:crypto";
import { env, isProd } from "../config/env";

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 5;
export const MAX_OTP_ATTEMPTS = 5;
// Minimum time between OTP requests for the same phone number.
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

function getOtpPepper(): string {
  if (env.OTP_SECRET) return env.OTP_SECRET;
  if (isProd) {
    throw new Error("OTP_SECRET is required before OTP verification can run in a hosted/production runtime.");
  }
  return "dev-insecure-otp-pepper";
}

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
  return createHmac("sha256", getOtpPepper()).update(`${phoneKey}:${code}`).digest("hex");
}
