import assert from "node:assert/strict";
import test from "node:test";
import { supabaseStorageHeaders } from "../src/lib/supabase-storage-headers";

test("modern Supabase secret keys are sent via apikey only", () => {
  const headers = supabaseStorageHeaders("sb_secret_test_only", { "Content-Type": "application/json" });
  assert.equal(headers.apikey, "sb_secret_test_only");
  assert.equal(headers["Content-Type"], "application/json");
  assert.equal("Authorization" in headers, false);
});

test("legacy service-role JWTs retain the Authorization Bearer header", () => {
  const legacyKey = "eyJhbGciOiJIUzI1NiJ9.test.signature";
  const headers = supabaseStorageHeaders(legacyKey, { "Content-Type": "image/png" });
  assert.equal(headers.apikey, legacyKey);
  assert.equal(headers.Authorization, `Bearer ${legacyKey}`);
  assert.equal(headers["Content-Type"], "image/png");
});

test("additional request headers cannot expose or override the API key accidentally", () => {
  const headers = supabaseStorageHeaders("sb_secret_test_only", { "x-upsert": "false" });
  assert.equal(headers.apikey, "sb_secret_test_only");
  assert.equal(headers["x-upsert"], "false");
});
