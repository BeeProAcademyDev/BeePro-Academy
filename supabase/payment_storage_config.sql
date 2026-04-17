-- =====================================================
-- Payment Screenshots Storage Configuration
-- Secure storage for payment proof screenshots
-- =====================================================

-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES FOR PAYMENT SCREENSHOTS
-- =====================================================

-- Students can upload payment screenshots for their submissions
DROP POLICY IF EXISTS "Students can upload payment screenshots" ON storage.objects;
CREATE POLICY "Students can upload payment screenshots"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'payment-proofs' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Students can view their own payment screenshots
CREATE POLICY "Students can view their own payment screenshots"
ON storage.objects FOR SELECT USING (
  bucket_id = 'payment-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Instructors can view payment screenshots for their course submissions
CREATE POLICY "Instructors can view payment screenshots for their courses"
ON storage.objects FOR SELECT USING (
  bucket_id = 'payment-proofs' 
  AND EXISTS (
    SELECT 1 FROM public.payment_submissions ps
    JOIN public.courses c ON c.id = ps.course_id
    WHERE ps.payment_screenshot_url LIKE '%' || name || '%'
    AND c.instructor_id = auth.uid()
  )
);

-- Admins can view all payment screenshots
CREATE POLICY "Admins can view all payment screenshots"
ON storage.objects FOR SELECT USING (
  bucket_id = 'payment-proofs' 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Students can update/delete their own payment screenshots (before approval)
CREATE POLICY "Students can manage their own payment screenshots"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'payment-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.payment_submissions ps
    WHERE ps.payment_screenshot_url LIKE '%' || name || '%'
    AND ps.student_id = auth.uid()
    AND ps.status = 'pending'
  )
);

CREATE POLICY "Students can delete their own payment screenshots"
ON storage.objects FOR DELETE USING (
  bucket_id = 'payment-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.payment_submissions ps
    WHERE ps.payment_screenshot_url LIKE '%' || name || '%'
    AND ps.student_id = auth.uid()
    AND ps.status = 'pending'
  )
);

-- =====================================================
-- STORAGE HELPER FUNCTIONS
-- =====================================================

-- Function to generate secure payment screenshot URL
CREATE OR REPLACE FUNCTION generate_payment_screenshot_path(
  student_id UUID,
  course_id UUID,
  file_extension TEXT DEFAULT 'jpg'
)
RETURNS TEXT AS $$
BEGIN
  RETURN student_id || '/course-' || course_id || '/' || 
         extract(epoch from now())::bigint || '_' || 
         encode(gen_random_bytes(8), 'hex') || '.' || file_extension;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned payment screenshots
CREATE OR REPLACE FUNCTION cleanup_orphaned_payment_screenshots()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  screenshot_record RECORD;
BEGIN
  FOR screenshot_record IN
    SELECT so.name
    FROM storage.objects so
    WHERE so.bucket_id = 'payment-proofs'
    AND so.created_at < NOW() - INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_submissions ps
      WHERE ps.payment_screenshot_url LIKE '%' || so.name || '%'
    )
  LOOP
    DELETE FROM storage.objects 
    WHERE bucket_id = 'payment-proofs' 
    AND name = screenshot_record.name;
    
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Payment Screenshots Storage Configuration Completed Successfully!' as message;