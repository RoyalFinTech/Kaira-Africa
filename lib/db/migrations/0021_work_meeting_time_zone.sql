ALTER TABLE work_meetings
  ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'Africa/Banjul';

COMMENT ON COLUMN work_meetings.time_zone IS 'IANA time zone in which the meeting wall-clock time was entered and should be displayed.';
