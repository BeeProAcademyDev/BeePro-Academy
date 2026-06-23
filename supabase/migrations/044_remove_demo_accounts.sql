-- Remove demo accounts and demo course previously inserted by supabase/seed.sql.
-- Admin accounts are intentionally preserved.

DELETE FROM public.courses
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
   OR (
      title = 'Demo Course: Getting Started'
      AND instructor_id = '11111111-1111-1111-1111-111111111111'
   );

DELETE FROM public.users
WHERE role IS DISTINCT FROM 'admin'
  AND (
    id IN (
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333'
    )
    OR email IN (
      'instructor@example.com',
      'student@example.com'
    )
  );
