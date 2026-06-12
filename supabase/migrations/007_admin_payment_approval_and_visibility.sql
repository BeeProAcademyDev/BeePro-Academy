-- =====================================================
-- Admin payment visibility + approval patch
-- =====================================================

-- 1) Allow admins to update any payment submission
DROP POLICY IF EXISTS "Admins can update all payment submissions" ON public.payment_submissions;
CREATE POLICY "Admins can update all payment submissions" ON public.payment_submissions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- 2) Keep student insert secure while avoiding role-mismatch false negatives
DROP POLICY IF EXISTS "Students can create payment submissions" ON public.payment_submissions;
DROP POLICY IF EXISTS "Students create payment submissions" ON public.payment_submissions;
CREATE POLICY "Students can create payment submissions" ON public.payment_submissions
    FOR INSERT WITH CHECK (
        student_id = auth.uid()
    );

-- 3) Allow instructor OR admin reviewer in approval function
CREATE OR REPLACE FUNCTION approve_payment_submission(
    submission_id UUID,
    reviewer_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    submission_record RECORD;
    enrollment_exists BOOLEAN;
BEGIN
    SELECT ps.*, c.title as course_title, u.full_name as student_name
    INTO submission_record
    FROM public.payment_submissions ps
    JOIN public.courses c ON c.id = ps.course_id
    JOIN public.users u ON u.id = ps.student_id
    WHERE ps.id = submission_id
      AND ps.status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment submission not found or already processed';
    END IF;

    IF submission_record.instructor_id != reviewer_id
       AND NOT EXISTS (
           SELECT 1 FROM public.users
           WHERE id = reviewer_id AND role = 'admin'
       ) THEN
        RAISE EXCEPTION 'Only the course instructor or an admin can approve this payment';
    END IF;

    UPDATE public.payment_submissions
    SET status = 'approved',
        reviewed_by = reviewer_id,
        reviewed_at = NOW(),
        review_notes = approve_payment_submission.review_notes,
        updated_at = NOW()
    WHERE id = submission_id;

    SELECT EXISTS(
        SELECT 1 FROM public.enrollments
        WHERE user_id = submission_record.student_id
          AND course_id = submission_record.course_id
    ) INTO enrollment_exists;

    IF NOT enrollment_exists THEN
        INSERT INTO public.enrollments (user_id, course_id, enrolled_at)
        VALUES (submission_record.student_id, submission_record.course_id, NOW());
    END IF;

    INSERT INTO public.payment_approval_history (payment_submission_id, reviewer_id, action, notes)
    VALUES (submission_id, reviewer_id, 'approved', approve_payment_submission.review_notes);

    INSERT INTO public.notifications (user_id, course_id, title, message, type, action_url)
    VALUES (
        submission_record.student_id,
        submission_record.course_id,
        'Payment Approved',
        'Your payment for course "' || submission_record.course_title || '" has been approved. You now have access to the course!',
        'payment_approval',
        '/courses/' || submission_record.course_id
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Allow instructor OR admin reviewer in rejection function
CREATE OR REPLACE FUNCTION reject_payment_submission(
    submission_id UUID,
    reviewer_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    submission_record RECORD;
BEGIN
    SELECT ps.*, c.title as course_title
    INTO submission_record
    FROM public.payment_submissions ps
    JOIN public.courses c ON c.id = ps.course_id
    WHERE ps.id = submission_id
      AND ps.status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment submission not found or already processed';
    END IF;

    IF submission_record.instructor_id != reviewer_id
       AND NOT EXISTS (
           SELECT 1 FROM public.users
           WHERE id = reviewer_id AND role = 'admin'
       ) THEN
        RAISE EXCEPTION 'Only the course instructor or an admin can reject this payment';
    END IF;

    UPDATE public.payment_submissions
    SET status = 'rejected',
        reviewed_by = reviewer_id,
        reviewed_at = NOW(),
        review_notes = reject_payment_submission.review_notes,
        updated_at = NOW()
    WHERE id = submission_id;

    INSERT INTO public.payment_approval_history (payment_submission_id, reviewer_id, action, notes)
    VALUES (submission_id, reviewer_id, 'rejected', reject_payment_submission.review_notes);

    INSERT INTO public.notifications (user_id, course_id, title, message, type)
    VALUES (
        submission_record.student_id,
        submission_record.course_id,
        'Payment Rejected',
        'Your payment submission for course "' || submission_record.course_title || '" has been rejected. Reason: ' ||
        COALESCE(reject_payment_submission.review_notes, 'No reason provided.'),
        'payment_rejection'
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
