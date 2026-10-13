import argon2 from "argon2";

const COMMON_SEQUENTIAL_PINS = new Set([
  "012345", "123456", "234567", "345678", "456789",
  "987654", "876543", "765432", "654321", "543210",
]);

/** Accepts exactly six decimal digits, including PINs with leading zeroes. */
export function isSixDigitPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/** Require six digits while rejecting the most predictable PIN patterns. */
export function isStrongPin(pin: string): boolean {
  return isSixDigitPin(pin)
    && !/^(\d)\1{5}$/.test(pin)
    && !COMMON_SEQUENTIAL_PINS.has(pin);
}


/**
 * PINs are credentials too: hash and verify them with Argon2id rather than
 * storing the six-digit value or applying a password-length policy to it.
 */
export async function hashPin(pin: string): Promise<string> {
  if (!isStrongPin(pin)) {
    throw new Error("A strong six-digit PIN is required.");
  }
  return argon2.hash(pin, { type: argon2.argon2id });
}

export async function verifyPin(pinHash: string, pin: string): Promise<boolean> {
  if (!isSixDigitPin(pin)) return false;
  return argon2.verify(pinHash, pin);
}
