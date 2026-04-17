-- =====================================================
-- Fix payment-method visibility for checkout
-- Allow any authenticated user to read active methods
-- =====================================================

DROP POLICY IF EXISTS "Students can view active payment methods of instructors" ON public.instructor_payment_methods;
DROP POLICY IF EXISTS "Students view active payment methods" ON public.instructor_payment_methods;

CREATE POLICY "Students can view active payment methods of instructors" ON public.instructor_payment_methods
    FOR SELECT USING (
        is_active = TRUE
        AND auth.role() = 'authenticated'
    );
