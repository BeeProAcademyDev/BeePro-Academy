-- =====================================================
-- RPC: fetch course meetings for students (bypass RLS gaps)
-- Migration: 026_student_course_meetings_rpc.sql
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_course_meetings_for_student(p_course_id UUID)
RETURNS SETOF public.meetings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.course_id = p_course_id
          AND e.user_id = v_user_id
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.payment_submissions ps
        WHERE ps.course_id = p_course_id
          AND ps.student_id = v_user_id
          AND ps.status = 'approved'
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = p_course_id
          AND c.instructor_id = v_user_id
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = v_user_id
          AND u.role IN ('admin', 'teacher', 'instructor')
    ) THEN
        RAISE EXCEPTION 'Access denied to course meetings';
    END IF;

    RETURN QUERY
    SELECT m.*
    FROM public.meetings m
    WHERE m.course_id = p_course_id
    ORDER BY
        CASE WHEN m.status = 'live' THEN 0 ELSE 1 END,
        m.scheduled_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_meetings_for_student(UUID) TO authenticated;

SELECT '026_student_course_meetings_rpc applied' AS message;
