-- 035: Store signup phone numbers for CRM contact actions.
-- This is app profile data only. It is not used for Supabase phone auth,
-- OTP, email confirmation, or account activation.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
