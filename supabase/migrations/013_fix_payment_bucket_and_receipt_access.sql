-- =====================================================
-- 013: Ensure payment-proofs bucket exists and receipt access works
-- =====================================================

-- Ensure bucket exists (private bucket, access via signed URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

-- Upload policy for authenticated users in their own folder
DROP POLICY IF EXISTS "Students can upload payment screenshots" ON storage.objects;
CREATE POLICY "Students can upload payment screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Student reads own receipts
DROP POLICY IF EXISTS "Students can view their own payment screenshots" ON storage.objects;
CREATE POLICY "Students can view their own payment screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Instructor reads receipts of submissions for their courses
DROP POLICY IF EXISTS "Instructors can view payment screenshots for their courses" ON storage.objects;
CREATE POLICY "Instructors can view payment screenshots for their courses"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.payment_submissions ps
    JOIN public.courses c ON c.id = ps.course_id
    WHERE ps.payment_screenshot_url LIKE '%' || name || '%'
      AND c.instructor_id = auth.uid()
  )
);

-- Admin reads all receipts
DROP POLICY IF EXISTS "Admins can view all payment screenshots" ON storage.objects;
CREATE POLICY "Admins can view all payment screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

SELECT '013_fix_payment_bucket_and_receipt_access applied' AS message;