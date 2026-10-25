CREATE TABLE IF NOT EXISTS investment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  business_category text NOT NULL,
  custom_category text,
  business_model text NOT NULL DEFAULT 'offline',
  description text,
  currency char(3) NOT NULL DEFAULT 'GMD',
  initial_investment_minor bigint NOT NULL CHECK (initial_investment_minor >= 0),
  additional_costs_minor bigint NOT NULL DEFAULT 0 CHECK (additional_costs_minor >= 0),
  expected_revenue_minor bigint NOT NULL CHECK (expected_revenue_minor >= 0),
  expected_profit_minor bigint NOT NULL CHECK (expected_profit_minor >= 0),
  target_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (currency IN ('GMD','NGN','USD'))
);
CREATE INDEX IF NOT EXISTS investment_plans_business_status_idx ON investment_plans(business_id,status);
CREATE INDEX IF NOT EXISTS investment_plans_business_created_idx ON investment_plans(business_id,created_at);
CREATE TABLE IF NOT EXISTS investment_daily_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES investment_plans(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  sales_minor bigint NOT NULL DEFAULT 0 CHECK (sales_minor >= 0),
  expenses_minor bigint NOT NULL DEFAULT 0 CHECK (expenses_minor >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS investment_daily_business_date_idx ON investment_daily_records(business_id,record_date);
CREATE INDEX IF NOT EXISTS investment_daily_plan_date_idx ON investment_daily_records(plan_id,record_date);
