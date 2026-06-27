-- =====================================================
-- Emergency admin rotation for compromised account
-- =====================================================
-- Run this in Supabase Dashboard -> SQL Editor.
--
-- This script disables the compromised admin email:
--   admin@beepro.academy
--
-- To add the new admin:
--   1. Supabase Dashboard -> Authentication -> Users -> Add user
--   2. Enter the NEW admin email and a strong NEW password
--   3. Enable/choose "Auto confirm user"
--   4. Run this script
--
-- Do not put the real password in source control.

BEGIN;

CREATE TEMP TABLE admin_rotation_settings (
  compromised_email text NOT NULL,
  new_admin_email text NOT NULL
) ON COMMIT DROP;

INSERT INTO admin_rotation_settings (compromised_email, new_admin_email)
VALUES (
  'admin@beepro.academy',
  'admin63@beepro-academy.com'
);

DO $$
DECLARE
  compromised_email text;
  new_admin_email text;
BEGIN
  SELECT lower(admin_rotation_settings.compromised_email), lower(admin_rotation_settings.new_admin_email)
  INTO compromised_email, new_admin_email
  FROM admin_rotation_settings;

  IF new_admin_email = compromised_email THEN
    RAISE EXCEPTION 'The new admin email must be different from the compromised email.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = new_admin_email
  ) THEN
    RAISE EXCEPTION 'Create and auto-confirm the new admin user in Supabase Authentication before running this script.';
  END IF;
END $$;

-- SQL Editor runs without auth.uid(), so the app-facing role-protection
-- trigger must be paused for this controlled service-role rotation only.
ALTER TABLE public.users DISABLE TRIGGER trigger_protect_user_role;

-- 1) Remove the compromised email from the admin allowlist.
DELETE FROM public.admin_email_allowlist
WHERE lower(email) = (SELECT lower(compromised_email) FROM admin_rotation_settings);

-- 2) Remove admin role from the public profile for the compromised account.
UPDATE public.users
SET role = 'student'
WHERE lower(email) = (SELECT lower(compromised_email) FROM admin_rotation_settings)
  AND role = 'admin';

-- 3) Ban the compromised auth user and revoke active sessions when possible.
DO $$
DECLARE
  compromised_user_ids uuid[];
  compromised_email text;
BEGIN
  SELECT lower(admin_rotation_settings.compromised_email)
  INTO compromised_email
  FROM admin_rotation_settings;

  SELECT array_agg(id)
  INTO compromised_user_ids
  FROM auth.users
  WHERE lower(email) = compromised_email;

  IF compromised_user_ids IS NULL THEN
    RETURN;
  END IF;

  UPDATE auth.users
  SET
    banned_until = '2999-12-31 23:59:59+00',
    updated_at = now()
  WHERE id = ANY(compromised_user_ids);

  IF to_regclass('auth.refresh_tokens') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'auth'
         AND table_name = 'refresh_tokens'
         AND column_name = 'user_id'
     )
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'auth'
         AND table_name = 'refresh_tokens'
         AND column_name = 'revoked'
     )
  THEN
    EXECUTE 'UPDATE auth.refresh_tokens SET revoked = true WHERE user_id = ANY($1)'
    USING compromised_user_ids;
  END IF;

  IF to_regclass('auth.sessions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM auth.sessions WHERE user_id = ANY($1)'
    USING compromised_user_ids;
  END IF;
END $$;

-- 4) Promote the new dashboard-created auth user to admin.
INSERT INTO public.admin_email_allowlist (email)
SELECT lower(email)
FROM auth.users
WHERE lower(email) = (SELECT lower(new_admin_email) FROM admin_rotation_settings)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, full_name, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1), 'Admin'),
  'admin'
FROM auth.users au
WHERE lower(au.email) = (SELECT lower(new_admin_email) FROM admin_rotation_settings)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
  role = 'admin';

ALTER TABLE public.users ENABLE TRIGGER trigger_protect_user_role;

-- Verification: the first result should show no admin role for the old email.
SELECT id, email, role
FROM public.users
WHERE lower(email) IN (
  (SELECT lower(compromised_email) FROM admin_rotation_settings),
  (SELECT lower(new_admin_email) FROM admin_rotation_settings)
)
ORDER BY email;

SELECT id, email, banned_until, email_confirmed_at
FROM auth.users
WHERE lower(email) IN (
  (SELECT lower(compromised_email) FROM admin_rotation_settings),
  (SELECT lower(new_admin_email) FROM admin_rotation_settings)
)
ORDER BY email;

COMMIT;
