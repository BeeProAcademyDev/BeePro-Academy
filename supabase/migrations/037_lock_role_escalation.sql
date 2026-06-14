-- Prevent role escalation from JWT metadata, request bodies, frontend state, or self-updates.
-- Roles are authoritative only in public.users.role.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
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
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.protect_user_role_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NULL OR NEW.role NOT IN ('student', 'pending_instructor', 'instructor', 'teacher', 'admin') THEN
      NEW.role := 'student';
    END IF;

    -- Users creating their own profile can never insert themselves as admin/instructor.
    IF auth.uid() = NEW.id AND NEW.role NOT IN ('student', 'pending_instructor') THEN
      NEW.role := 'student';
    END IF;

    -- Non-admin authenticated users cannot create privileged accounts.
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

    -- The user being updated can never promote themselves to any privileged role.
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

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own non-role profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
CREATE POLICY "Admins can manage users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated.');
  END IF;

  IF NOT public.current_user_is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'Access denied. Admin role required.');
  END IF;

  IF target_user_id = caller_id AND new_role <> 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot remove your own admin role.');
  END IF;

  IF new_role NOT IN ('student', 'pending_instructor', 'instructor', 'teacher', 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role specified.');
  END IF;

  UPDATE public.users
  SET role = new_role
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Target user not found.');
  END IF;

  RETURN json_build_object('success', true, 'message', 'User role updated successfully.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) TO authenticated;
