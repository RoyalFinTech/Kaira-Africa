import assert from "node:assert/strict";
import test from "node:test";
import { createBusinessReferralCode, normalizeBusinessReferralCode } from "../src/lib/business-referral";

test("creates unique business referral codes in the documented format", () => {
  const first = createBusinessReferralCode();
  const second = createBusinessReferralCode();
  assert.match(first, /^KAI-[A-F0-9]{16}$/);
  assert.match(second, /^KAI-[A-F0-9]{16}$/);
  assert.notEqual(first, second);
});

test("normalizes valid referral codes and rejects arbitrary input", () => {
  assert.equal(normalizeBusinessReferralCode(" kai-abcdef0123456789 "), "KAI-ABCDEF0123456789");
  assert.equal(normalizeBusinessReferralCode("KAI-1234"), null);
  assert.equal(normalizeBusinessReferralCode("https://example.com"), null);
  assert.equal(normalizeBusinessReferralCode(null), null);
  assert.equal(normalizeBusinessReferralCode(123), null);
});
