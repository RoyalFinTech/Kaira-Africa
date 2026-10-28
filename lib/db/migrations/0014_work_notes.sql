CREATE TABLE IF NOT EXISTS work_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 160),
  content text NOT NULL DEFAULT '' CHECK (char_length(content) <= 30000),
  category text NOT NULL DEFAULT 'general' CHECK (char_length(trim(category)) BETWEEN 1 AND 60),
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_notes_business_updated_idx ON work_notes(business_id, updated_at);
CREATE INDEX IF NOT EXISTS work_notes_business_category_idx ON work_notes(business_id, category);
-- The API enforces business scope and is the only supported access path.
ALTER TABLE work_notes ENABLE ROW LEVEL SECURITY;
