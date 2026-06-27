-- Production security audit queries.
-- Safe to run: read-only checks, no data changes.

-- Current admin accounts.
SELECT
  id,
  email,
  role,
  CASE
    WHEN to_regclass('public.users') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'users'
         AND column_name = 'is_suspended'
     )
    THEN to_jsonb(u)->>'is_suspended'
    ELSE 'column_missing'
  END AS is_suspended,
  created_at
FROM public.users u
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Admin allowlist.
SELECT email
FROM public.admin_email_allowlist
ORDER BY email;

-- Recently created users, useful after an incident.
SELECT
  id,
  email,
  role,
  CASE
    WHEN EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'users'
         AND column_name = 'is_suspended'
     )
    THEN to_jsonb(u)->>'is_suspended'
    ELSE 'column_missing'
  END AS is_suspended,
  created_at
FROM public.users u
ORDER BY created_at DESC
LIMIT 50;

-- Legacy RPCs that should not exist after migration 047.
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'admin_get_users_simple',
    'create_first_admin'
  )
ORDER BY function_name, args;

-- Admin RPC signatures: secure versions should not accept admin_user_id.
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'admin_%'
ORDER BY function_name, args;

-- Public tables with RLS disabled.
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- Role-protection trigger must be present.
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'users'
  AND trigger_name = 'trigger_protect_user_role';

-- Suspended users.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'is_suspended'
  ) THEN
    RAISE NOTICE 'is_suspended column exists. Run: SELECT id, email, role, is_suspended, created_at FROM public.users WHERE is_suspended = true ORDER BY created_at DESC;';
  ELSE
    RAISE NOTICE 'is_suspended column is missing. Run migration 046_admin_user_block_delete.sql if you need suspend/block support.';
  END IF;
END $$;
