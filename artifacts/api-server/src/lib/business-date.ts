/** Returns the calendar date for an instant in the business's configured IANA time zone. */
export function dateInBusinessTimeZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const year = read("year");
  const month = read("month");
  const day = read("day");
  if (!year || !month || !day) {
    throw new RangeError("Could not resolve the business calendar date.");
  }
  return `${year}-${month}-${day}`;
}
