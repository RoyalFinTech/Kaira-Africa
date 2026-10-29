-- Keep exposed application tables non-writable/non-truncatable through
-- generic Supabase roles. The API server connects with its configured database
-- role and enforces business scoping in authenticated route handlers.
DO $$
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
      FROM unnest(revoke_roles) AS role_name;

    EXECUTE format(
      'REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM %s',
      role_list
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM %s',
      role_list
    );
  END IF;

  -- Supabase's security advisor identified this public SECURITY DEFINER
  -- event-trigger function as executable by generic API roles. Revoking
  -- EXECUTE does not disable the event trigger itself.
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
    IF to_regrole('anon') IS NOT NULL THEN
      REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
    END IF;
    IF to_regrole('authenticated') IS NOT NULL THEN
      REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
    END IF;
  END IF;
END
$$;
