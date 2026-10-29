export interface InvestmentPlanAmountsMinor {
  initialInvestmentMinor: number;
  additionalCostsMinor: number;
  expectedRevenueMinor: number;
  expectedProfitMinor: number;
}

export function validateInvestmentPlanAmounts(amounts: InvestmentPlanAmountsMinor): {
  totalCostMinor: number;
  plannedNetMinor: number;
} {
  const values = Object.values(amounts);
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error("Investment plan amounts must be non-negative safe integers in minor currency units.");
  }
  const totalCostMinor = amounts.initialInvestmentMinor + amounts.additionalCostsMinor;
  if (!Number.isSafeInteger(totalCostMinor)) {
    throw new Error("Total planned costs exceed the supported amount.");
  }
  if (amounts.expectedRevenueMinor <= 0) {
    throw new Error("Expected revenue must be at least 0.01 in the selected currency.");
  }
  if (amounts.expectedRevenueMinor < totalCostMinor) {
    throw new Error("Expected revenue should be at least the total planned cost. Review the assumptions if a loss is expected.");
  }
  const plannedNetMinor = amounts.expectedRevenueMinor - totalCostMinor;
  if (amounts.expectedProfitMinor > plannedNetMinor) {
    throw new Error("Expected profit cannot exceed expected revenue minus planned costs.");
  }
  return { totalCostMinor, plannedNetMinor };
}
