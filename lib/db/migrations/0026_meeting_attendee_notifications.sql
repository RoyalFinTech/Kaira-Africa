-- Link meeting notifications only to authenticated, active team users.
-- Existing free-text attendees remain intact for external guests and legacy records.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'meeting';

ALTER TABLE work_meetings
  ADD COLUMN IF NOT EXISTS attendee_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

COMMENT ON COLUMN work_meetings.attendee_user_ids IS
  'Authenticated active team-member user IDs selected to receive in-app meeting notifications. Free-text attendees remain in attendees JSONB.';
