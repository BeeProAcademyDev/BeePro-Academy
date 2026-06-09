-- =====================================================
-- Fix admin access for admin@beepro.academy
-- Run in Supabase Dashboard → SQL Editor
-- =====================================================
-- If admin_email_allowlist does not exist, run
-- deploy-production-migrations-015-034.sql (or migration 017) first.

INSERT INTO public.admin_email_allowlist (email)
VALUES ('admin@bepro.academy')
ON CONFLICT (email) DO NOTHING;

UPDATE public.users
SET role = 'admin',
    email = 'admin@bepro.academy'
WHERE id IN (
  SELECT id FROM auth.users WHERE lower(email) = 'admin@bepro.academy'
)
OR lower(email) = 'admin@bepro.academy';

SELECT id, email, role, full_name
FROM public.users
WHERE lower(email) = 'admin@bepro.academy'
   OR id IN (SELECT id FROM auth.users WHERE lower(email) = 'admin@bepro.academy');
