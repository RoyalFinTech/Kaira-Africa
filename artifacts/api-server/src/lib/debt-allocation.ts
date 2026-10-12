export interface DebtAllocationInput {
  id: string;
  amountMinor: number;
  balanceMinor: number | null;
}
export interface DebtAllocation {
  id: string;
  allocatedMinor: number;
  balanceMinor: number;
  status: "paid" | "unpaid";
}
export interface DebtAllocationResult {
  totalDueMinor: number;
  allocations: DebtAllocation[];
}

/**
 * Allocates a positive payment against ordered (oldest first) debt records.
 * Returns null if there is no outstanding balance or the payment is too large.
 * Database callers must lock the selected rows and preserve their order.
 */
export function allocateDebtPayment(
  paymentMinor: number,
  debts: DebtAllocationInput[],
): DebtAllocationResult | null {
  if (!Number.isSafeInteger(paymentMinor) || paymentMinor <= 0) return null;

  const open = debts
    .map((debt) => ({
      id: debt.id,
      balanceMinor: Math.max(0, Number(debt.balanceMinor ?? debt.amountMinor)),
    }))
    .filter((debt) => debt.balanceMinor > 0);
  const totalDueMinor = open.reduce((sum, debt) => sum + debt.balanceMinor, 0);
  if (totalDueMinor <= 0 || paymentMinor > totalDueMinor) return null;

  let remainingMinor = paymentMinor;
  const allocations: DebtAllocation[] = [];
  for (const debt of open) {
    if (remainingMinor <= 0) break;
    const allocatedMinor = Math.min(debt.balanceMinor, remainingMinor);
    const balanceMinor = debt.balanceMinor - allocatedMinor;
    allocations.push({
      id: debt.id,
      allocatedMinor,
      balanceMinor,
      status: balanceMinor === 0 ? "paid" : "unpaid",
    });
    remainingMinor -= allocatedMinor;
  }

  if (remainingMinor !== 0) return null;
  return { totalDueMinor, allocations };
}
