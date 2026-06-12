-- =====================================================
-- BePro Academy - Role Approval System
-- Migration: 016_role_approval_system.sql
-- Adds pending_instructor role for teacher signup approval
-- =====================================================

-- 1) Extend allowed roles
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('student', 'pending_instructor', 'instructor', 'admin'));

-- 2) Update auth profile trigger: instructor signups become pending_instructor
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    resolved_role TEXT;
BEGIN
    resolved_role := CASE
        WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
        WHEN NEW.raw_user_meta_data->>'role' = 'pending_instructor' THEN 'pending_instructor'
        WHEN NEW.raw_user_meta_data->>'role' IN ('instructor', 'teacher') THEN 'pending_instructor'
        WHEN NEW.raw_user_meta_data->>'role' = 'student' THEN 'student'
        ELSE 'student'
    END;

    BEGIN
        INSERT INTO public.users (id, email, full_name, role)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(
                NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
                split_part(NEW.email, '@', 1),
                'Student'
            ),
            resolved_role
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION
        WHEN unique_violation THEN
            NULL;
    END;

    RETURN NEW;
END;
$$;

-- 3) Admin role update function supports pending_instructor
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    target_user_id UUID,
    new_role TEXT,
    admin_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = admin_user_id AND users.role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    IF new_role NOT IN ('student', 'pending_instructor', 'instructor', 'admin') THEN
        RETURN '{"success": false, "error": "Invalid role specified."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = target_user_id
    ) THEN
        RETURN '{"success": false, "error": "Target user not found."}'::JSON;
    END IF;

    IF target_user_id = admin_user_id AND new_role != 'admin' THEN
        RETURN '{"success": false, "error": "Cannot change your own admin role."}'::JSON;
    END IF;

    UPDATE public.users
    SET role = new_role
    WHERE id = target_user_id;

    RETURN '{"success": true, "message": "User role updated successfully."}'::JSON;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Approve instructor application
CREATE OR REPLACE FUNCTION public.admin_approve_instructor(
    target_user_id UUID,
    admin_user_id UUID
)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = admin_user_id AND users.role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = target_user_id AND role = 'pending_instructor'
    ) THEN
        RETURN '{"success": false, "error": "User is not pending instructor approval."}'::JSON;
    END IF;

    UPDATE public.users
    SET role = 'instructor'
    WHERE id = target_user_id;

    RETURN '{"success": true, "message": "Instructor approved successfully."}'::JSON;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Reject instructor application
CREATE OR REPLACE FUNCTION public.admin_reject_instructor(
    target_user_id UUID,
    admin_user_id UUID
)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = admin_user_id AND users.role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = target_user_id AND role = 'pending_instructor'
    ) THEN
        RETURN '{"success": false, "error": "User is not pending instructor approval."}'::JSON;
    END IF;

    UPDATE public.users
    SET role = 'student'
    WHERE id = target_user_id;

    RETURN '{"success": true, "message": "Instructor application rejected."}'::JSON;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_approve_instructor(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_instructor(UUID, UUID) TO authenticated;

SELECT '016_role_approval_system applied' AS message;
