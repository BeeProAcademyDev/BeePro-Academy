-- =====================================================
-- 012: Fix profile creation failures caused by users.email unique conflicts
-- =====================================================

-- Context:
-- Some auth users may not have a matching public.users row by id.
-- Creating the row can fail if the same email already exists in public.users for another id.
-- This patch ensures missing profiles are still created with a deterministic fallback email.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Ensure authenticated user can create own profile row
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() = id
);

-- Backfill missing profiles from auth.users with conflict-safe email strategy
INSERT INTO public.users (id, email, full_name, role)
SELECT
  au.id,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.users ue
      WHERE lower(ue.email) = lower(au.email)
        AND ue.id <> au.id
    )
      THEN 'user-' || au.id::text || '@profile.local'
    ELSE au.email
  END AS email,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    split_part(au.email, '@', 1),
    'Student'
  ) AS full_name,
  CASE
    WHEN au.raw_user_meta_data->>'role' IN ('student', 'instructor', 'admin')
      THEN au.raw_user_meta_data->>'role'
    ELSE 'student'
  END AS role
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;

-- Keep auto-profile trigger conflict-safe
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desired_email text;
BEGIN
  desired_email := NEW.email;

  IF EXISTS (
    SELECT 1
    FROM public.users ue
    WHERE lower(ue.email) = lower(NEW.email)
      AND ue.id <> NEW.id
  ) THEN
    desired_email := 'user-' || NEW.id::text || '@profile.local';
  END IF;

  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    desired_email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      split_part(NEW.email, '@', 1),
      'Student'
    ),
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('student', 'instructor', 'admin')
        THEN NEW.raw_user_meta_data->>'role'
      ELSE 'student'
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_profile();

SELECT '012_fix_profile_creation_email_conflicts applied' AS message;