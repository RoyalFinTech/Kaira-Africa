CREATE TABLE IF NOT EXISTS "crm_interactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "user_id" uuid,
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
DO $ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_interactions_business_id_businesses_id_fk') THEN ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action; END IF; END $;
--> statement-breakpoint
DO $ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_interactions_customer_id_customers_id_fk') THEN ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action; END IF; END $;
--> statement-breakpoint
DO $ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_interactions_user_id_users_id_fk') THEN ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; END IF; END $;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
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
DO $ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_products_business_id_businesses_id_fk') THEN ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action; END IF; END $;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "user_id" uuid,
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
DO $ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_business_id_businesses_id_fk') THEN ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action; END IF; END $;
--> statement-breakpoint
DO $ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_product_id_inventory_products_id_fk') THEN ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_inventory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE cascade ON UPDATE no action; END IF; END $;
--> statement-breakpoint
DO $ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_user_id_users_id_fk') THEN ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; END IF; END $;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_insights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "payload" jsonb,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_insights_business_idx" ON "ai_insights" USING btree ("business_id","generated_at");
--> statement-breakpoint
DO $ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_insights_business_id_businesses_id_fk') THEN ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action; END IF; END $;
