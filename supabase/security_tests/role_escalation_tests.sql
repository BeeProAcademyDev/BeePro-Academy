-- Manual security tests for role escalation.
-- Run against a disposable/local Supabase database after migrations.

BEGIN;

DO $$
DECLARE
  student_id UUID := gen_random_uuid();
  teacher_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES
    (student_id, 'student-escalation-test@example.com', 'Student Test', 'student'),
    (teacher_id, 'teacher-escalation-test@example.com', 'Teacher Test', 'teacher');

  PERFORM set_config('request.jwt.claim.sub', student_id::TEXT, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    UPDATE public.users SET role = 'admin' WHERE id = student_id;
    RAISE EXCEPTION 'FAILED: student self-promotion to admin was allowed';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT ILIKE '%Users cannot change their own role%' THEN
        RAISE EXCEPTION 'FAILED: unexpected student self-promotion error: %', SQLERRM;
      END IF;
  END;

  BEGIN
    PERFORM public.sync_admin_role_if_allowed();
    IF EXISTS (SELECT 1 FROM public.users WHERE id = student_id AND role = 'admin') THEN
      RAISE EXCEPTION 'FAILED: sync_admin_role_if_allowed promoted student to admin';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
    WHEN undefined_function THEN
      NULL;
  END;

  PERFORM set_config('request.jwt.claim.sub', teacher_id::TEXT, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    UPDATE public.users SET role = 'admin' WHERE id = teacher_id;
    RAISE EXCEPTION 'FAILED: teacher self-promotion to admin was allowed';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT ILIKE '%Users cannot change their own role%' THEN
        RAISE EXCEPTION 'FAILED: unexpected teacher self-promotion error: %', SQLERRM;
      END IF;
  END;

  BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (gen_random_uuid(), 'request-body-admin@example.com', 'Request Body Admin', 'admin');
    RAISE EXCEPTION 'FAILED: non-admin insert with role=admin was allowed';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM ILIKE 'FAILED:%' THEN
        RAISE;
      END IF;
  END;
END;
$$;

ROLLBACK;

SELECT 'role escalation tests passed' AS result;
