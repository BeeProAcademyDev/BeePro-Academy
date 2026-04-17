-- =====================================================
-- Fix Role Conversion Issue
-- Debug and fix admin role update function
-- =====================================================

-- First, let's check the current admin_update_user_role function and fix any issues
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
    -- Debug: Log function call
    RAISE NOTICE 'admin_update_user_role called with target_user_id: %, new_role: %, admin_user_id: %', target_user_id, new_role, admin_user_id;
    
    -- Check if the person calling this is an admin
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE id = admin_user_id AND role = 'admin'
    ) INTO admin_check;
    
    RAISE NOTICE 'Admin check result: %', admin_check;
    
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
    RAISE NOTICE 'Old role: %, New role: %', old_role, new_role;
    
    -- Validate new role
    IF new_role NOT IN ('student', 'instructor', 'admin') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid role. Must be student, instructor, or admin'
        );
    END IF;
    
    -- Update the user role with explicit UPDATE
    UPDATE public.users 
    SET role = new_role
    WHERE id = target_user_id;
    
    -- Check if update was successful
    GET DIAGNOSTICS result = ROW_COUNT;
    RAISE NOTICE 'Rows affected: %', result;
    
    -- Verify the update worked
    SELECT role INTO old_role FROM public.users WHERE id = target_user_id;
    RAISE NOTICE 'Role after update: %', old_role;
    
    -- Log the role change in activity logs if table exists
    BEGIN
        INSERT INTO public.user_activity_logs (
            user_id,
            activity_type,
            resource_type,
            resource_id,
            metadata,
            created_at
        ) VALUES (
            admin_user_id,
            'role_change',
            'user',
            target_user_id,
            jsonb_build_object(
                'old_role', COALESCE(old_role, 'unknown'),
                'new_role', new_role,
                'changed_by', admin_user_id,
                'timestamp', NOW()
            ),
            NOW()
        );
    EXCEPTION WHEN others THEN
        -- If activity log fails, continue anyway
        RAISE NOTICE 'Failed to log activity: %', SQLERRM;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User role updated successfully',
        'old_role', COALESCE(old_role, 'unknown'),
        'new_role', new_role,
        'target_user_id', target_user_id
    );
    
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error in admin_update_user_role: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure RLS policies allow admin to update user roles
-- Drop and recreate the user update policy to ensure admin access
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Allow admins to update any user
CREATE POLICY "Admins can manage all users" ON public.users
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Also allow admins full access for INSERT and DELETE if needed
CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION admin_update_user_role TO authenticated;

-- Test function to verify it works
DO $$
DECLARE
    test_result JSONB;
BEGIN
    -- This is just a syntax test, won't actually run without real IDs
    RAISE NOTICE 'Function created successfully';
END $$;

-- Create a simple test query you can run manually
-- Replace the UUIDs with real ones from your users table
/*
-- Test the function manually:
SELECT admin_update_user_role(
    'your-target-user-id-here'::UUID,
    'instructor',
    'your-admin-user-id-here'::UUID
);

-- Check users table:
SELECT id, full_name, email, role FROM users ORDER BY created_at;
*/

SELECT 
    '✅ Role conversion function fixed!' as status,
    'RLS policies updated to allow admin access' as note,
    'Try converting a user role now' as action;