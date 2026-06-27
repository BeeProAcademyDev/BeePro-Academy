-- Production security lockdown after source-code exposure.
-- Run in Supabase SQL Editor after confirming the current admin account works.

BEGIN;

-- 1) Remove legacy admin RPCs that trusted a client-supplied admin_user_id.
-- Current admin RPCs must derive the caller from auth.uid().
DROP FUNCTION IF EXISTS public.admin_get_all_users(uuid);
DROP FUNCTION IF EXISTS public.admin_get_users_simple(uuid);
DROP FUNCTION IF EXISTS public.admin_update_user_role(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.admin_get_user_details(uuid, uuid);
DROP FUNCTION IF EXISTS public.admin_get_platform_stats(uuid);
DROP FUNCTION IF EXISTS public.create_first_admin(text, text, text);
DROP FUNCTION IF EXISTS public.admin_toggle_user_status(uuid, uuid);
DROP FUNCTION IF EXISTS public.admin_toggle_user_status(uuid);

-- 2) Revoke self-sync and legacy bootstrap paths even if a prior script recreated them.
DO $$
DECLARE
  fn regprocedure := to_regprocedure('public.sync_admin_role_if_allowed()');
BEGIN
  IF fn IS NOT NULL THEN
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
  ELSE
    RAISE NOTICE 'Skipping missing function: public.sync_admin_role_if_allowed()';
  END IF;
END $$;

-- 3) Keep the role-protection trigger active.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'users'
      AND trigger_name = 'trigger_protect_user_role'
  ) THEN
    ALTER TABLE public.users ENABLE TRIGGER trigger_protect_user_role;
  ELSE
    RAISE NOTICE 'Missing trigger: public.users.trigger_protect_user_role. Apply migration 037_lock_role_escalation.sql.';
  END IF;
END $$;

-- 4) Ensure core sensitive tables have RLS enabled.
CREATE TABLE IF NOT EXISTS public.admin_email_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_email_allowlist ENABLE ROW LEVEL SECURITY;

-- Required by admin RLS policies. Recreate defensively in case older
-- production databases missed migration 037.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid()),
    'anon'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'admin';
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- Keep the current replacement admin allowlisted and remove the old known
-- compromised/default admin email from this server-side list.
INSERT INTO public.admin_email_allowlist (email)
VALUES ('admin63@beepro-academy.com')
ON CONFLICT (email) DO NOTHING;

DELETE FROM public.admin_email_allowlist
WHERE lower(email) = lower('admin@beepro.academy');

-- 5) Re-assert strict user profile read policies.
DROP POLICY IF EXISTS "Public can view user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view users" ON public.users;

CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

-- 6) Re-assert admin allowlist policy.
DROP POLICY IF EXISTS "Only admins manage allowlist" ON public.admin_email_allowlist;
CREATE POLICY "Only admins manage allowlist"
  ON public.admin_email_allowlist
  FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- 7) Keep only authenticated access to current secure RPCs.
-- Some production databases may not have every later admin RPC yet, so only
-- apply grants/revokes to functions that actually exist.
DO $$
DECLARE
  fn regprocedure;
  fn_name text;
  secure_admin_functions text[] := ARRAY[
    'public.admin_get_all_users()',
    'public.admin_get_user_details(uuid)',
    'public.admin_update_user_role(uuid, text)',
    'public.admin_approve_instructor(uuid)',
    'public.admin_reject_instructor(uuid)',
    'public.admin_set_user_suspended(uuid, boolean)',
    'public.admin_delete_platform_user(uuid)'
  ];
BEGIN
  FOREACH fn_name IN ARRAY secure_admin_functions LOOP
    fn := to_regprocedure(fn_name);

    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    ELSE
      RAISE NOTICE 'Skipping missing function: %', fn_name;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Post-run checks.
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'users'
  AND trigger_name = 'trigger_protect_user_role';

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'admin_email_allowlist')
ORDER BY tablename;
