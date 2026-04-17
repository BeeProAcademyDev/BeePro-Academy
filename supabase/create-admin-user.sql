-- =====================================================
-- Create Test Admin User for BePro Academy
-- =====================================================

-- Insert admin user into auth.users (Supabase Auth table)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@bepro.academy',
    crypt('AdminPassword123!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "BePro Admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Get the user ID we just created
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@bepro.academy';
    
    -- Insert admin user into public.users table
    INSERT INTO public.users (
        id,
        full_name,
        email,
        role,
        created_at
    ) VALUES (
        admin_user_id,
        'BePro Admin',
        'admin@bepro.academy',
        'admin',
        NOW()
    );
    
    RAISE NOTICE 'Admin user created successfully with ID: %', admin_user_id;
END $$;

-- Display admin credentials
SELECT 
    '✅ Admin user created successfully!' as status,
    'admin@bepro.academy' as email,
    'AdminPassword123!' as password,
    'Use these credentials to log in as admin' as note;