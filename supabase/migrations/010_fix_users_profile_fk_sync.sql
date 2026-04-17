-- =====================================================
-- Fix users/profile sync to prevent payment_submissions student FK failures
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated user to create own profile row
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() = id
);

-- Keep update policy aligned (already exists in many environments)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Backfill missing public.users rows from auth.users
INSERT INTO public.users (id, email, full_name, role)
SELECT
  au.id,
  au.email,
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

-- Auto-create profile row on new auth user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
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
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_profile();

SELECT '010_fix_users_profile_fk_sync applied' AS message;