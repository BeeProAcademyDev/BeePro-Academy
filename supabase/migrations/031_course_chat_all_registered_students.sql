-- =====================================================
-- Course chat: all registered students (incremental)
-- Migration: 031_course_chat_all_registered_students.sql
-- NOTE: If 030 was applied after the 2026-06-08 update, you do NOT need this file.
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_registered_student(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p_user_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = p_user_id
              AND LOWER(TRIM(COALESCE(u.role, 'student'))) NOT IN (
                  'teacher', 'instructor', 'admin', 'pending_instructor'
              )
        );
$$;

GRANT EXECUTE ON FUNCTION public.is_registered_student(UUID) TO authenticated;

SELECT '031_course_chat_all_registered_students applied (no-op if 030 already updated)' AS message;
