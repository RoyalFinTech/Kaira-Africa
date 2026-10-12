ALTER TABLE "daily_ledger_entries"
  ADD COLUMN IF NOT EXISTS "balance_minor" bigint;
--> statement-breakpoint
UPDATE "daily_ledger_entries"
SET "balance_minor" = CASE
  WHEN "entry_type" = 'debt' AND "status" = 'unpaid' THEN "amount_minor"
  WHEN "entry_type" = 'debt' AND "status" = 'paid' THEN 0
  ELSE NULL
END
WHERE "balance_minor" IS NULL;
