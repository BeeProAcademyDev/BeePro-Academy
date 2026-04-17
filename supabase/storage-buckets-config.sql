-- =====================================================
-- BePro Academy - Supabase Storage Buckets Configuration
-- File: storage-buckets-config.sql
-- =====================================================

-- =====================================================
-- STORAGE BUCKETS CREATION
-- =====================================================

-- 1. Course Thumbnails (PUBLIC) - Course images, banners
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-thumbnails',
  'course-thumbnails', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 2. User Avatars (PUBLIC) - Profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true, 
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 3. Lesson Videos (PRIVATE) - Course video content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-videos',
  'lesson-videos',
  false,
  1073741824, -- 1GB limit
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/avi']
) ON CONFLICT (id) DO NOTHING;

-- 4. Lesson Attachments (PRIVATE) - PDFs, documents, resources
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-attachments',
  'lesson-attachments',
  false,
  52428800, -- 50MB limit  
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'application/zip', 'application/x-rar-compressed']
) ON CONFLICT (id) DO NOTHING;

-- 5. Certificates (PRIVATE) - Generated certificate PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
) ON CONFLICT (id) DO NOTHING;

-- 6. Course Materials (PRIVATE) - Additional instructor resources
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-materials',
  'course-materials', 
  false,
  104857600, -- 100MB limit
  ARRAY['application/pdf', 'application/zip', 'video/mp4', 'image/jpeg', 'image/png', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES - Row Level Security for Files
-- =====================================================

-- =====================================================
-- COURSE THUMBNAILS POLICIES (PUBLIC BUCKET)
-- =====================================================

-- Anyone can view course thumbnails
CREATE POLICY "Anyone can view course thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-thumbnails');

-- Instructors can upload thumbnails for their courses
CREATE POLICY "Instructors can upload course thumbnails"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'course-thumbnails' 
  AND auth.role() = 'authenticated'
  AND (
    -- Course instructors can upload
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('instructor', 'admin')
    )
  )
);

-- Instructors can update their course thumbnails
CREATE POLICY "Instructors can update course thumbnails"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-thumbnails'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('instructor', 'admin')
    )
  )
);

-- Instructors can delete their course thumbnails
CREATE POLICY "Instructors can delete course thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-thumbnails'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('instructor', 'admin')
    )
  )
);

-- =====================================================
-- USER AVATARS POLICIES (PUBLIC BUCKET)
-- =====================================================

-- Anyone can view user avatars
CREATE POLICY "Anyone can view user avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-avatars'
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- LESSON VIDEOS POLICIES (PRIVATE BUCKET)
-- =====================================================

-- Enrolled students and course instructors can view lesson videos
CREATE POLICY "Enrolled students can view lesson videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lesson-videos'
  AND auth.role() = 'authenticated'
  AND (
    -- Students enrolled in the course can view
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.enrollments e ON e.course_id = l.course_id  
      WHERE l.id::text = (storage.foldername(name))[1]
      AND e.user_id = auth.uid()
    )
    OR
    -- Course instructors can view their videos
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id::text = (storage.foldername(name))[1]
      AND c.instructor_id = auth.uid()
    )
    OR
    -- Admins can view all videos
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
);

-- Instructors can upload videos for their course lessons
CREATE POLICY "Instructors can upload lesson videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-videos'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id::text = (storage.foldername(name))[1]
      AND c.instructor_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
);

-- =====================================================
-- LESSON ATTACHMENTS POLICIES (PRIVATE BUCKET)  
-- =====================================================

-- Enrolled students can download lesson attachments
CREATE POLICY "Enrolled students can view lesson attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lesson-attachments'
  AND auth.role() = 'authenticated'
  AND (
    -- Students enrolled in course can download
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.enrollments e ON e.course_id = l.course_id
      WHERE l.id::text = (storage.foldername(name))[1] 
      AND e.user_id = auth.uid()
    )
    OR
    -- Course instructors can view
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id  
      WHERE l.id::text = (storage.foldername(name))[1]
      AND c.instructor_id = auth.uid()
    )
    OR
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
);

-- Instructors can upload attachments for their lessons
CREATE POLICY "Instructors can upload lesson attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-attachments'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id::text = (storage.foldername(name))[1]
      AND c.instructor_id = auth.uid()
    )
  )
);

-- =====================================================
-- CERTIFICATES POLICIES (PRIVATE BUCKET)
-- =====================================================

-- Users can only view their own certificates
CREATE POLICY "Users can view their own certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificates'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
);

-- System can generate and store certificates
CREATE POLICY "System can create certificates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificates'
  AND auth.role() = 'authenticated'
);

-- =====================================================
-- COURSE MATERIALS POLICIES (PRIVATE BUCKET)
-- =====================================================

-- Similar to lesson attachments but course-level
CREATE POLICY "Enrolled students can view course materials"
ON storage.objects FOR SELECT  
USING (
  bucket_id = 'course-materials'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id::text = (storage.foldername(name))[1]
      AND e.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id::text = (storage.foldername(name))[1]
      AND c.instructor_id = auth.uid()
    )
  )
);

CREATE POLICY "Instructors can upload course materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-materials'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id::text = (storage.foldername(name))[1]
    AND c.instructor_id = auth.uid()
  )
);

-- =====================================================
-- HELPER FUNCTIONS FOR FILE ORGANIZATION
-- =====================================================

-- Function to generate file path for course thumbnails
CREATE OR REPLACE FUNCTION get_course_thumbnail_path(course_id UUID, filename TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN course_id || '/' || filename;
END;
$$ LANGUAGE plpgsql;

-- Function to generate file path for lesson videos
CREATE OR REPLACE FUNCTION get_lesson_video_path(lesson_id UUID, filename TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lesson_id || '/' || filename;
END;
$$ LANGUAGE plpgsql;

-- Function to generate file path for user avatars
CREATE OR REPLACE FUNCTION get_user_avatar_path(user_id UUID, filename TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN user_id || '/' || filename;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FILE ORGANIZATION STRUCTURE
-- =====================================================
/*
Recommended folder structure for each bucket:

1. course-thumbnails/
   └── {course_id}/
       ├── thumbnail.jpg
       ├── banner.png
       └── preview.jpg

2. user-avatars/
   └── {user_id}/
       └── avatar.jpg

3. lesson-videos/
   └── {lesson_id}/
       ├── lesson_video.mp4
       ├── preview.mp4
       └── subtitles.vtt

4. lesson-attachments/
   └── {lesson_id}/
       ├── slides.pdf
       ├── resources.zip
       └── notes.txt

5. certificates/
   └── {user_id}/
       ├── {certificate_id}.pdf
       └── {course_id}_certificate.pdf

6. course-materials/
   └── {course_id}/
       ├── syllabus.pdf
       ├── instructor_notes.pdf
       └── additional_resources.zip
*/

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================
/*
JavaScript Examples for Frontend:

// Upload course thumbnail
const { data, error } = await supabase.storage
  .from('course-thumbnails')
  .upload(`${courseId}/thumbnail.jpg`, file);

// Get signed URL for lesson video (enrolled students only)
const { data } = await supabase.storage
  .from('lesson-videos')
  .createSignedUrl(`${lessonId}/video.mp4`, 3600); // 1 hour expiry

// Download lesson attachment
const { data } = await supabase.storage
  .from('lesson-attachments')
  .download(`${lessonId}/slides.pdf`);

// Upload user avatar
const { data, error } = await supabase.storage
  .from('user-avatars')  
  .upload(`${userId}/avatar.jpg`, file, {
    upsert: true // Replace existing avatar
  });
*/