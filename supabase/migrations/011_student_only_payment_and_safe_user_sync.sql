-- =====================================================
-- 011: Student-only payment + safe users sync without email conflicts
-- =====================================================

-- 1) Enforce payment submissions INSERT for students only
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can create payment submissions" ON public.payment_submissions;
DROP POLICY IF EXISTS "Students create payment submissions" ON public.payment_submissions;

CREATE POLICY "Students can create payment submissions"
ON public.payment_submissions
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND student_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'student'
  )
);

-- 2) Allow authenticated users to insert only their own profile row
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() = id
);

-- 3) Safe backfill: skip rows if same email already exists in public.users
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
WHERE pu.id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.users ue
    WHERE lower(ue.email) = lower(au.email)
  );

-- 4) Trigger for new auth users with duplicate-email protection
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  EXCEPTION
    WHEN unique_violation THEN
      -- Email already exists in public.users for a different id.
      -- Keep auth account creation successful and skip profile insert.
      NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_profile();

SELECT '011_student_only_payment_and_safe_user_sync applied' AS message;