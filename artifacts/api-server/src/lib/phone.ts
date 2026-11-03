import { BadRequestError } from "./http-errors";

/**
 * Normalize Gambian mobile numbers used for Kaira sign-in and team invitations.
 * Supported prefixes are 87 (Africell), 83 (QCell), 86 (Comium), and seven-digit
 * Gamtel numbers beginning with 9. The returned country code is always +220.
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
      : stripped.startsWith("220") && stripped.length > 9
        ? stripped.slice(3)
        : stripped;

  if (!/^(?:87|83|86)\d{7}$/.test(withoutCountryCode) && !/^9\d{6}$/.test(withoutCountryCode)) {
    throw new BadRequestError(
      "Enter a valid Gambian mobile number: 87 Africell, 83 QCell, 86 Comium, or a 7-digit Gamtel number",
    );
  }

  return { countryCode: "+220", number: withoutCountryCode };
}
