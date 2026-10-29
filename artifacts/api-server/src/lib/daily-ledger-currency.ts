import { z } from "zod";

/** Supported ledger currencies. Never aggregate monetary values across currencies. */
export const dailyLedgerCurrencySchema = z.enum(["GMD", "NGN", "USD"]);
export type DailyLedgerCurrency = z.infer<typeof dailyLedgerCurrencySchema>;
