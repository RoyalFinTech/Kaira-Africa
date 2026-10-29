import assert from "node:assert/strict";
import test from "node:test";
import { recordActivitySafely } from "../src/repositories/activity-logs";

const entry = {
  businessId: "business-test",
  userId: "user-test",
  userName: "QA test",
  action: "created",
  entityType: "daily_ledger_entry",
  entityId: "record-test",
  entityName: "Test sale",
  description: "QA-only activity log test",
  status: "success" as const,
};

test("activity history failure does not turn a committed business save into an API failure", async () => {
  await assert.doesNotReject(recordActivitySafely(entry, async () => {
    throw new Error("simulated activity log outage");
  }));
});

test("safe activity logging still attempts the activity write", async () => {
  let attempted = false;
  await recordActivitySafely(entry, async () => {
    attempted = true;
    return {} as never;
  });
  assert.equal(attempted, true);
});
