import assert from "node:assert/strict";
import test from "node:test";
import { dailyLedgerCurrencySchema } from "../src/lib/daily-ledger-currency";
import { fromMinorUnits, toMinorUnits } from "../src/lib/money";

test("daily ledger accepts only supported currencies and defaults to GMD", () => {
  assert.equal(dailyLedgerCurrencySchema.default("GMD").parse(undefined), "GMD");
  for (const currency of ["GMD", "NGN", "USD"]) {
    assert.equal(dailyLedgerCurrencySchema.parse(currency), currency);
  }
  assert.throws(() => dailyLedgerCurrencySchema.parse("EUR"));
});

test("ledger money conversion stays exact in every supported currency", () => {
  for (const currency of ["GMD", "NGN", "USD"]) {
    const minor = toMinorUnits(125.5, currency);
    assert.equal(minor, 12550);
    assert.equal(fromMinorUnits(minor, currency), 125.5);
  }
});

test("ledger preserves large whole amounts such as 100000 without truncation", () => {
  for (const currency of ["GMD", "NGN", "USD"]) {
    const minor = toMinorUnits(100000, currency);
    assert.equal(minor, 10000000);
    assert.equal(fromMinorUnits(minor, currency), 100000);
  }
});
