-- Allow admins to suspend or remove platform users from the admin dashboard.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON public.users(is_suspended);

DROP FUNCTION IF EXISTS public.admin_get_all_users();

CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
    id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    total_courses BIGINT,
    total_enrollments BIGINT,
    is_suspended BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users WHERE users.id = caller_id AND users.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.avatar_url,
        u.created_at,
        COALESCE(courses_count.total, 0) AS total_courses,
        COALESCE(enrollments_count.total, 0) AS total_enrollments,
        COALESCE(u.is_suspended, FALSE) AS is_suspended
    FROM public.users u
    LEFT JOIN (
        SELECT instructor_id, COUNT(*) AS total
        FROM public.courses
        GROUP BY instructor_id
    ) courses_count ON u.id = courses_count.instructor_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) AS total
        FROM public.enrollments
        GROUP BY user_id
    ) enrollments_count ON u.id = enrollments_count.user_id
    ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_user_details(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
    user_info RECORD;
    courses_data JSON;
    enrollments_data JSON;
BEGIN
    IF caller_id IS NULL THEN
        RETURN '{"success": false, "error": "Not authenticated."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = caller_id AND role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    SELECT * INTO user_info FROM public.users WHERE id = target_user_id;

    IF user_info IS NULL THEN
        RETURN '{"success": false, "error": "User not found."}'::JSON;
    END IF;

    IF user_info.role = 'instructor' THEN
        SELECT json_agg(
            json_build_object(
                'id', c.id,
                'title', c.title,
                'status', 'published',
                'enrollments', COALESCE(e.enrollment_count, 0)
            )
        ) INTO courses_data
        FROM public.courses c
        LEFT JOIN (
            SELECT course_id, COUNT(*) AS enrollment_count
            FROM public.enrollments
            GROUP BY course_id
        ) e ON c.id = e.course_id
        WHERE c.instructor_id = target_user_id;
    END IF;

    IF user_info.role = 'student' THEN
        SELECT json_agg(
            json_build_object(
                'id', en.id,
                'course_title', c.title,
                'instructor_name', i.full_name,
                'progress', en.progress
            )
        ) INTO enrollments_data
        FROM public.enrollments en
        JOIN public.courses c ON c.id = en.course_id
        JOIN public.users i ON i.id = c.instructor_id
        WHERE en.user_id = target_user_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', user_info.id,
            'full_name', user_info.full_name,
            'email', user_info.email,
            'role', user_info.role,
            'avatar_url', user_info.avatar_url,
            'created_at', user_info.created_at,
            'is_suspended', COALESCE(user_info.is_suspended, FALSE)
        ),
        'courses', COALESCE(courses_data, '[]'::JSON),
        'enrollments', COALESCE(enrollments_data, '[]'::JSON)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_suspended(target_user_id UUID, suspend_user BOOLEAN)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN
        RETURN '{"success": false, "error": "Not authenticated."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = caller_id AND role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    IF target_user_id = caller_id AND suspend_user THEN
        RETURN '{"success": false, "error": "Admins cannot suspend their own account."}'::JSON;
    END IF;

    UPDATE public.users
    SET is_suspended = COALESCE(suspend_user, FALSE)
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RETURN '{"success": false, "error": "User not found."}'::JSON;
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', CASE WHEN suspend_user THEN 'User suspended.' ELSE 'User restored.' END
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_platform_user(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN
        RETURN '{"success": false, "error": "Not authenticated."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = caller_id AND role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    IF target_user_id = caller_id THEN
        RETURN '{"success": false, "error": "Admins cannot delete their own account."}'::JSON;
    END IF;

    DELETE FROM public.users WHERE id = target_user_id;
    DELETE FROM auth.users WHERE id = target_user_id;

    RETURN '{"success": true, "message": "User deleted."}'::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_suspended(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_platform_user(UUID) TO authenticated;
