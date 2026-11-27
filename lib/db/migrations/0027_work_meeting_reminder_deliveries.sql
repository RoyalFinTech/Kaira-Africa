CREATE TABLE IF NOT EXISTS work_meeting_reminder_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES work_meetings(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_meeting_reminder_deliveries_once_per_schedule
    UNIQUE (meeting_id, recipient_user_id, scheduled_for)
);

CREATE INDEX IF NOT EXISTS work_meeting_reminder_deliveries_business_schedule_idx
  ON work_meeting_reminder_deliveries(business_id, scheduled_for DESC);

ALTER TABLE work_meeting_reminder_deliveries ENABLE ROW LEVEL SECURITY;
