-- =====================================================
-- Allow paid (approved) students to view course meetings
-- Migration: 025_meetings_access_for_paid_students.sql
-- =====================================================

DROP POLICY IF EXISTS "Users can view meetings for enrolled courses" ON public.meetings;

CREATE POLICY "Users can view meetings for enrolled courses"
    ON public.meetings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = meetings.course_id
              AND e.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.payment_submissions ps
            WHERE ps.course_id = meetings.course_id
              AND ps.student_id = auth.uid()
              AND ps.status = 'approved'
        )
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = meetings.course_id
              AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

SELECT '025_meetings_access_for_paid_students applied' AS message;
