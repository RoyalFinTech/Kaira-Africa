import assert from "node:assert/strict";
import test from "node:test";
import { allocateDebtPayment } from "../src/lib/debt-allocation";

test("allocates partial payments oldest-first and marks fully paid debts", () => {
  assert.deepEqual(allocateDebtPayment(750, [
    { id: "oldest", amountMinor: 500, balanceMinor: null },
    { id: "next", amountMinor: 500, balanceMinor: 300 },
    { id: "newest", amountMinor: 100, balanceMinor: null },
  ]), {
    totalDueMinor: 900,
    allocations: [
      { id: "oldest", allocatedMinor: 500, balanceMinor: 0, status: "paid" },
      { id: "next", allocatedMinor: 250, balanceMinor: 50, status: "unpaid" },
    ],
  });
});

test("allocates an exact full payment and ignores already-paid debts", () => {
  assert.deepEqual(allocateDebtPayment(400, [
    { id: "paid", amountMinor: 900, balanceMinor: 0 },
    { id: "open", amountMinor: 400, balanceMinor: 400 },
  ]), {
    totalDueMinor: 400,
    allocations: [{ id: "open", allocatedMinor: 400, balanceMinor: 0, status: "paid" }],
  });
});

test("rejects invalid payments and overpayment", () => {
  const debts = [{ id: "d1", amountMinor: 500, balanceMinor: 500 }];
  assert.equal(allocateDebtPayment(0, debts), null);
  assert.equal(allocateDebtPayment(-1, debts), null);
  assert.equal(allocateDebtPayment(1.5, debts), null);
  assert.equal(allocateDebtPayment(Number.MAX_SAFE_INTEGER + 1, debts), null);
  assert.equal(allocateDebtPayment(501, debts), null);
  assert.equal(allocateDebtPayment(100, []), null);
});

test("rejects invalid debt values and unsafe aggregate totals", () => {
  assert.equal(allocateDebtPayment(100, [{ id: "bad", amountMinor: -1, balanceMinor: null }]), null);
  assert.equal(allocateDebtPayment(100, [{ id: "", amountMinor: 100, balanceMinor: 100 }]), null);
  assert.equal(allocateDebtPayment(100, [{ id: "bad", amountMinor: 100, balanceMinor: 1.5 }]), null);
  assert.equal(allocateDebtPayment(100, [
    { id: "a", amountMinor: Number.MAX_SAFE_INTEGER, balanceMinor: Number.MAX_SAFE_INTEGER },
    { id: "b", amountMinor: 1, balanceMinor: 1 },
  ]), null);
});
