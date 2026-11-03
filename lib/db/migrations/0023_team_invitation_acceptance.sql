-- Team invitations are separate from the team roster so a pending row
-- cannot be mistaken for an authenticated account or an accepted member.
ALTER TABLE public.team_members
  ADD COLUMN access_role public.user_role NOT NULL DEFAULT 'staff';

ALTER TABLE public.team_members
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_access_role_not_owner
  CHECK (access_role <> 'owner');

-- Pending roster entries are not joined members. Preserve real join dates
-- for active/inactive members and clear the misleading defaults on pending rows.
ALTER TABLE public.team_members
  ALTER COLUMN joined_at DROP NOT NULL;

UPDATE public.team_members
SET joined_at = NULL
WHERE status = 'pending';

CREATE UNIQUE INDEX team_members_business_user_unique
  ON public.team_members (business_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX team_members_business_phone_pending_unique
  ON public.team_members (business_id, phone)
  WHERE phone IS NOT NULL AND status = 'pending';

CREATE TYPE public.team_invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');

CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL UNIQUE REFERENCES public.team_members(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  target_phone_country_code text NOT NULL DEFAULT '+220',
  target_phone_number text NOT NULL,
  access_role public.user_role NOT NULL,
  status public.team_invitation_status NOT NULL DEFAULT 'pending',
  invited_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  accepted_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  email_delivery_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_invitations_assignable_role_only
    CHECK (access_role IN ('manager', 'staff'))
);

CREATE INDEX team_invitations_business_status_idx
  ON public.team_invitations (business_id, status);
CREATE INDEX team_invitations_expiry_idx
  ON public.team_invitations (expires_at);
CREATE UNIQUE INDEX team_invitations_business_phone_pending_unique
  ON public.team_invitations (business_id, target_phone_country_code, target_phone_number)
  WHERE status = 'pending';

-- All invite and acceptance operations run through the authenticated Kaira API
-- using its server-side database connection. No browser/Data API access is granted.
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- PUBLIC always exists; Supabase API roles are installed by Supabase but are
-- not present in a vanilla PostgreSQL database used by CI.
REVOKE ALL PRIVILEGES ON TABLE public.team_invitations FROM PUBLIC;

DO $
DECLARE
  revoke_roles text[] := ARRAY[]::text[];
  role_list text;
BEGIN
  IF to_regrole('anon') IS NOT NULL THEN
    revoke_roles := array_append(revoke_roles, 'anon');
  END IF;
  IF to_regrole('authenticated') IS NOT NULL THEN
    revoke_roles := array_append(revoke_roles, 'authenticated');
  END IF;

  IF cardinality(revoke_roles) > 0 THEN
    SELECT string_agg(quote_ident(role_name), ', ')
      INTO role_list
      FROM unnest(revoke_roles) AS roles(role_name);

    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.team_invitations FROM %s',
      role_list
    );
  END IF;
END
$;
