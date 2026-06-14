-- Final authorization lockdown.
-- No user can self-promote to admin through metadata, request bodies, frontend state,
-- admin email allowlists, or legacy RPCs. Admin assignment must be done by an
-- existing database admin through admin_update_user_role or by a service-role SQL task.

CREATE OR REPLACE FUNCTION public.resolve_signup_role(meta_role TEXT, user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_meta TEXT := lower(trim(coalesce(meta_role, '')));
BEGIN
  IF normalized_meta IN ('instructor', 'teacher', 'pending_instructor') THEN
    RETURN 'pending_instructor';
  END IF;

  RETURN 'student';
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_admin_role_if_allowed()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'success', false,
    'error', 'Admin self-sync is disabled. Admin roles must be assigned by an existing admin or service role.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_admin_role_if_allowed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_admin_role_if_allowed() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_admin_role_if_allowed() FROM authenticated;

DROP FUNCTION IF EXISTS public.approve_payment_submission(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_payment_submission(UUID, UUID, TEXT);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view users" ON public.users;
CREATE POLICY "Admins can view users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Only admins manage allowlist" ON public.admin_email_allowlist;
CREATE POLICY "Only admins manage allowlist"
  ON public.admin_email_allowlist
  FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

GRANT EXECUTE ON FUNCTION public.resolve_signup_role(TEXT, TEXT) TO authenticated;
