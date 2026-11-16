/** Format the current instant as a date in the business's configured calendar. */
export function getBusinessCalendarDate(timeZone: string, instant = new Date()): string {
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
