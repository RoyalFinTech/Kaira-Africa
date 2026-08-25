/**
 * A user exists (and can act) as soon as their phone is OTP-verified,
 * before they've necessarily set firstName/lastName (Full Name screen
 * comes after). Anywhere we render "who did this" for activity logs
 * etc., fall back gracefully instead of printing "null null".
 */
export function displayName(person: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return name || "A Kaira Africa user";
}
