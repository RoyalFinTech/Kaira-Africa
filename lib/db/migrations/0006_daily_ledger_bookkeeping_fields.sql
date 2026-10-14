ALTER TABLE "daily_ledger_entries" ADD COLUMN IF NOT EXISTS "recorded_time" text;
ALTER TABLE "daily_ledger_entries" ADD COLUMN IF NOT EXISTS "payment_method" text;
ALTER TABLE "daily_ledger_entries" ADD COLUMN IF NOT EXISTS "remarks" text;
