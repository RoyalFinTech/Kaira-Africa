import { BadRequestError } from "./http-errors";

/**
 * Gambian mobile numbers are 7 digits after the +220 country code
 * (e.g. +220 7001234). This accepts the number with or without the
 * country code, spaces, or dashes, and normalizes to
 * { countryCode: "+220", number: "7001234" }.
 */
export function normalizeGambianPhone(raw: string): {
  countryCode: string;
  number: string;
} {
  const stripped = raw.replace(/[\s-]/g, "");
  const withoutCountryCode = stripped.startsWith("+220")
    ? stripped.slice(4)
    : stripped.startsWith("00220")
      ? stripped.slice(5)
      : stripped.startsWith("220") && stripped.length > 7
        ? stripped.slice(3)
        : stripped;

  if (!/^\d{7}$/.test(withoutCountryCode)) {
    throw new BadRequestError(
      "Enter a valid Gambian phone number, e.g. +220 7001234",
    );
  }

  return { countryCode: "+220", number: withoutCountryCode };
}
