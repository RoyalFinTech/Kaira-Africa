CREATE TABLE IF NOT EXISTS "crm_interactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "public"."businesses"("id") ON DELETE cascade,
  "customer_id" uuid NOT NULL REFERENCES "public"."customers"("id") ON DELETE cascade,
  "user_id" uuid REFERENCES "public"."users"("id") ON DELETE set null,
  "type" text DEFAULT 'note' NOT NULL,
  "title" text NOT NULL,
  "note" text NOT NULL,
  "next_action_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_interactions_business_idx" ON "crm_interactions" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_interactions_customer_idx" ON "crm_interactions" USING btree ("customer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_interactions_next_action_idx" ON "crm_interactions" USING btree ("business_id","next_action_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "public"."businesses"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "sku" text NOT NULL,
  "category" text,
  "unit" text DEFAULT 'unit' NOT NULL,
  "quantity" integer DEFAULT 0 NOT NULL,
  "reorder_level" integer DEFAULT 5 NOT NULL,
  "unit_cost_minor" bigint DEFAULT 0 NOT NULL,
  "sale_price_minor" bigint DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_products_business_idx" ON "inventory_products" USING btree ("business_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_products_business_sku_unique" ON "inventory_products" USING btree ("business_id","sku");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "public"."businesses"("id") ON DELETE cascade,
  "product_id" uuid NOT NULL REFERENCES "public"."inventory_products"("id") ON DELETE cascade,
  "user_id" uuid REFERENCES "public"."users"("id") ON DELETE set null,
  "quantity_delta" integer NOT NULL,
  "type" text DEFAULT 'adjustment' NOT NULL,
  "reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_movements_business_idx" ON "inventory_movements" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_movements_product_idx" ON "inventory_movements" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_movements_created_idx" ON "inventory_movements" USING btree ("business_id","created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_insights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "public"."businesses"("id") ON DELETE cascade,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "payload" jsonb,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_insights_business_idx" ON "ai_insights" USING btree ("business_id","generated_at");
