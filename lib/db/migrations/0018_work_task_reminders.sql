CREATE TABLE IF NOT EXISTS work_task_reminder_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES work_tasks(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_kind text NOT NULL CHECK (reminder_kind IN ('due_today', 'overdue')),
  reminder_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_task_reminder_deliveries_once_per_day
    UNIQUE (task_id, recipient_user_id, reminder_kind, reminder_date)
);
CREATE INDEX IF NOT EXISTS work_task_reminder_deliveries_business_date_idx
  ON work_task_reminder_deliveries(business_id, reminder_date DESC);
ALTER TABLE work_task_reminder_deliveries ENABLE ROW LEVEL SECURITY;
