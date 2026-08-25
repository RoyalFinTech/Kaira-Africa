/**
 * The database stores money as an integer count of the currency's minor
 * unit (bututs/cents) in `amountMinor` — see transactions.ts. The API
 * contract (OpenAPI/Zod) exposes `amount` as a decimal number. These
 * helpers convert at the edge, in one place, so no route ever does
 * float math on money directly.
 */

// All currencies currently supported by Kaira Africa use 2 decimal
// places. If a zero-decimal currency is ever added, extend this map.
const MINOR_UNIT_EXPONENT: Record<string, number> = {
  GMD: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
};

function exponentFor(currency: string): number {
  return MINOR_UNIT_EXPONENT[currency.toUpperCase()] ?? 2;
}

/** Decimal amount (e.g. 125.5) -> integer minor units (e.g. 12550). */
export function toMinorUnits(amount: number, currency: string): number {
  const exponent = exponentFor(currency);
  const factor = 10 ** exponent;
  // Round to avoid floating point drift (125.1 * 100 = 12509.999999999998).
  return Math.round(amount * factor);
}

/** Integer minor units (e.g. 12550) -> decimal amount (e.g. 125.5). */
export function fromMinorUnits(amountMinor: number, currency: string): number {
  const exponent = exponentFor(currency);
  const factor = 10 ** exponent;
  return Math.round(amountMinor) / factor;
}
