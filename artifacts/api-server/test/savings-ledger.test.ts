import assert from "node:assert/strict";
import test from "node:test";
import { calculateSavingsBalanceMinor, canWithdrawFromSavingsPool } from "../src/lib/savings-ledger";

test("calculates a recorded savings pool balance in minor units", () => {
  const balance = calculateSavingsBalanceMinor([
    { entryType: "deposit", amountMinor: 12500 },
    { entryType: "deposit", amountMinor: "2500" },
    { entryType: "withdrawal", amountMinor: 3000 },
  ]);
  assert.equal(balance, 12000);
});

test("permits withdrawals only when the selected pool covers the amount", () => {
  assert.equal(canWithdrawFromSavingsPool(5000, 5000), true);
  assert.equal(canWithdrawFromSavingsPool(5001, 5000), false);
  assert.equal(canWithdrawFromSavingsPool(1, -1), false);
  assert.equal(canWithdrawFromSavingsPool(0, 5000), false);
  assert.equal(canWithdrawFromSavingsPool(-1, 5000), false);
});

test("rejects invalid ledger amounts and unknown entry types", () => {
  assert.throws(() => calculateSavingsBalanceMinor([
    { entryType: "deposit", amountMinor: -1 },
  ]), /non-negative safe integers/);
  assert.throws(() => calculateSavingsBalanceMinor([
    { entryType: "transfer", amountMinor: 100 },
  ]), /Unsupported savings ledger entry type/);
});

test("rejects savings balances whose cumulative total exceeds safe integer precision", () => {
  assert.throws(() => calculateSavingsBalanceMinor([
    { entryType: "deposit", amountMinor: Number.MAX_SAFE_INTEGER },
    { entryType: "deposit", amountMinor: 1 },
  ]), /exceeds the safe integer limit/);
  assert.equal(canWithdrawFromSavingsPool(1, Number.MAX_SAFE_INTEGER + 1), false);
});
