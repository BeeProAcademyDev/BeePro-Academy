-- Fix Admin Functions - Drop and Recreate
-- This script safely handles existing function conflicts

-- First, drop all existing admin functions that might conflict
DROP FUNCTION IF EXISTS admin_get_all_users(uuid);
DROP FUNCTION IF EXISTS admin_get_all_users();
DROP FUNCTION IF EXISTS admin_update_user_role(uuid, text, uuid);
DROP FUNCTION IF EXISTS admin_get_user_details(uuid, uuid);
DROP FUNCTION IF EXISTS admin_get_platform_stats(uuid);
DROP FUNCTION IF EXISTS create_first_admin(text, text, text);

-- Now create the correct functions
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
    -- Verify admin role
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = admin_user_id AND users.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    -- Return all users with their stats
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.avatar_url,
        u.created_at,
        COALESCE(courses_count.total, 0) as total_courses,
        COALESCE(enrollments_count.total, 0) as total_enrollments
    FROM public.users u
    LEFT JOIN (
        SELECT instructor_id, COUNT(*) as total
        FROM public.courses
        GROUP BY instructor_id
    ) courses_count ON u.id = courses_count.instructor_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as total
        FROM public.enrollments
        GROUP BY user_id
    ) enrollments_count ON u.id = enrollments_count.user_id
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
DECLARE
    result JSON;
BEGIN
    -- Verify admin role
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = admin_user_id AND users.role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    -- Validate new role
    IF new_role NOT IN ('student', 'instructor', 'admin') THEN
        RETURN '{"success": false, "error": "Invalid role specified."}'::JSON;
    END IF;

    -- Check if target user exists
    IF NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = target_user_id
    ) THEN
        RETURN '{"success": false, "error": "Target user not found."}'::JSON;
    END IF;

    -- Prevent admin from changing their own role to non-admin
    IF target_user_id = admin_user_id AND new_role != 'admin' THEN
        RETURN '{"success": false, "error": "Cannot change your own admin role."}'::JSON;
    END IF;

    -- Update the user role
    UPDATE public.users 
    SET role = new_role 
    WHERE id = target_user_id;

    -- Return success
    RETURN '{"success": true, "message": "User role updated successfully."}'::JSON;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get platform statistics (admin only)
CREATE OR REPLACE FUNCTION admin_get_platform_stats(admin_user_id UUID)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    -- Verify admin role
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = admin_user_id AND users.role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    SELECT json_build_object(
        'success', true,
        'total_users', (SELECT COUNT(*) FROM public.users),
        'total_students', (SELECT COUNT(*) FROM public.users WHERE role = 'student'),
        'total_instructors', (SELECT COUNT(*) FROM public.users WHERE role = 'instructor'),
        'total_admins', (SELECT COUNT(*) FROM public.users WHERE role = 'admin'),
        'total_courses', (SELECT COUNT(*) FROM public.courses),
        'total_enrollments', (SELECT COUNT(*) FROM public.enrollments),
        'recent_registrations', (
            SELECT json_agg(
                json_build_object(
                    'id', id,
                    'full_name', full_name,
                    'email', email,
                    'role', role,
                    'created_at', created_at
                )
            )
            FROM public.users 
            ORDER BY created_at DESC 
            LIMIT 10
        )
    ) INTO stats;

    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin user if none exists
CREATE OR REPLACE FUNCTION create_first_admin(
    admin_email TEXT,
    admin_name TEXT,
    admin_password TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    admin_count INTEGER;
    new_admin_id UUID;
BEGIN
    -- Check if any admin exists
    SELECT COUNT(*) INTO admin_count FROM public.users WHERE role = 'admin';
    
    IF admin_count > 0 THEN
        RETURN '{"success": false, "error": "Admin user already exists."}'::JSON;
    END IF;

    -- Create the first admin user
    INSERT INTO public.users (full_name, email, role)
    VALUES (admin_name, admin_email, 'admin')
    RETURNING id INTO new_admin_id;

    RETURN json_build_object(
        'success', true,
        'message', 'First admin user created successfully.',
        'admin_id', new_admin_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION admin_get_all_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user_role(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_platform_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_first_admin(TEXT, TEXT, TEXT) TO authenticated;

-- Success message
SELECT '✅ Admin Functions Fixed Successfully! All new registrations will now appear in the admin panel.' as message;