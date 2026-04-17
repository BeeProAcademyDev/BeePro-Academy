-- =====================================================
-- Fix: student cannot pay while admin can
-- Ensures authenticated students can read active payment methods,
-- upload proof screenshots, and insert payment submissions for self.
-- =====================================================

-- 1) Table grants (defensive: ensure role has required table privileges)
GRANT SELECT ON TABLE public.instructor_payment_methods TO authenticated;
GRANT SELECT, INSERT ON TABLE public.payment_submissions TO authenticated;

-- 2) instructor_payment_methods visibility for students
ALTER TABLE public.instructor_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view active payment methods of instructors" ON public.instructor_payment_methods;
DROP POLICY IF EXISTS "Students view active payment methods" ON public.instructor_payment_methods;

CREATE POLICY "Students can view active payment methods of instructors"
ON public.instructor_payment_methods
FOR SELECT
USING (
  is_active = TRUE
  AND auth.role() = 'authenticated'
);

-- 3) payment_submissions student insert policy
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can create payment submissions" ON public.payment_submissions;
DROP POLICY IF EXISTS "Students create payment submissions" ON public.payment_submissions;

CREATE POLICY "Students can create payment submissions"
ON public.payment_submissions
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND student_id = auth.uid()
);

-- 4) Storage upload policy for payment screenshot proofs
-- Path pattern expected by app: <auth.uid()>/course-<courseId>/<file>
DROP POLICY IF EXISTS "Students can upload payment screenshots" ON storage.objects;

CREATE POLICY "Students can upload payment screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5) Ensure students can see their own submissions
DROP POLICY IF EXISTS "Students can view their own payment submissions" ON public.payment_submissions;

CREATE POLICY "Students can view their own payment submissions"
ON public.payment_submissions
FOR SELECT
USING (
  student_id = auth.uid()
);

SELECT '009_fix_student_payment_access applied' AS message;