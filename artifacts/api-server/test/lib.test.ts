import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeGambianPhone } from "../src/lib/phone";
import { toMinorUnits, fromMinorUnits } from "../src/lib/money";
import { validatePasswordComplexity } from "../src/lib/password";
import { displayName } from "../src/lib/display-name";
import { generateOtp, OTP_LENGTH } from "../src/lib/otp";
import { generateSessionToken, tokenKind, hashToken } from "../src/lib/tokens";

describe("normalizeGambianPhone", () => {
  test("accepts a bare 7-digit number", () => {
    const { countryCode, number } = normalizeGambianPhone("7001234");
    assert.equal(countryCode, "+220");
    assert.equal(number, "7001234");
  });

  test("accepts +220 prefix and strips spaces", () => {
    const { number } = normalizeGambianPhone("+220 700 1234");
    assert.equal(number, "7001234");
  });

  test("rejects too-short numbers", () => {
    assert.throws(() => normalizeGambianPhone("12345"));
  });

  test("rejects non-numeric input", () => {
    assert.throws(() => normalizeGambianPhone("abcdefg"));
  });
});

describe("money conversion", () => {
  test("round-trips a decimal amount through minor units", () => {
    const minor = toMinorUnits(1250.75, "GMD");
    assert.equal(minor, 125075);
    assert.equal(fromMinorUnits(minor, "GMD"), 1250.75);
  });

  test("avoids floating point drift on tricky values", () => {
    assert.equal(toMinorUnits(125.1, "GMD"), 12510);
  });
});

describe("password complexity", () => {
  test("accepts a strong password", () => {
    assert.doesNotThrow(() => validatePasswordComplexity("Kaira#Admin2026!"));
  });

  test("rejects a weak password", () => {
    assert.throws(() => validatePasswordComplexity("weak"));
  });

  test("rejects a password missing a symbol", () => {
    assert.throws(() => validatePasswordComplexity("NoSymbolsHere123"));
  });
});

describe("displayName", () => {
  test("joins first and last name", () => {
    assert.equal(displayName({ firstName: "Amie", lastName: "Jallow" }), "Amie Jallow");
  });

  test("falls back gracefully when name is unset", () => {
    assert.equal(displayName({ firstName: null, lastName: null }), "A Kaira Africa user");
  });
});

describe("OTP generation", () => {
  test("generates a code of the configured length", () => {
    const code = generateOtp();
    assert.equal(code.length, OTP_LENGTH);
    assert.match(code, /^\d+$/);
  });
});

describe("session tokens", () => {
  test("generates correctly-prefixed tokens", () => {
    assert.match(generateSessionToken("usr"), /^usr_[0-9a-f]{64}$/);
    assert.match(generateSessionToken("adm"), /^adm_[0-9a-f]{64}$/);
  });

  test("tokenKind identifies the prefix correctly", () => {
    assert.equal(tokenKind("usr_abc"), "usr");
    assert.equal(tokenKind("adm_abc"), "adm");
    assert.equal(tokenKind("garbage"), null);
  });

  test("hashToken is deterministic for the same input", () => {
    const token = generateSessionToken("usr");
    assert.equal(hashToken(token), hashToken(token));
  });
});
