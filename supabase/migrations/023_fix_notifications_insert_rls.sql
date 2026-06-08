-- =====================================================
-- Fix notifications INSERT RLS for teachers/instructors
-- Migration: 023_fix_notifications_insert_rls.sql
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON TABLE public.notifications TO authenticated;

DROP POLICY IF EXISTS "Teachers and admins can create notifications" ON public.notifications;

CREATE POLICY "Teachers and admins can create notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
              AND u.role IN ('instructor', 'teacher', 'admin')
        )
        OR (
            course_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.courses c
                WHERE c.id = notifications.course_id
                  AND c.instructor_id = auth.uid()
            )
        )
    );

-- SECURITY DEFINER helper: notify eligible students (bypasses INSERT RLS safely)
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
    course_price NUMERIC;
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

    SELECT COALESCE(c.price, 0)
    INTO course_price
    FROM public.courses c
    WHERE c.id = p_course_id;

    IF course_price > 0 THEN
        SELECT COALESCE(array_agg(DISTINCT ps.student_id), ARRAY[]::UUID[])
        INTO student_ids
        FROM public.payment_submissions ps
        WHERE ps.course_id = p_course_id
          AND ps.status = 'approved';
    ELSE
        SELECT COALESCE(array_agg(DISTINCT e.user_id), ARRAY[]::UUID[])
        INTO student_ids
        FROM public.enrollments e
        WHERE e.course_id = p_course_id;
    END IF;

    IF student_ids IS NULL OR array_length(student_ids, 1) IS NULL THEN
        RETURN json_build_object('success', true, 'count', 0);
    END IF;

    BEGIN
        INSERT INTO public.notifications (user_id, course_id, title, message, type, action_url)
        SELECT
            unnest(student_ids),
            p_course_id,
            p_title,
            p_message,
            p_type,
            p_action_url;
    EXCEPTION
        WHEN undefined_column THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            SELECT unnest(student_ids), p_title, p_message, p_type;
    END;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    RETURN json_build_object('success', true, 'count', inserted_count);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_course_students(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

SELECT '023_fix_notifications_insert_rls applied' AS message;
