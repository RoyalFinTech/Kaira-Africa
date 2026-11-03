import { randomBytes } from "node:crypto";

const BUSINESS_REFERRAL_CODE_PATTERN = /^KAI-[A-F0-9]{16}$/;

/** Return a high-entropy, human-copyable code owned by one business. */
export function createBusinessReferralCode(): string {
  return `KAI-${randomBytes(8).toString("hex").toUpperCase()}`;
}

/** Normalize a supplied share code without accepting arbitrary URL or path input. */
export function normalizeBusinessReferralCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return BUSINESS_REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null;
}
