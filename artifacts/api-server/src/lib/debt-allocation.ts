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

/** Allocates an exact positive payment against ordered (oldest first) debt records. */
export function allocateDebtPayment(paymentMinor: number, debts: DebtAllocationInput[]): DebtAllocationResult | null {
  if (!Number.isSafeInteger(paymentMinor) || paymentMinor <= 0) return null;
  if (debts.some((debt) =>
    typeof debt.id !== "string" || !debt.id.trim() ||
    !Number.isSafeInteger(debt.amountMinor) || debt.amountMinor < 0 ||
    (debt.balanceMinor !== null && (!Number.isSafeInteger(debt.balanceMinor) || debt.balanceMinor < 0))
  )) return null;
  const open = debts.map((debt) => ({
    id: debt.id,
    balanceMinor: debt.balanceMinor ?? debt.amountMinor,
  })).filter((debt) => debt.balanceMinor > 0);
  let totalDueMinor = 0;
  for (const debt of open) {
    totalDueMinor += debt.balanceMinor;
    if (!Number.isSafeInteger(totalDueMinor)) return null;
  }
  if (totalDueMinor <= 0 || paymentMinor > totalDueMinor) return null;
  let remainingMinor = paymentMinor;
  const allocations: DebtAllocation[] = [];
  for (const debt of open) {
    if (remainingMinor <= 0) break;
    const allocatedMinor = Math.min(debt.balanceMinor, remainingMinor);
    const balanceMinor = debt.balanceMinor - allocatedMinor;
    allocations.push({ id: debt.id, allocatedMinor, balanceMinor, status: balanceMinor === 0 ? "paid" : "unpaid" });
    remainingMinor -= allocatedMinor;
  }
  if (remainingMinor !== 0) return null;
  return { totalDueMinor, allocations };
}
