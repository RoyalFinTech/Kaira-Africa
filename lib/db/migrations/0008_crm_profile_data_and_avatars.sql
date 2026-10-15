ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS profile_data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Customer and account photos are private. APIs return short-lived signed URLs
-- after authentication; never make inventory storage public as a workaround.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES
      ('customer-photos', 'customer-photos', false, 2097152, ARRAY['image/jpeg','image/png','image/webp']::text[]),
      ('profile-avatars', 'profile-avatars', false, 2097152, ARRAY['image/jpeg','image/png','image/webp']::text[])
    ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;
