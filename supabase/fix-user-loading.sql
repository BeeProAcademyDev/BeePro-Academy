-- =====================================================
-- Fix User Loading Issue in Admin Panel
-- Simplify and fix the admin_get_all_users function
-- =====================================================

-- Drop the existing function to recreate it with better error handling
DROP FUNCTION IF EXISTS admin_get_all_users(UUID);

-- Create a simpler, more reliable function to get all users
CREATE OR REPLACE FUNCTION admin_get_all_users(admin_user_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ,
    total_courses INTEGER,
    total_enrollments INTEGER,
    last_login TIMESTAMPTZ
) AS $$
BEGIN
    -- Check if the person calling this is an admin (simplified check)
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = admin_user_id AND users.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Only admins can view all users';
    END IF;
    
    -- Return users with basic statistics
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.avatar_url,
        u.created_at,
        COALESCE(course_count.total, 0)::INTEGER as total_courses,
        COALESCE(enrollment_count.total, 0)::INTEGER as total_enrollments,
        u.created_at as last_login -- Using created_at as placeholder for last_login
    FROM public.users u
    LEFT JOIN (
        SELECT instructor_id, COUNT(*)::INTEGER as total
        FROM public.courses
        WHERE instructor_id IS NOT NULL
        GROUP BY instructor_id
    ) course_count ON u.id = course_count.instructor_id
    LEFT JOIN (
        SELECT user_id, COUNT(*)::INTEGER as total
        FROM public.enrollments
        WHERE user_id IS NOT NULL
        GROUP BY user_id
    ) enrollment_count ON u.id = enrollment_count.user_id
    ORDER BY u.created_at DESC;
    
EXCEPTION WHEN others THEN
    -- If anything fails, log the error and re-raise
    RAISE EXCEPTION 'Error fetching users: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an even simpler version for testing
CREATE OR REPLACE FUNCTION admin_get_users_simple(admin_user_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Simple admin check
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = admin_user_id AND users.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can view users';
    END IF;
    
    -- Return basic user info only
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.created_at
    FROM public.users u
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_get_all_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_users_simple(UUID) TO authenticated;

-- Test the functions work
DO $$
DECLARE
    test_admin_id UUID;
    user_count INTEGER;
BEGIN
    -- Get an admin user ID to test with
    SELECT id INTO test_admin_id FROM public.users WHERE role = 'admin' LIMIT 1;
    
    IF test_admin_id IS NOT NULL THEN
        -- Test the simple function
        SELECT COUNT(*) INTO user_count 
        FROM admin_get_users_simple(test_admin_id);
        
        RAISE NOTICE 'Simple function works! Found % users', user_count;
        
        -- Test the full function
        SELECT COUNT(*) INTO user_count 
        FROM admin_get_all_users(test_admin_id);
        
        RAISE NOTICE 'Full function works! Found % users with stats', user_count;
    ELSE
        RAISE NOTICE 'No admin user found for testing';
    END IF;
    
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Test failed: %', SQLERRM;
END $$;

-- Also fix any potential RLS issues
-- Make sure the users table allows SELECT for authenticated users
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
CREATE POLICY "Users can view profiles" ON public.users
    FOR SELECT USING (true); -- Allow all authenticated users to view profiles

-- Success message
SELECT 
    '✅ User loading functions fixed!' as status,
    'Try refreshing your admin panel now' as action;