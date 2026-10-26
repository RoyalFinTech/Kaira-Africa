import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeGambianPhone } from "../src/lib/phone";
import { allocateDebtPayment } from "../src/lib/debt-allocation";
import { toMinorUnits, fromMinorUnits } from "../src/lib/money";
import { validatePasswordComplexity } from "../src/lib/password";
import { displayName } from "../src/lib/display-name";
import { generateOtp, OTP_LENGTH } from "../src/lib/otp";
import { generateSessionToken, tokenKind, hashToken } from "../src/lib/tokens";

describe("normalizeGambianPhone", () => {
  test("accepts the existing 7-digit Gamcel numbering format", () => {
    const { countryCode, number } = normalizeGambianPhone("9123456");
    assert.equal(countryCode, "+220");
    assert.equal(number, "9123456");
  });

  test("accepts +220 prefix and strips spaces from a newly prefixed mobile number", () => {
    const { number } = normalizeGambianPhone("+220 871 234 567");
    assert.equal(number, "871234567");
  });

  test("accepts all newly introduced operator prefixes", () => {
    assert.equal(normalizeGambianPhone("831234567").number, "831234567");
    assert.equal(normalizeGambianPhone("861234567").number, "861234567");
    assert.equal(normalizeGambianPhone("871234567").number, "871234567");
  });

  test("rejects unallocated generic seven-digit subscriber numbers", () => {
    assert.throws(() => normalizeGambianPhone("7001234"));
  });

  test("rejects too-short numbers", () => {
    assert.throws(() => normalizeGambianPhone("12345"));
  });

  test("rejects non-numeric input", () => {
    assert.throws(() => normalizeGambianPhone("abcdefg"));
  });
});

describe("daily debt payment allocation", () => {
  test("allocates a partial payment to the oldest debt first", () => {
    const result = allocateDebtPayment(3500, [
      { id: "oldest", amountMinor: 2000, balanceMinor: 2000 },
      { id: "newer", amountMinor: 3000, balanceMinor: 3000 },
    ]);
    assert.ok(result);
    assert.equal(result.totalDueMinor, 5000);
    assert.deepEqual(result.allocations, [
      { id: "oldest", allocatedMinor: 2000, balanceMinor: 0, status: "paid" },
      { id: "newer", allocatedMinor: 1500, balanceMinor: 1500, status: "unpaid" },
    ]);
  });

  test("rejects a payment above the outstanding balance", () => {
    assert.equal(allocateDebtPayment(5001, [{ id: "debt", amountMinor: 5000, balanceMinor: 5000 }]), null);
  });

  test("rejects invalid payments and fully paid debt", () => {
    assert.equal(allocateDebtPayment(100, [{ id: "paid", amountMinor: 100, balanceMinor: 0 }]), null);
    assert.equal(allocateDebtPayment(0, [{ id: "debt", amountMinor: 100, balanceMinor: 100 }]), null);
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

  test("shows when a positive decimal rounds to zero minor units", () => {
    assert.equal(toMinorUnits(0.004, "GMD"), 0);
    assert.equal(toMinorUnits(0.005, "GMD"), 1);
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
