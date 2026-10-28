CREATE TABLE IF NOT EXISTS team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  message_type text NOT NULL DEFAULT 'message' CHECK (message_type IN ('message', 'announcement')),
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team_messages_business_created_idx ON team_messages(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS team_messages_business_type_created_idx ON team_messages(business_id, message_type, created_at DESC);
-- Access is enforced by the authenticated API, which always scopes reads/writes to the active business.
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;
