-- Create Admin Account Script
-- This script helps you create or update an admin account

-- Method 1: Update an existing user to admin role
-- Replace 'your-email@example.com' with your actual email
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Method 2: Create a new admin user in the users table (if they registered via auth)
-- First, check if the user exists in auth.users but not in public.users
SELECT 'Checking for auth users not in public.users...' as info;

-- Insert auth users into public.users if they don't exist
INSERT INTO public.users (id, full_name, email, role, created_at)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    au.email,
    'admin',  -- Set as admin
    au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL 
AND au.email = 'admin@bepro-academy.com';  -- Replace with your email

-- Method 3: Check current admin users
SELECT 'Current admin users:' as info;
SELECT id, full_name, email, role, created_at 
FROM public.users 
WHERE role = 'admin' 
ORDER BY created_at DESC;

-- Method 4: Create test admin account (manual entry)
-- Only use this if you want to create a test account
-- Note: This creates a user in public.users but they still need to register via Supabase Auth

-- INSERT INTO public.users (id, full_name, email, role, created_at)
-- VALUES (
--     gen_random_uuid(),
--     'Admin User', 
--     'admin@bepro-academy.com',
--     'admin',
--     NOW()
-- );

-- Success message
SELECT '✅ Admin account setup complete! 

To use admin features:
1. Register/Login at http://localhost:5173/auth with your email
2. Your account should now have admin role
3. Access admin panel at http://localhost:5173/admin

If you need to reset password, use Supabase Auth interface or "Forgot Password" feature.' as instructions;