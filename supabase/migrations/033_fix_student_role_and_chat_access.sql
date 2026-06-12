-- =====================================================
-- Fix student accounts with missing role + chat eligibility
-- Migration: 033_fix_student_role_and_chat_access.sql
-- =====================================================

UPDATE public.users
SET role = 'student'
WHERE role IS NULL
   OR TRIM(role) = '';

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

SELECT '033_fix_student_role_and_chat_access applied' AS message;
