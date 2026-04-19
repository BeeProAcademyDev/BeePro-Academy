-- 014_fix_new_signup_profile_sync.sql
-- Ensure every Supabase Auth user has a matching public.users profile

BEGIN;

-- 1) Make sure RLS is enabled and profile self-insert policy exists
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- 2) Backfill missing profiles from auth.users
--    Skip rows when email already exists under another profile id (legacy conflict)
INSERT INTO public.users (id, email, full_name, role, created_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE(NULLIF(lower(au.raw_user_meta_data->>'role'), ''), 'student'),
  COALESCE(au.created_at, NOW())
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.users e
    WHERE lower(e.email) = lower(au.email)
  );

-- 3) Trigger function: create profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_role text;
BEGIN
  resolved_role := COALESCE(NULLIF(lower(NEW.raw_user_meta_data->>'role'), ''), 'student');

  IF resolved_role NOT IN ('student', 'instructor', 'admin') THEN
    resolved_role := 'student';
  END IF;

  -- If id exists, update profile fields.
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    UPDATE public.users
    SET
      email = NEW.email,
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
      role = COALESCE(NULLIF(lower(NEW.raw_user_meta_data->>'role'), ''), role)
    WHERE id = NEW.id;

    RETURN NEW;
  END IF;

  -- If same email already exists under another id, keep existing row to avoid FK breaks.
  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = lower(NEW.email)) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (id, email, full_name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    resolved_role,
    COALESCE(NEW.created_at, NOW())
  );

  RETURN NEW;
END;
$$;

-- 4) Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user_profile();

COMMIT;
