import { BadRequestError } from "./http-errors";

/**
 * Gambian Kaira mobile numbers use the +220 country code, the 87
 * operator prefix, and seven subscriber digits (9 digits after +220).
 * The UI presents +220 87 as a fixed, subdued prefix and accepts
 * only the remaining seven digits from the user.
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
      "Enter a valid Gambian mobile number: 87 Africell, 83 QCell, 86 Comium, or a 7-digit Gamcel number",
    );
  }

  return { countryCode: "+220", number: withoutCountryCode };
}
