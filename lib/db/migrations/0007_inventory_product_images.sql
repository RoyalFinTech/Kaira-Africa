ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GMD';

-- Supabase provides storage.buckets. Local CI PostgreSQL does not, so keep
-- the schema migration portable while configuring the bucket on Supabase.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('inventory-images', 'inventory-images', true, 204800, ARRAY['image/jpeg']::text[])
    ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;
