-- =====================================================
-- Fix infinite recursion in payment_submissions RLS
-- Migration: 020_fix_payment_submissions_rls_recursion.sql
--
-- Problem: policy "Students cannot approve own payments" (017) runs
--   SELECT ... FROM payment_submissions inside an UPDATE policy on the
--   same table, which triggers infinite RLS recursion on any UPDATE.
-- =====================================================

DROP POLICY IF EXISTS "Students cannot approve own payments" ON public.payment_submissions;

-- Students may edit their own submission only while it remains pending.
-- They cannot change status to approved/rejected (no self-approval).
CREATE POLICY "Students can update own pending submissions"
    ON public.payment_submissions
    FOR UPDATE
    USING (
        student_id = auth.uid()
        AND status = 'pending'
    )
    WITH CHECK (
        student_id = auth.uid()
        AND status = 'pending'
    );

-- Ensure reviewer policies remain in place
DROP POLICY IF EXISTS "Instructors can update payment submissions for their courses" ON public.payment_submissions;
CREATE POLICY "Instructors can update payment submissions for their courses"
    ON public.payment_submissions
    FOR UPDATE
    USING (
        instructor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('instructor', 'admin')
        )
    )
    WITH CHECK (
        instructor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('instructor', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update all payment submissions" ON public.payment_submissions;
CREATE POLICY "Admins can update all payment submissions"
    ON public.payment_submissions
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

SELECT '020_fix_payment_submissions_rls_recursion applied' AS message;
