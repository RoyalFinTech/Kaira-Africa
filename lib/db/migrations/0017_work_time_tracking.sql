CREATE TABLE IF NOT EXISTS work_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  task_id uuid REFERENCES work_tasks(id) ON DELETE SET NULL,
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_time_entries_end_after_start CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX IF NOT EXISTS work_time_entries_business_started_idx ON work_time_entries(business_id, started_at DESC);
CREATE INDEX IF NOT EXISTS work_time_entries_user_started_idx ON work_time_entries(business_id, user_id, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS work_time_entries_one_open_per_user_idx ON work_time_entries(user_id) WHERE ended_at IS NULL;
ALTER TABLE work_time_entries ENABLE ROW LEVEL SECURITY;
