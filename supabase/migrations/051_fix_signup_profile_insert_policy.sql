-- Migration 048 dropped all legacy INSERT policies on public.users but never
-- re-created one for new signups. Without this policy, syncSignupUserProfile()
-- cannot insert the profile row after Supabase Auth creates the auth.users entry.

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
