-- Pending roster rows are not joined members. Do not manufacture a join date
-- when an older roster-only endpoint creates a new pending team record.
ALTER TABLE public.team_members
  ALTER COLUMN joined_at DROP DEFAULT;
