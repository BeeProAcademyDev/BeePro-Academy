-- =====================================================
-- Fix notifications schema for payment approval flows
-- Migration: 021_fix_notifications_columns.sql
--
-- Problem: approve_payment_submission inserts course_id / action_url
-- into notifications, but older databases may lack those columns.
-- =====================================================

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS action_url VARCHAR(500);

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check CHECK (
        type IN (
            'general',
            'meeting',
            'enrollment',
            'course_update',
            'reminder',
            'announcement',
            'payment',
            'payment_approval',
            'payment_rejection',
            'payment_expired',
            'payment_info_requested'
        )
    );

CREATE OR REPLACE FUNCTION public._approve_payment_submission_core(
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
        review_notes = _approve_payment_submission_core.review_notes,
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
    VALUES (submission_id, v_reviewer_id, 'approved', _approve_payment_submission_core.review_notes);

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

CREATE OR REPLACE FUNCTION public._reject_payment_submission_core(
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

    SELECT ps.*, c.title AS course_title
    INTO submission_record
    FROM public.payment_submissions ps
    JOIN public.courses c ON c.id = ps.course_id
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
        review_notes = _reject_payment_submission_core.review_notes,
        updated_at = NOW()
    WHERE id = submission_id;

    INSERT INTO public.payment_approval_history (
        payment_submission_id, reviewer_id, action, notes
    )
    VALUES (submission_id, v_reviewer_id, 'rejected', _reject_payment_submission_core.review_notes);

    BEGIN
        INSERT INTO public.notifications (user_id, course_id, title, message, type, action_url)
        VALUES (
            submission_record.student_id,
            submission_record.course_id,
            'Payment Rejected',
            'Your payment for course "' || submission_record.course_title || '" was rejected.',
            'payment_rejection',
            NULL
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'reject_payment_submission notification skipped: %', SQLERRM;
    END;

    RETURN TRUE;
END;
$$;

DROP FUNCTION IF EXISTS public.approve_payment_submission(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_payment_submission(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.approve_payment_submission(UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_payment_submission(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.approve_payment_submission(
    submission_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public._approve_payment_submission_core(submission_id, review_notes);
$$;

CREATE OR REPLACE FUNCTION public.reject_payment_submission(
    submission_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public._reject_payment_submission_core(submission_id, review_notes);
$$;

CREATE OR REPLACE FUNCTION public.approve_payment_submission(
    submission_id UUID,
    reviewer_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public._approve_payment_submission_core(submission_id, review_notes);
$$;

CREATE OR REPLACE FUNCTION public.reject_payment_submission(
    submission_id UUID,
    reviewer_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public._reject_payment_submission_core(submission_id, review_notes);
$$;

GRANT EXECUTE ON FUNCTION public._approve_payment_submission_core(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public._reject_payment_submission_core(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_payment_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_payment_submission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment_submission(UUID, UUID, TEXT) TO authenticated;

SELECT '021_fix_notifications_columns applied' AS message;
