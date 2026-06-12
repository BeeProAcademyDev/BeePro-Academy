-- =====================================================
-- Fix meeting notifications delivery + student read access
-- Migration: 029_fix_notify_and_read_notifications.sql
-- =====================================================

-- Broader student selection + reliable read RPCs
CREATE OR REPLACE FUNCTION public.notify_course_students(
    p_course_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'meeting',
    p_action_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
    student_ids UUID[];
    inserted_count INT := 0;
BEGIN
    IF caller_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = p_course_id AND c.instructor_id = caller_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = caller_id AND u.role = 'admin'
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only the course instructor or admin can notify students'
        );
    END IF;

    SELECT COALESCE(array_agg(DISTINCT eligible.user_id), ARRAY[]::UUID[])
    INTO student_ids
    FROM (
        SELECT e.user_id
        FROM public.enrollments e
        WHERE e.course_id = p_course_id
        UNION
        SELECT ps.student_id AS user_id
        FROM public.payment_submissions ps
        WHERE ps.course_id = p_course_id
          AND LOWER(TRIM(ps.status)) = 'approved'
    ) eligible
    WHERE eligible.user_id IS NOT NULL;

    IF student_ids IS NULL OR array_length(student_ids, 1) IS NULL THEN
        RETURN json_build_object('success', true, 'count', 0);
    END IF;

    BEGIN
        INSERT INTO public.notifications (user_id, course_id, title, message, type, action_url, is_read)
        SELECT
            unnest(student_ids),
            p_course_id,
            p_title,
            p_message,
            p_type,
            p_action_url,
            FALSE;
    EXCEPTION
        WHEN undefined_column THEN
            INSERT INTO public.notifications (user_id, title, message, type, is_read)
            SELECT unnest(student_ids), p_title, p_message, p_type, FALSE;
    END;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    RETURN json_build_object('success', true, 'count', inserted_count);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_course_students(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_notifications(
    p_limit INT DEFAULT 20,
    p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS SETOF public.notifications
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT n.*
    FROM public.notifications n
    WHERE n.user_id = auth.uid()
      AND (NOT p_unread_only OR COALESCE(n.is_read, FALSE) = FALSE)
    ORDER BY n.created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50));
$$;

CREATE OR REPLACE FUNCTION public.get_my_unread_notification_count()
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT COUNT(*)::INT
    FROM public.notifications n
    WHERE n.user_id = auth.uid()
      AND COALESCE(n.is_read, FALSE) = FALSE;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_notifications(INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_unread_notification_count() TO authenticated;

SELECT '029_fix_notify_and_read_notifications applied' AS message;
