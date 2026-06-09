-- =====================================================
-- Fix admin access for admin@bepro.academy
-- Run in Supabase Dashboard → SQL Editor
-- =====================================================
--
-- IMPORTANT: Login uses Supabase AUTH, not only public.users.
-- If sign-in says "Invalid login credentials", create the auth user first:
--
--   1. Supabase Dashboard → Authentication → Users → Add user
--   2. Email: admin@beepro.academy
--   3. Password: your chosen password (e.g. AdminPassword123!)
--   4. Check "Auto confirm user"
--   5. Save, then run this SQL script
--
-- Or reset password: Authentication → Users → admin@beepro.academy → Send password recovery
--
-- If admin_email_allowlist does not exist, run
-- deploy-production-migrations-015-034.sql (or migration 017) first.

INSERT INTO public.admin_email_allowlist (email)
VALUES ('admin@bepro.academy')
ON CONFLICT (email) DO NOTHING;

-- Ensure profile row exists for auth user (trigger may have skipped)
INSERT INTO public.users (id, email, full_name, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1), 'Admin'),
  'admin'
FROM auth.users au
WHERE lower(au.email) = 'admin@bepro.academy'
ON CONFLICT (id) DO UPDATE
SET
  role = 'admin',
  email = EXCLUDED.email;

UPDATE public.users
SET role = 'admin',
    email = 'admin@bepro.academy'
WHERE id IN (
  SELECT id FROM auth.users WHERE lower(email) = 'admin@bepro.academy'
)
OR lower(email) = 'admin@bepro.academy';

-- Verify auth user exists (required for login)
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE lower(email) = 'admin@bepro.academy';

SELECT id, email, role, full_name
FROM public.users
WHERE lower(email) = 'admin@bepro.academy'
   OR id IN (SELECT id FROM auth.users WHERE lower(email) = 'admin@bepro.academy');
