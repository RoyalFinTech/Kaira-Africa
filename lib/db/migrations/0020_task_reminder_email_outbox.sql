CREATE TABLE IF NOT EXISTS work_task_reminder_email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES work_tasks(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  reminder_kind text NOT NULL CHECK (reminder_kind IN ('due_today', 'overdue')),
  reminder_date date NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_task_reminder_email_outbox_once_per_day
    UNIQUE (task_id, recipient_user_id, reminder_kind, reminder_date)
);
CREATE INDEX IF NOT EXISTS work_task_reminder_email_outbox_pending_idx
  ON work_task_reminder_email_outbox(status, next_attempt_at, created_at)
  WHERE status IN ('pending', 'sending');
ALTER TABLE work_task_reminder_email_outbox ENABLE ROW LEVEL SECURITY;
