/**
 * Compute a savings pool's recorded balance in minor currency units.
 * The caller must first scope entries to exactly one business and either
 * one goal or the unassigned pool for one currency.
 */
export type SavingsLedgerBalanceEntry = {
  entryType: string;
  amountMinor: number | string;
};

export function calculateSavingsBalanceMinor(entries: readonly SavingsLedgerBalanceEntry[]): number {
  return entries.reduce((balance, entry) => {
    const amount = Number(entry.amountMinor);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new Error("Savings ledger amounts must be non-negative safe integers in minor units.");
    }
    if (entry.entryType === "deposit") return balance + amount;
    if (entry.entryType === "withdrawal") return balance - amount;
    throw new Error("Unsupported savings ledger entry type.");
  }, 0);
}

export function canWithdrawFromSavingsPool(amountMinor: number, balanceMinor: number): boolean {
  return Number.isSafeInteger(amountMinor) && amountMinor > 0
    && Number.isSafeInteger(balanceMinor) && balanceMinor >= amountMinor;
}
