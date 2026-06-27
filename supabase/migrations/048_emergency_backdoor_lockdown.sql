-- Emergency backdoor lockdown after suspected Supabase key/source exposure.
-- Run in Supabase SQL Editor.
--
-- This migration is intentionally defensive:
-- - It does not delete user data.
-- - It does not ban normal users.
-- - It removes legacy admin/bootstrap RPCs.
-- - It removes anonymous RPC execution from public schema functions.
-- - It enables RLS on every public table.
-- - It keeps admin authority tied to the known replacement admin email.

BEGIN;

-- Configure the only intended admin email for this incident response.
CREATE TEMP TABLE IF NOT EXISTS incident_lockdown_settings (
  admin_email text PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO incident_lockdown_settings (admin_email)
VALUES ('admin63@beepro-academy.com')
ON CONFLICT (admin_email) DO NOTHING;

-- Core server-side admin allowlist.
CREATE TABLE IF NOT EXISTS public.admin_email_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_email_allowlist ENABLE ROW LEVEL SECURITY;

-- Current-user helpers used by policies. These deliberately trust only
-- public.users.role, not JWT metadata or frontend state.
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

-- Remove legacy admin/bootstrap RPC signatures that trusted client-supplied
-- admin ids or created admin users from the browser.
DROP FUNCTION IF EXISTS public.admin_get_all_users(uuid);
DROP FUNCTION IF EXISTS public.admin_get_users_simple(uuid);
DROP FUNCTION IF EXISTS public.admin_update_user_role(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.admin_get_user_details(uuid, uuid);
DROP FUNCTION IF EXISTS public.admin_get_platform_stats(uuid);
DROP FUNCTION IF EXISTS public.create_first_admin(text, text, text);
DROP FUNCTION IF EXISTS public.admin_toggle_user_status(uuid, uuid);
DROP FUNCTION IF EXISTS public.admin_toggle_user_status(uuid);

DO $$
DECLARE
  fn regprocedure := to_regprocedure('public.sync_admin_role_if_allowed()');
BEGIN
  IF fn IS NOT NULL THEN
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
  END IF;
END $$;

-- Enforce that future signup role resolution never self-promotes to admin.
CREATE OR REPLACE FUNCTION public.resolve_signup_role(meta_role text, user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_meta text := lower(trim(coalesce(meta_role, '')));
BEGIN
  IF normalized_meta IN ('instructor', 'teacher', 'pending_instructor') THEN
    RETURN 'pending_instructor';
  END IF;

  RETURN 'student';
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_signup_role(text, text) TO authenticated;

-- Ensure role changes cannot be driven by normal users/client metadata.
CREATE OR REPLACE FUNCTION public.protect_user_role_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NULL OR NEW.role NOT IN ('student', 'pending_instructor', 'instructor', 'teacher', 'admin') THEN
      NEW.role := 'student';
    END IF;

    IF auth.uid() = NEW.id AND NEW.role NOT IN ('student', 'pending_instructor') THEN
      NEW.role := 'student';
    END IF;

    IF auth.uid() IS NOT NULL
       AND auth.uid() <> NEW.id
       AND NEW.role IN ('admin', 'instructor', 'teacher')
       AND NOT public.current_user_is_admin() THEN
      RAISE EXCEPTION 'Role changes require admin authorization';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Role changes require admin authorization';
    END IF;

    IF auth.uid() = NEW.id THEN
      RAISE EXCEPTION 'Users cannot change their own role';
    END IF;

    IF NOT public.current_user_is_admin() THEN
      RAISE EXCEPTION 'Role changes require admin authorization';
    END IF;

    IF NEW.role NOT IN ('student', 'pending_instructor', 'instructor', 'teacher', 'admin') THEN
      RAISE EXCEPTION 'Invalid role';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_user_role ON public.users;
CREATE TRIGGER trigger_protect_user_role
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_role_column();

-- Enable RLS for every public table. Policies still decide exact access.
DO $$
DECLARE
  table_row record;
BEGIN
  FOR table_row IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', table_row.schemaname, table_row.tablename);
  END LOOP;
END $$;

-- Strict user profile policies.
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

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own non-role profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

CREATE POLICY "Users can update their own non-role profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Server-side allowlist is admin-only.
DROP POLICY IF EXISTS "Only admins manage allowlist" ON public.admin_email_allowlist;
CREATE POLICY "Only admins manage allowlist"
  ON public.admin_email_allowlist
  FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Keep only the intended admin email in the allowlist.
DELETE FROM public.admin_email_allowlist
WHERE lower(email) NOT IN (
  SELECT lower(admin_email) FROM incident_lockdown_settings
);

INSERT INTO public.admin_email_allowlist (email)
SELECT lower(admin_email)
FROM incident_lockdown_settings
ON CONFLICT (email) DO NOTHING;

-- Demote every public.users admin except the intended incident admin email.
-- Trigger is temporarily disabled because SQL Editor runs without auth.uid().
ALTER TABLE public.users DISABLE TRIGGER trigger_protect_user_role;

-- Ensure the Auth admin account is linked to the matching public.users row.
-- If a stale profile already owns the admin email, move it aside first.
UPDATE public.users u
SET
  email = 'old-admin-profile-' || u.id::text || '@profile.local',
  role = CASE WHEN u.role = 'admin' THEN 'student' ELSE u.role END
WHERE lower(u.email) IN (
    SELECT lower(admin_email) FROM incident_lockdown_settings
  )
  AND u.id NOT IN (
    SELECT au.id
    FROM auth.users au
    JOIN incident_lockdown_settings s ON lower(au.email) = lower(s.admin_email)
  );

UPDATE public.users u
SET email = au.email
FROM auth.users au
JOIN incident_lockdown_settings s ON lower(au.email) = lower(s.admin_email)
WHERE u.id = au.id;

UPDATE public.users
SET role = 'student'
WHERE role = 'admin'
  AND lower(email) NOT IN (
    SELECT lower(admin_email) FROM incident_lockdown_settings
  );

UPDATE public.users
SET role = 'admin'
WHERE lower(email) IN (
  SELECT lower(admin_email) FROM incident_lockdown_settings
);

ALTER TABLE public.users ENABLE TRIGGER trigger_protect_user_role;

-- Remove anonymous RPC execution. Authenticated users still need each
-- function's internal authorization checks and RLS.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn.signature);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn.signature);

    IF split_part(fn.signature::text, '(', 1) <> 'sync_admin_role_if_allowed' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.signature);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  fn regprocedure := to_regprocedure('public.sync_admin_role_if_allowed()');
BEGIN
  IF fn IS NOT NULL THEN
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
  END IF;
END $$;

COMMIT;

-- Post-run checks. Empty/expected outputs are good:
-- 1) Only the intended admin should appear.
SELECT id, email, role
FROM public.users
WHERE role = 'admin'
ORDER BY email;

-- 2) All public tables should show rowsecurity = true.
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3) These legacy function signatures should not exist.
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    p.proname IN ('admin_get_users_simple', 'create_first_admin')
    OR pg_get_function_identity_arguments(p.oid) ILIKE '%admin_user_id%'
  )
ORDER BY function_name, args;
