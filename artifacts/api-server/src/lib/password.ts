import argon2 from "argon2";
import { BadRequestError } from "./http-errors";

export async function hashPassword(plain: string): Promise<string> {
  // argon2id is the recommended variant — resistant to both GPU
  // cracking and side-channel attacks. Verification is inherently
  // constant-time.
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Malformed hash, etc — treat as a failed verification, not a crash.
    return false;
  }
}

/**
 * Minimum bar for admin passwords: 10+ chars, at least one uppercase,
 * one lowercase, one digit, one symbol. Throws with a specific reason
 * so the client can show useful feedback (this endpoint is internal/
 * admin-only, so detailed feedback here isn't an enumeration risk the
 * way a login error message would be).
 */
export function validatePasswordComplexity(password: string): void {
  const problems: string[] = [];
  if (password.length < 10) problems.push("at least 10 characters");
  if (!/[a-z]/.test(password)) problems.push("a lowercase letter");
  if (!/[A-Z]/.test(password)) problems.push("an uppercase letter");
  if (!/[0-9]/.test(password)) problems.push("a digit");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("a symbol");

  if (problems.length > 0) {
    throw new BadRequestError(
      `Password must contain ${problems.join(", ")}.`,
    );
  }
}
