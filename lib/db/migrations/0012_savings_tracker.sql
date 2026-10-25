CREATE TABLE IF NOT EXISTS public.savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  purpose text,
  currency char(3) NOT NULL DEFAULT 'GMD' CHECK (currency IN ('GMD','NGN','USD')),
  target_minor bigint NOT NULL CHECK (target_minor > 0),
  target_date date,
  saving_frequency text NOT NULL DEFAULT 'weekly' CHECK (saving_frequency IN ('daily','weekly','monthly','flexible')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS savings_goals_business_status_idx ON public.savings_goals(business_id,status);
CREATE INDEX IF NOT EXISTS savings_goals_business_created_idx ON public.savings_goals(business_id,created_at);

CREATE TABLE IF NOT EXISTS public.savings_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES public.savings_goals(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  entry_type text NOT NULL DEFAULT 'deposit' CHECK (entry_type IN ('deposit','withdrawal')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL DEFAULT 'GMD' CHECK (currency IN ('GMD','NGN','USD')),
  saved_date date NOT NULL DEFAULT CURRENT_DATE,
  destination_type text NOT NULL CHECK (destination_type IN ('mobile_money','bank','microfinance','cash','savings_box','savings_group','other')),
  provider text NOT NULL CHECK (length(trim(provider)) BETWEEN 2 AND 100),
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS savings_entries_business_date_idx ON public.savings_entries(business_id,saved_date);
CREATE INDEX IF NOT EXISTS savings_entries_goal_date_idx ON public.savings_entries(goal_id,saved_date);

-- The API is the only intended access path; it authenticates and scopes every query to the active business.
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_entries ENABLE ROW LEVEL SECURITY;
