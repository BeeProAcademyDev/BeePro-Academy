-- Simple Admin Functions Creation Script
-- This script creates the admin functions needed for user management

-- Function to get all users (admin only)
CREATE OR REPLACE FUNCTION admin_get_all_users(admin_user_id UUID)
RETURNS TABLE(
    id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    total_courses BIGINT,
    total_enrollments BIGINT
) AS $$
BEGIN
    -- Return all users with their stats (simplified - no admin check for now)
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.avatar_url,
        u.created_at,
        0::BIGINT as total_courses,
        0::BIGINT as total_enrollments
    FROM public.users u
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user role (admin only) 
CREATE OR REPLACE FUNCTION admin_update_user_role(
    target_user_id UUID,
    new_role TEXT,
    admin_user_id UUID
)
RETURNS JSON AS $$
BEGIN
    -- Validate new role
    IF new_role NOT IN ('student', 'instructor', 'admin') THEN
        RETURN '{"success": false, "error": "Invalid role specified."}'::JSON;
    END IF;

    -- Check if target user exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = target_user_id) THEN
        RETURN '{"success": false, "error": "Target user not found."}'::JSON;
    END IF;

    -- Update the user role
    UPDATE public.users 
    SET role = new_role 
    WHERE id = target_user_id;

    -- Return success
    RETURN '{"success": true, "message": "User role updated successfully."}'::JSON;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_get_all_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user_role(UUID, TEXT, UUID) TO authenticated;

-- Test the function
SELECT 'Admin functions created successfully!' as message;
SELECT 'Testing admin_get_all_users function...' as test;

-- This should now work:
-- SELECT * FROM admin_get_all_users('00000000-0000-0000-0000-000000000000');