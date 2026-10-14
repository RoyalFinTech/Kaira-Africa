ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GMD';

-- Public product thumbnails only; uploads are performed by the authenticated API
-- using the server-side service role key, never from the browser.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('inventory-images', 'inventory-images', true, 204800, ARRAY['image/jpeg']::text[])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
