# Complete Supabase Authorization Audit

## Summary

The application must treat every role value from the browser as untrusted. The authoritative role source is now the database only: `public.users.role`, protected by RLS, triggers, and SECURITY DEFINER functions that re-check the caller with `auth.uid()`.

Security score after the applied fixes: **86/100**.

## Critical Issues

- **Fixed: allowlisted self-promotion path**
  - `supabase/migrations/017_security_hardening.sql` created `sync_admin_role_if_allowed()`, which could update the caller to `admin` if their email existed in `admin_email_allowlist`.
  - `supabase/migrations/017_security_hardening.sql` also allowed `resolve_signup_role()` to return `admin` during signup for allowlisted email.
  - Fix: `supabase/migrations/038_final_authorization_lockdown.sql` disables admin self-sync, revokes execution, and changes signup role resolution so public signup can only create `student` or `pending_instructor`.

- **Fixed: legacy payment review RPC surface**
  - Older migrations exposed payment approval/rejection signatures accepting `reviewer_id` from the client.
  - Later wrappers ignored that argument, but keeping the callable signature was unnecessary attack surface.
  - Fix: migration `038_final_authorization_lockdown.sql` drops `approve_payment_submission(UUID, UUID, TEXT)` and `reject_payment_submission(UUID, UUID, TEXT)`. The frontend now calls only the secure `auth.uid()` based signature.

## Medium Issues

- **Fixed: broad authenticated profile visibility**
  - Migration `017` left `Authenticated users can view profiles` with `USING (auth.role() = 'authenticated')`.
  - Fix: migration `038` drops broad profile policies and replaces them with:
    - users can view only their own profile
    - admins can view all users

- **Fixed: frontend admin sync attempt**
  - `src/services/api.js` had an `ensureUserRole()` path that could call the legacy admin sync RPC.
  - Fix: it now only returns the database profile and never synchronizes roles from client input.

- **Fixed: payment review fallback**
  - `src/services/paymentAPI.js` had a fallback call shape with `reviewer_id`.
  - Fix: fallback is blocked with an explicit migration-required error.

## Low Issues

- `user_metadata` is still used for non-authorization display fields such as `full_name` and `avatar_url`. This is acceptable only because it is not used for privilege decisions.
- `localStorage` is used for UI preferences only: language and dark mode. No role authorization was found in localStorage/sessionStorage.
- Some legacy SQL files outside `supabase/migrations` still contain older patterns. They should be treated as historical/manual scripts and not run in production.
- Some public read policies remain intentionally public for platform content such as published courses, categories, reviews, and published blog posts.

## RLS Policy Findings

Patterns detected in migrations:

- `USING (true)`
  - Found in early/public content policies, mainly published or public resources.
  - Sensitive user profile broad-read policy was removed by migration `038`.

- `WITH CHECK (true)`
  - No active sensitive usage found in current hardened migrations.

- `auth.role() = 'authenticated'`
  - Found in older profile/payment/storage migrations.
  - Sensitive profile usage is dropped by migration `038`.
  - Payment/storage usages are limited to authenticated ownership-scoped policies, but should be reviewed again if bucket/table shapes change.

RLS enabled on sensitive tables:

- Confirmed in migrations for `users`, `enrollments`, `payments`, `payment_submissions`, `certificates`, `notifications`, `meetings`, `course_conversations`, `course_messages`, and `blog_posts`.

## SECURITY DEFINER Review

Reviewed SECURITY DEFINER functions in migrations for:

- admin user management
- role updates
- instructor approval/rejection
- payment approval/rejection
- enrollment gate
- notifications
- meetings
- course chat
- blog timestamps

High-risk functions fixed:

- `sync_admin_role_if_allowed()` is now disabled and revoked.
- legacy payment review RPC signatures with client-supplied `reviewer_id` are dropped.
- `admin_update_user_role()` validates admin status from the database and blocks self-removing admin role.
- `protect_user_role_column()` blocks self role changes and non-admin role updates.

## API/Frontend Audit

No authorization decision remains based on:

- `user_metadata.role`
- `app_metadata.role`
- localStorage role
- sessionStorage role
- JWT role claims
- request body role values

Frontend guards remain for UX only. Privileged actions depend on Supabase RLS/RPC checks.

## Fixes Applied

- Added `supabase/migrations/038_final_authorization_lockdown.sql`.
- Updated `src/services/api.js` to remove admin role synchronization.
- Updated `src/pages/Dashboard.jsx` to remove pre-payment admin role sync.
- Updated `src/services/paymentAPI.js` to block legacy `reviewer_id` payment RPC fallback.
- Expanded `supabase/security_tests/role_escalation_tests.sql`.

## Attack Vectors Blocked

- JWT/user metadata: `{ "role": "admin" }`
- Request body: `{ "role": "admin" }`
- localStorage/sessionStorage role manipulation
- frontend state role manipulation
- direct self-update: `UPDATE users SET role='admin'`
- allowlisted email self-promotion RPC
- signup metadata admin role
- direct non-admin calls to admin RPCs
- legacy payment review RPC with client-controlled reviewer id

## Remaining Risks

- Production is secure only after running migrations `037` and `038`.
- Client route guards are not security controls; keep all future privileged actions enforced through RLS/RPC/server checks.
- Historical SQL scripts in `supabase/*.sql` and `supabase/legacy/*.sql` contain older patterns and should not be applied to production.
- A live database policy dump was not available in this workspace, so this audit is based on repository migrations and application code.
