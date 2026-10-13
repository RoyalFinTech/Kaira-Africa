const COMMON_SEQUENTIAL_PINS = new Set([
  "012345", "123456", "234567", "345678", "456789",
  "987654", "876543", "765432", "654321", "543210",
]);

/** Accepts exactly six decimal digits, including PINs with leading zeroes. */
export function isSixDigitPin(pin: string): boolean {
  return /^\\d{6}$/.test(pin);
}

/** Require six digits while rejecting the most predictable PIN patterns. */
export function isStrongPin(pin: string): boolean {
  return isSixDigitPin(pin)
    && !/^(\\d)\\1{5}$/.test(pin)
    && !COMMON_SEQUENTIAL_PINS.has(pin);
}
