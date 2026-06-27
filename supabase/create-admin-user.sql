-- =====================================================
-- Admin Account Setup (SECURE)
-- Do NOT hardcode passwords in source control.
-- =====================================================

-- Step 1: Register admin via Supabase Dashboard → Authentication → Add user
--         OR use: supabase auth signup with your chosen password

-- Step 2: Add admin email to server allowlist
INSERT INTO public.admin_email_allowlist (email)
VALUES ('admin63@beepro-academy.com')  -- Replace with your admin email
ON CONFLICT (email) DO NOTHING;

-- Step 3: Promote existing auth user to admin profile
UPDATE public.users
SET role = 'admin'
WHERE lower(email) = lower('admin63@beepro-academy.com');  -- Replace with your admin email

-- Step 4: Verify
SELECT id, full_name, email, role, created_at
FROM public.users
WHERE role = 'admin'
ORDER BY created_at DESC;

SELECT 'Admin setup complete. Use Dashboard-created credentials to sign in.' AS message;
