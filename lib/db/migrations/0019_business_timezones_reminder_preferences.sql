ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Banjul';

ALTER TABLE work_meetings
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Banjul';

CREATE TABLE IF NOT EXISTS work_task_reminder_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  due_today_enabled boolean NOT NULL DEFAULT true,
  overdue_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_task_reminder_preferences_business_user_unique UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS work_task_reminder_preferences_user_idx
  ON work_task_reminder_preferences(user_id, business_id);

ALTER TABLE work_task_reminder_preferences ENABLE ROW LEVEL SECURITY;
