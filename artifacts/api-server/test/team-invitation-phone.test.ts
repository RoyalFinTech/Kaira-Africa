import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGambianPhone } from "../src/lib/phone";

test("normalizes Gambian Africell, QCell, and Comium numbers", () => {
  assert.deepEqual(normalizeGambianPhone("+220 87 123 4567"), { countryCode: "+220", number: "871234567" });
  assert.deepEqual(normalizeGambianPhone("83 123 4567"), { countryCode: "+220", number: "831234567" });
  assert.deepEqual(normalizeGambianPhone("00220 86 123 4567"), { countryCode: "+220", number: "861234567" });
});

test("accepts seven-digit Gamtel numbers without an operator prefix", () => {
  assert.deepEqual(normalizeGambianPhone("+220 9123456"), { countryCode: "+220", number: "9123456" });
});

test("rejects unsupported operator prefixes and malformed phone numbers", () => {
  assert.throws(() => normalizeGambianPhone("+220 88 123 4567"), /Gamtel/);
  assert.throws(() => normalizeGambianPhone("12345"), /valid Gambian mobile number/);
});
