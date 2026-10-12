CREATE TABLE IF NOT EXISTS "daily_ledger_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "public"."businesses"("id") ON DELETE cascade,
  "created_by" uuid REFERENCES "public"."users"("id") ON DELETE set null,
  "entry_type" text NOT NULL,
  "description" text NOT NULL,
  "category" text,
  "amount_minor" bigint NOT NULL,
  "currency" char(3) DEFAULT 'GMD' NOT NULL,
  "customer_name" text,
  "product_id" uuid REFERENCES "public"."inventory_products"("id") ON DELETE set null,
  "quantity" integer,
  "due_date" date,
  "status" text DEFAULT 'recorded' NOT NULL,
  "recorded_date" date DEFAULT CURRENT_DATE NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_ledger_business_date_idx" ON "daily_ledger_entries" USING btree ("business_id","recorded_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_ledger_business_type_date_idx" ON "daily_ledger_entries" USING btree ("business_id","entry_type","recorded_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_ledger_business_status_idx" ON "daily_ledger_entries" USING btree ("business_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_ledger_product_idx" ON "daily_ledger_entries" USING btree ("product_id");
