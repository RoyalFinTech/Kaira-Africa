ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'Africa/Banjul';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL
  DEFAULT '{"taskReminders":true}'::jsonb;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_notification_preferences_object_check;
ALTER TABLE users
  ADD CONSTRAINT users_notification_preferences_object_check
  CHECK (jsonb_typeof(notification_preferences) = 'object');

COMMENT ON COLUMN businesses.time_zone IS 'IANA time zone used for business schedules, due dates and reminders.';
COMMENT ON COLUMN users.notification_preferences IS 'Per-user notification preferences; taskReminders controls in-app due-date reminders.';
