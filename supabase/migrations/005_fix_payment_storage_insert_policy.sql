-- =====================================================
-- Fix payment screenshot upload policy
-- Allows authenticated users to upload only into their own folder:
--   <auth.uid()>/course-<courseId>/file.ext
-- =====================================================

DROP POLICY IF EXISTS "Students can upload payment screenshots" ON storage.objects;

CREATE POLICY "Students can upload payment screenshots"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'payment-proofs'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
