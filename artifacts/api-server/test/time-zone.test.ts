import assert from "node:assert/strict";
import test from "node:test";
import {
  dateInTimeZone,
  localDateTimeInTimeZone,
  localMeetingTimeToUtc,
} from "../../kaira-africa/src/lib/time-zone";

test("date-only deadlines follow the selected business calendar near UTC midnight", () => {
  const instant = new Date("2026-10-29T00:30:00.000Z");
  assert.equal(dateInTimeZone(instant, "Africa/Banjul"), "2026-10-29");
  assert.equal(dateInTimeZone(instant, "Africa/Lagos"), "2026-10-29");
  assert.equal(dateInTimeZone(instant, "America/Los_Angeles"), "2026-10-28");
});

test("converts a valid local meeting time to its UTC instant", () => {
  assert.equal(
    localMeetingTimeToUtc("2026-07-01T09:00", "Europe/London"),
    "2026-07-01T08:00:00.000Z",
  );
  assert.equal(
    localMeetingTimeToUtc("2026-10-29T09:00", "Africa/Banjul"),
    "2026-10-29T09:00:00.000Z",
  );
});

test("rejects nonexistent local times during a spring-forward transition", () => {
  assert.equal(localMeetingTimeToUtc("2026-03-29T01:30", "Europe/London"), null);
});

test("rejects repeated local times during fall-back transitions", () => {
  assert.equal(localMeetingTimeToUtc("2026-10-25T01:30", "Europe/London"), null);
  assert.equal(localMeetingTimeToUtc("2026-11-01T01:30", "America/New_York"), null);
});

test("rejects impossible calendar dates and formats saved instants in the meeting zone", () => {
  assert.equal(localMeetingTimeToUtc("2026-02-30T10:00", "Africa/Banjul"), null);
  assert.equal(
    localDateTimeInTimeZone(new Date("2026-07-01T08:00:00.000Z"), "Europe/London"),
    "2026-07-01T09:00",
  );
});
