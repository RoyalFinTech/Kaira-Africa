import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/env";

export type SessionKind = "usr" | "adm";

// In production, env.ts refuses to boot without SESSION_SECRET, so
// this fallback only ever runs in development/test.
const SESSION_PEPPER = env.SESSION_SECRET ?? "dev-insecure-session-pepper";

/**
 * Opaque bearer tokens are prefixed by session type ("usr_"/"adm_") so
 * requireUser/requireAdmin can route to the correct sessions table
 * without an extra lookup, and so a token can never be ambiguous
 * between the two entirely separate auth surfaces.
 */
export function generateSessionToken(kind: SessionKind): string {
  return `${kind}_${randomBytes(32).toString("hex")}`;
}

/**
 * These tokens already carry 256 bits of random entropy, so a leaked
 * hash table isn't brute-forceable regardless — HMAC-peppering with
 * SESSION_SECRET is defense-in-depth (e.g. against a hypothetical
 * hash-algorithm weakness) rather than the primary protection here.
 */
export function hashToken(rawToken: string): string {
  return createHmac("sha256", SESSION_PEPPER).update(rawToken).digest("hex");
}

const RESET_PEPPER = env.PASSWORD_RESET_SECRET ?? "dev-insecure-reset-pepper";

/** Separate from hashToken/SESSION_PEPPER — password reset tokens are
 * a distinct secret class from session tokens, peppered independently
 * so rotating one never affects the other. */
export function hashResetToken(rawToken: string): string {
  return createHmac("sha256", RESET_PEPPER).update(rawToken).digest("hex");
}

export function tokenKind(rawToken: string): SessionKind | null {
  if (rawToken.startsWith("usr_")) return "usr";
  if (rawToken.startsWith("adm_")) return "adm";
  return null;
}

/** Constant-time comparison for any raw secret values compared outside the DB layer. */
export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
