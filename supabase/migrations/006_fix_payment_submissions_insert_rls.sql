-- =====================================================
-- Fix payment_submissions INSERT RLS false positives
-- Allows any authenticated user to submit payment for self only
-- =====================================================

DROP POLICY IF EXISTS "Students can create payment submissions" ON public.payment_submissions;
DROP POLICY IF EXISTS "Students create payment submissions" ON public.payment_submissions;

CREATE POLICY "Students can create payment submissions" ON public.payment_submissions
    FOR INSERT WITH CHECK (
        student_id = auth.uid()
    );
