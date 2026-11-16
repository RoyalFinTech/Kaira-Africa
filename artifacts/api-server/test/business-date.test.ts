import assert from "node:assert/strict";
import test from "node:test";
import { dateInBusinessTimeZone } from "../src/lib/business-date";

test("uses the business calendar date rather than the UTC date", () => {
  const justAfterUtcMidnight = new Date("2026-11-16T00:30:00.000Z");
  assert.equal(dateInBusinessTimeZone(justAfterUtcMidnight, "Africa/Banjul"), "2026-11-16");
  assert.equal(dateInBusinessTimeZone(justAfterUtcMidnight, "Africa/Lagos"), "2026-11-16");
  assert.equal(dateInBusinessTimeZone(justAfterUtcMidnight, "America/Los_Angeles"), "2026-11-15");
});

test("handles a business whose local calendar is already on the next UTC date", () => {
  const lateUtcInstant = new Date("2026-11-16T23:30:00.000Z");
  assert.equal(dateInBusinessTimeZone(lateUtcInstant, "Pacific/Kiritimati"), "2026-11-17");
  assert.equal(dateInBusinessTimeZone(lateUtcInstant, "Africa/Banjul"), "2026-11-16");
});

test("rejects an invalid IANA time zone instead of silently using UTC", () => {
  assert.throws(
    () => dateInBusinessTimeZone(new Date("2026-11-16T00:30:00.000Z"), "Not/A_Time_Zone"),
    RangeError,
  );
});
