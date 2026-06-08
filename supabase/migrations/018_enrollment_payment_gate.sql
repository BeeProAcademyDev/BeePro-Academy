-- =====================================================
-- BePro Academy - Enrollment Payment Gate
-- Migration: 018_enrollment_payment_gate.sql
-- Blocks free enrollment bypass for paid courses
-- =====================================================

-- Unique enrollment per student/course
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_user_course_enrollment'
          AND conrelid = 'public.enrollments'::regclass
    ) THEN
        ALTER TABLE public.enrollments
            ADD CONSTRAINT unique_user_course_enrollment UNIQUE (user_id, course_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Check if a user may enroll in a course
CREATE OR REPLACE FUNCTION public.can_student_enroll(
    p_user_id UUID,
    p_course_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = p_user_id AND u.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = p_course_id
              AND c.instructor_id = p_user_id
        )
        OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = p_course_id
              AND COALESCE(c.price, 0) <= 0
        )
        OR EXISTS (
            SELECT 1 FROM public.payment_submissions ps
            WHERE ps.student_id = p_user_id
              AND ps.course_id = p_course_id
              AND ps.status = 'approved'
        );
$$;

-- Safe enrollment entry point for students
CREATE OR REPLACE FUNCTION public.enroll_student_if_eligible(p_course_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_existing UUID;
    v_new_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN '{"success": false, "error": "Not authenticated."}'::JSON;
    END IF;

    IF NOT public.can_student_enroll(v_user_id, p_course_id) THEN
        RETURN '{"success": false, "error": "Payment approval is required before enrolling in this course."}'::JSON;
    END IF;

    SELECT e.id INTO v_existing
    FROM public.enrollments e
    WHERE e.user_id = v_user_id
      AND e.course_id = p_course_id;

    IF v_existing IS NOT NULL THEN
        RETURN json_build_object(
            'success', true,
            'enrollment_id', v_existing,
            'already_enrolled', true
        );
    END IF;

    INSERT INTO public.enrollments (user_id, course_id, progress)
    VALUES (v_user_id, p_course_id, 0)
    RETURNING id INTO v_new_id;

    RETURN json_build_object(
        'success', true,
        'enrollment_id', v_new_id,
        'already_enrolled', false
    );
END;
$$;

-- Tighten enrollment INSERT policy
DROP POLICY IF EXISTS "Users can enroll themselves" ON public.enrollments;

CREATE POLICY "Students can enroll when payment approved or course is free"
    ON public.enrollments
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND public.can_student_enroll(auth.uid(), course_id)
    );

-- Harden payment approval: use auth.uid() as reviewer, auto-enroll via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.approve_payment_submission(
    submission_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reviewer_id UUID := auth.uid();
    submission_record RECORD;
    enrollment_exists BOOLEAN;
BEGIN
    IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT ps.*, c.title AS course_title, u.full_name AS student_name
    INTO submission_record
    FROM public.payment_submissions ps
    JOIN public.courses c ON c.id = ps.course_id
    JOIN public.users u ON u.id = ps.student_id
    WHERE ps.id = submission_id
      AND ps.status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment submission not found or already processed';
    END IF;

    IF submission_record.instructor_id <> v_reviewer_id
       AND NOT EXISTS (
           SELECT 1 FROM public.users
           WHERE id = v_reviewer_id AND role = 'admin'
       ) THEN
        RAISE EXCEPTION 'Only the course instructor or an admin can approve this payment';
    END IF;

    UPDATE public.payment_submissions
    SET
        status = 'approved',
        reviewed_by = v_reviewer_id,
        reviewed_at = NOW(),
        review_notes = approve_payment_submission.review_notes,
        updated_at = NOW()
    WHERE id = submission_id;

    SELECT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE user_id = submission_record.student_id
          AND course_id = submission_record.course_id
    ) INTO enrollment_exists;

    IF NOT enrollment_exists THEN
        INSERT INTO public.enrollments (user_id, course_id, enrolled_at, progress)
        VALUES (submission_record.student_id, submission_record.course_id, NOW(), 0);
    END IF;

    INSERT INTO public.payment_approval_history (
        payment_submission_id, reviewer_id, action, notes
    )
    VALUES (submission_id, v_reviewer_id, 'approved', approve_payment_submission.review_notes);

    BEGIN
        INSERT INTO public.notifications (user_id, course_id, title, message, type, action_url)
        VALUES (
            submission_record.student_id,
            submission_record.course_id,
            'Payment Approved',
            'Your payment for course "' || submission_record.course_title || '" has been approved. You now have access to the course!',
            'payment_approval',
            '/courses/' || submission_record.course_id || '/learn'
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'approve_payment_submission notification skipped: %', SQLERRM;
    END;

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_payment_submission(
    submission_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reviewer_id UUID := auth.uid();
    submission_record RECORD;
BEGIN
    IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT ps.*
    INTO submission_record
    FROM public.payment_submissions ps
    WHERE ps.id = submission_id
      AND ps.status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment submission not found or already processed';
    END IF;

    IF submission_record.instructor_id <> v_reviewer_id
       AND NOT EXISTS (
           SELECT 1 FROM public.users
           WHERE id = v_reviewer_id AND role = 'admin'
       ) THEN
        RAISE EXCEPTION 'Only the course instructor or an admin can reject this payment';
    END IF;

    UPDATE public.payment_submissions
    SET
        status = 'rejected',
        reviewed_by = v_reviewer_id,
        reviewed_at = NOW(),
        review_notes = reject_payment_submission.review_notes,
        updated_at = NOW()
    WHERE id = submission_id;

    INSERT INTO public.payment_approval_history (
        payment_submission_id, reviewer_id, action, notes
    )
    VALUES (submission_id, v_reviewer_id, 'rejected', reject_payment_submission.review_notes);

    RETURN TRUE;
END;
$$;

-- Drop legacy signatures that accepted reviewer_id from client
DROP FUNCTION IF EXISTS public.approve_payment_submission(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_payment_submission(UUID, UUID, TEXT);

GRANT EXECUTE ON FUNCTION public.can_student_enroll(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_student_if_eligible(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_payment_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment_submission(UUID, TEXT) TO authenticated;

SELECT '018_enrollment_payment_gate applied' AS message;
