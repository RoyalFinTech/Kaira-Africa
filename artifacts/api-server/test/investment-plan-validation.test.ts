import assert from "node:assert/strict";
import test from "node:test";
import { validateInvestmentPlanAmounts } from "../src/lib/investment-plan-validation";

test("accepts valid investment plans at exact cost and profit boundaries", () => {
  assert.deepEqual(validateInvestmentPlanAmounts({
    initialInvestmentMinor: 10000,
    additionalCostsMinor: 2500,
    expectedRevenueMinor: 20000,
    expectedProfitMinor: 7500,
  }), { totalCostMinor: 12500, plannedNetMinor: 7500 });
});

test("rejects revenue below planned costs", () => {
  assert.throws(() => validateInvestmentPlanAmounts({
    initialInvestmentMinor: 10000,
    additionalCostsMinor: 2500,
    expectedRevenueMinor: 12499,
    expectedProfitMinor: 0,
  }), /at least the total planned cost/);
});

test("rejects expected profit greater than revenue minus all costs", () => {
  assert.throws(() => validateInvestmentPlanAmounts({
    initialInvestmentMinor: 10000,
    additionalCostsMinor: 2500,
    expectedRevenueMinor: 20000,
    expectedProfitMinor: 7501,
  }), /cannot exceed expected revenue minus planned costs/);
});

test("rejects zero revenue, negative amounts and unsafe integer totals", () => {
  assert.throws(() => validateInvestmentPlanAmounts({
    initialInvestmentMinor: 0,
    additionalCostsMinor: 0,
    expectedRevenueMinor: 0,
    expectedProfitMinor: 0,
  }), /Expected revenue/);
  assert.throws(() => validateInvestmentPlanAmounts({
    initialInvestmentMinor: -1,
    additionalCostsMinor: 0,
    expectedRevenueMinor: 1,
    expectedProfitMinor: 0,
  }), /non-negative safe integers/);
  assert.throws(() => validateInvestmentPlanAmounts({
    initialInvestmentMinor: Number.MAX_SAFE_INTEGER,
    additionalCostsMinor: 1,
    expectedRevenueMinor: Number.MAX_SAFE_INTEGER,
    expectedProfitMinor: 0,
  }), /Total planned costs exceed/);
});
