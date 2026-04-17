-- =====================================================
-- Admin User Management System for BePro Academy
-- Allows admins to manage users and convert roles
-- =====================================================

-- Function for admins to update user roles
CREATE OR REPLACE FUNCTION admin_update_user_role(
    target_user_id UUID,
    new_role TEXT,
    admin_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    admin_check BOOLEAN;
    user_exists BOOLEAN;
    old_role TEXT;
    result JSONB;
BEGIN
    -- Check if the person calling this is an admin
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE id = admin_user_id AND role = 'admin'
    ) INTO admin_check;
    
    IF NOT admin_check THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only admins can update user roles'
        );
    END IF;
    
    -- Check if target user exists and get current role
    SELECT EXISTS(
        SELECT 1 FROM public.users WHERE id = target_user_id
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Get old role
    SELECT role INTO old_role FROM public.users WHERE id = target_user_id;
    
    -- Validate new role
    IF new_role NOT IN ('student', 'instructor', 'admin') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid role. Must be student, instructor, or admin'
        );
    END IF;
    
    -- Update the user role
    UPDATE public.users 
    SET role = new_role
    WHERE id = target_user_id;
    
    -- Log the role change
    INSERT INTO public.user_activity_logs (
        user_id,
        activity_type,
        resource_type,
        resource_id,
        metadata
    ) VALUES (
        admin_user_id,
        'role_change',
        'user',
        target_user_id,
        jsonb_build_object(
            'old_role', old_role,
            'new_role', new_role,
            'changed_by', admin_user_id
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User role updated successfully',
        'old_role', old_role,
        'new_role', new_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all users for admin dashboard
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
DECLARE
    admin_check BOOLEAN;
BEGIN
    -- Check if the person calling this is an admin
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE users.id = admin_user_id AND users.role = 'admin'
    ) INTO admin_check;
    
    IF NOT admin_check THEN
        RAISE EXCEPTION 'Only admins can view all users';
    END IF;
    
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.avatar_url,
        u.created_at,
        COALESCE(course_count.total, 0) as total_courses,
        COALESCE(enrollment_count.total, 0) as total_enrollments,
        u.created_at as last_login -- Placeholder - would need auth.users for real last login
    FROM public.users u
    LEFT JOIN (
        SELECT instructor_id, COUNT(*) as total
        FROM public.courses
        GROUP BY instructor_id
    ) course_count ON u.id = course_count.instructor_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as total
        FROM public.enrollments
        GROUP BY user_id
    ) enrollment_count ON u.id = enrollment_count.user_id
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user details for admin
CREATE OR REPLACE FUNCTION admin_get_user_details(
    target_user_id UUID,
    admin_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    admin_check BOOLEAN;
    user_data JSONB;
    courses_data JSONB;
    enrollments_data JSONB;
BEGIN
    -- Check if the person calling this is an admin
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE id = admin_user_id AND role = 'admin'
    ) INTO admin_check;
    
    IF NOT admin_check THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only admins can view user details'
        );
    END IF;
    
    -- Get user basic data
    SELECT to_jsonb(users.*) INTO user_data
    FROM public.users 
    WHERE id = target_user_id;
    
    IF user_data IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Get user's courses if they're an instructor
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', c.id,
            'title', c.title,
            'status', c.status,
            'created_at', c.created_at,
            'enrollments', (
                SELECT COUNT(*) FROM public.enrollments e WHERE e.course_id = c.id
            )
        )
    ), '[]'::jsonb) INTO courses_data
    FROM public.courses c
    WHERE c.instructor_id = target_user_id;
    
    -- Get user's enrollments if they're a student
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', e.id,
            'course_title', c.title,
            'progress', e.progress,
            'enrolled_at', e.enrolled_at,
            'instructor_name', u.full_name
        )
    ), '[]'::jsonb) INTO enrollments_data
    FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    JOIN public.users u ON u.id = c.instructor_id
    WHERE e.user_id = target_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'user', user_data,
        'courses', courses_data,
        'enrollments', enrollments_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suspend/activate user
CREATE OR REPLACE FUNCTION admin_toggle_user_status(
    target_user_id UUID,
    is_suspended BOOLEAN,
    admin_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    admin_check BOOLEAN;
BEGIN
    -- Check if the person calling this is an admin
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE id = admin_user_id AND role = 'admin'
    ) INTO admin_check;
    
    IF NOT admin_check THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only admins can suspend/activate users'
        );
    END IF;
    
    -- Add suspended column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='is_suspended'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Update user suspension status
    UPDATE public.users 
    SET is_suspended = toggle_user_status.is_suspended
    WHERE id = target_user_id;
    
    -- Log the action
    INSERT INTO public.user_activity_logs (
        user_id,
        activity_type,
        resource_type,
        resource_id,
        metadata
    ) VALUES (
        admin_user_id,
        CASE WHEN is_suspended THEN 'user_suspended' ELSE 'user_activated' END,
        'user',
        target_user_id,
        jsonb_build_object(
            'action_by', admin_user_id,
            'suspended', is_suspended
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', CASE 
            WHEN is_suspended THEN 'User suspended successfully'
            ELSE 'User activated successfully'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced RLS policies for admin access
-- Drop and recreate user policies to allow admin access
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
END $$;

-- New user policies with admin access
CREATE POLICY "Users can view profiles" ON public.users
    FOR SELECT USING (
        true -- Allow viewing all profiles, RLS will be handled by functions for sensitive operations
    );

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (
        auth.uid() = id OR
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Allow admins to insert/delete users
CREATE POLICY "Admins can manage users" ON public.users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Create view for admin dashboard statistics
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM public.users WHERE role = 'student') as total_students,
    (SELECT COUNT(*) FROM public.users WHERE role = 'instructor') as total_instructors,
    (SELECT COUNT(*) FROM public.users WHERE role = 'admin') as total_admins,
    (SELECT COUNT(*) FROM public.courses) as total_courses,
    (SELECT COUNT(*) FROM public.courses WHERE is_published = true) as published_courses,
    (SELECT COUNT(*) FROM public.enrollments) as total_enrollments,
    (SELECT COUNT(*) FROM public.enrollments WHERE enrolled_at > NOW() - INTERVAL '30 days') as recent_enrollments;

-- Grant access to admin functions
GRANT EXECUTE ON FUNCTION admin_update_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_users TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_details TO authenticated;
GRANT EXECUTE ON FUNCTION admin_toggle_user_status TO authenticated;

-- Success message
SELECT 
    '✅ Admin user management system created!' as status,
    'Admins can now manage users and convert roles' as message,
    'Functions: admin_update_user_role, admin_get_all_users, admin_get_user_details, admin_toggle_user_status' as functions;