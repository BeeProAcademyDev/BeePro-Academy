-- Remove remaining demo courses and demo accounts from production data.
-- Admin accounts are intentionally preserved.

DELETE FROM public.enrollments
WHERE course_id IN (
  SELECT id FROM public.courses
  WHERE title ILIKE '%demo%'
     OR title = 'Demo Course: Getting Started'
     OR id::text = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

DELETE FROM public.payment_submissions
WHERE course_id IN (
  SELECT id FROM public.courses
  WHERE title ILIKE '%demo%'
     OR title = 'Demo Course: Getting Started'
     OR id::text = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

DELETE FROM public.courses
WHERE title ILIKE '%demo%'
   OR title = 'Demo Course: Getting Started'
   OR id::text = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DELETE FROM public.enrollments
WHERE user_id IN (
  SELECT id FROM public.users
  WHERE role IS DISTINCT FROM 'admin'
    AND (
      email IN (
        'instructor@example.com',
        'student@example.com',
        'demo@example.com'
      )
      OR id IN (
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333'
      )
      OR full_name ILIKE 'demo user'
    )
);

DELETE FROM public.users
WHERE role IS DISTINCT FROM 'admin'
  AND (
    email IN (
      'instructor@example.com',
      'student@example.com',
      'demo@example.com'
    )
    OR id IN (
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333'
    )
    OR full_name ILIKE 'demo user'
  );

DELETE FROM auth.users
WHERE email IN (
      'instructor@example.com',
      'student@example.com',
      'demo@example.com'
   );
