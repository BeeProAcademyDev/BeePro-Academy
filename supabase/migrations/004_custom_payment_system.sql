-- =====================================================
-- Custom Payment Management System Migration
-- Extends existing BePro Academy schema with instructor payment methods
-- and student payment submission workflow
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure storage bucket exists for payment proof screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- INSTRUCTOR PAYMENT METHODS SYSTEM
-- =====================================================

-- Payment method types that instructors can add
CREATE TABLE IF NOT EXISTS public.instructor_payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN (
        'vodafone_cash', 'orange_cash', 'etisalat_cash', 'we_pay', 
        'bank_transfer', 'iban', 'paypal', 'ksa_local', 'uae_local', 
        'international_wire', 'crypto', 'other'
    )),
    display_name VARCHAR(100) NOT NULL, -- e.g. "Vodafone Cash", "Bank Transfer"
    payment_details JSONB NOT NULL, -- Store payment-specific details
    instructions TEXT, -- Custom instructions for students
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE, -- Instructor's preferred method
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure instructor can only have one primary method per type
    CONSTRAINT unique_primary_per_instructor_type UNIQUE (instructor_id, payment_type, is_primary) DEFERRABLE INITIALLY DEFERRED
);

-- Payment submissions from students
CREATE TABLE IF NOT EXISTS public.payment_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    payment_method_id UUID REFERENCES public.instructor_payment_methods(id) ON DELETE CASCADE NOT NULL,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    transaction_reference TEXT, -- Student-provided transaction ID/reference
    
    -- Proof of payment
    payment_screenshot_url TEXT NOT NULL, -- Required screenshot proof
    additional_notes TEXT, -- Student can add notes
    
    -- Submission metadata
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    
    -- Approval tracking
    reviewed_by UUID REFERENCES public.users(id), -- Instructor who reviewed
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT, -- Instructor's approval/rejection notes
    
    -- Auto-expiry for pending payments (e.g., expire after 7 days)
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment approval history (for audit trail)
CREATE TABLE IF NOT EXISTS public.payment_approval_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_submission_id UUID REFERENCES public.payment_submissions(id) ON DELETE CASCADE NOT NULL,
    reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_info')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced payment notifications (extends existing notifications table)
CREATE TABLE IF NOT EXISTS public.payment_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    payment_submission_id UUID REFERENCES public.payment_submissions(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'payment_submitted', 'payment_approved', 'payment_rejected', 
        'payment_expired', 'payment_info_requested'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Payment methods indexes
CREATE INDEX IF NOT EXISTS idx_instructor_payment_methods_instructor ON public.instructor_payment_methods(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_payment_methods_type ON public.instructor_payment_methods(payment_type);
CREATE INDEX IF NOT EXISTS idx_instructor_payment_methods_active ON public.instructor_payment_methods(is_active) WHERE is_active = TRUE;

-- Payment submissions indexes
CREATE INDEX IF NOT EXISTS idx_payment_submissions_student ON public.payment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_instructor ON public.payment_submissions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_course ON public.payment_submissions(course_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON public.payment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_pending ON public.payment_submissions(instructor_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_submissions_expires ON public.payment_submissions(expires_at) WHERE status = 'pending';

-- Payment approval history indexes
CREATE INDEX IF NOT EXISTS idx_payment_approval_history_submission ON public.payment_approval_history(payment_submission_id);
CREATE INDEX IF NOT EXISTS idx_payment_approval_history_reviewer ON public.payment_approval_history(reviewer_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.instructor_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;

-- Instructor Payment Methods Policies
CREATE POLICY "Instructors can manage their own payment methods" ON public.instructor_payment_methods
    FOR ALL USING (
        instructor_id = auth.uid() AND 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('instructor', 'admin'))
    );

CREATE POLICY "Students can view active payment methods of instructors" ON public.instructor_payment_methods
    FOR SELECT USING (
        is_active = TRUE AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Admins can view all payment methods" ON public.instructor_payment_methods
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Payment Submissions Policies
CREATE POLICY "Students can create payment submissions" ON public.payment_submissions
    FOR INSERT WITH CHECK (
        student_id = auth.uid()
    );

CREATE POLICY "Students can view their own payment submissions" ON public.payment_submissions
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Instructors can view payment submissions for their courses" ON public.payment_submissions
    FOR SELECT USING (
        instructor_id = auth.uid() AND 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('instructor', 'admin'))
    );

CREATE POLICY "Instructors can update payment submissions for their courses" ON public.payment_submissions
    FOR UPDATE USING (
        instructor_id = auth.uid() AND 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('instructor', 'admin'))
    );

CREATE POLICY "Admins can update all payment submissions" ON public.payment_submissions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can view all payment submissions" ON public.payment_submissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Payment Approval History Policies
CREATE POLICY "Users can view approval history for their payments" ON public.payment_approval_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.payment_submissions ps
            WHERE ps.id = payment_approval_history.payment_submission_id
            AND (ps.student_id = auth.uid() OR ps.instructor_id = auth.uid())
        )
    );

CREATE POLICY "Instructors can create approval history" ON public.payment_approval_history
    FOR INSERT WITH CHECK (
        reviewer_id = auth.uid() AND 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('instructor', 'admin'))
    );

-- Payment Notifications Policies
CREATE POLICY "Users can view their payment notifications" ON public.payment_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.notifications n
            WHERE n.id = payment_notifications.notification_id
            AND n.user_id = auth.uid()
        )
    );

-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to approve payment and auto-enroll student
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
    -- Get submission details
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
    
    -- Verify reviewer is instructor for this course OR admin
    IF submission_record.instructor_id != reviewer_id
       AND NOT EXISTS (
           SELECT 1 FROM public.users
           WHERE id = reviewer_id AND role = 'admin'
       ) THEN
        RAISE EXCEPTION 'Only the course instructor or an admin can approve this payment';
    END IF;
    
    -- Update payment submission status
    UPDATE public.payment_submissions 
    SET 
        status = 'approved',
        reviewed_by = reviewer_id,
        reviewed_at = NOW(),
        review_notes = approve_payment_submission.review_notes,
        updated_at = NOW()
    WHERE id = submission_id;
    
    -- Check if student is already enrolled
    SELECT EXISTS(
        SELECT 1 FROM public.enrollments 
        WHERE user_id = submission_record.student_id 
        AND course_id = submission_record.course_id
    ) INTO enrollment_exists;
    
    -- Auto-enroll student if not already enrolled
    IF NOT enrollment_exists THEN
        INSERT INTO public.enrollments (user_id, course_id, enrolled_at)
        VALUES (submission_record.student_id, submission_record.course_id, NOW());
    END IF;
    
    -- Add approval to history
    INSERT INTO public.payment_approval_history (payment_submission_id, reviewer_id, action, notes)
    VALUES (submission_id, reviewer_id, 'approved', approve_payment_submission.review_notes);
    
    -- Create notification for student
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

-- Function to reject payment submission
CREATE OR REPLACE FUNCTION reject_payment_submission(
    submission_id UUID,
    reviewer_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    submission_record RECORD;
BEGIN
    -- Get submission details
    SELECT ps.*, c.title as course_title
    INTO submission_record
    FROM public.payment_submissions ps
    JOIN public.courses c ON c.id = ps.course_id
    WHERE ps.id = submission_id
    AND ps.status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment submission not found or already processed';
    END IF;
    
    -- Verify reviewer is instructor for this course OR admin
    IF submission_record.instructor_id != reviewer_id
       AND NOT EXISTS (
           SELECT 1 FROM public.users
           WHERE id = reviewer_id AND role = 'admin'
       ) THEN
        RAISE EXCEPTION 'Only the course instructor or an admin can reject this payment';
    END IF;
    
    -- Update payment submission status
    UPDATE public.payment_submissions 
    SET 
        status = 'rejected',
        reviewed_by = reviewer_id,
        reviewed_at = NOW(),
        review_notes = reject_payment_submission.review_notes,
        updated_at = NOW()
    WHERE id = submission_id;
    
    -- Add rejection to history
    INSERT INTO public.payment_approval_history (payment_submission_id, reviewer_id, action, notes)
    VALUES (submission_id, reviewer_id, 'rejected', reject_payment_submission.review_notes);
    
    -- Create notification for student
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

-- Function to handle expired payments (cleanup job)
CREATE OR REPLACE FUNCTION expire_old_payment_submissions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
    submission_record RECORD;
BEGIN
    -- Get all expired pending payments
    FOR submission_record IN
        SELECT ps.id, ps.student_id, ps.course_id, c.title as course_title
        FROM public.payment_submissions ps
        JOIN public.courses c ON c.id = ps.course_id
        WHERE ps.status = 'pending' 
        AND ps.expires_at < NOW()
    LOOP
        -- Update status to expired
        UPDATE public.payment_submissions 
        SET status = 'expired', updated_at = NOW()
        WHERE id = submission_record.id;
        
        -- Notify student
        INSERT INTO public.notifications (user_id, course_id, title, message, type)
        VALUES (
            submission_record.student_id,
            submission_record.course_id,
            'Payment Submission Expired',
            'Your payment submission for course "' || submission_record.course_title || '" has expired. Please submit a new payment proof.',
            'payment_expired'
        );
        
        expired_count := expired_count + 1;
    END LOOP;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SAMPLE PAYMENT METHOD TYPES DATA
-- =====================================================

-- Insert common payment method configurations for reference
INSERT INTO public.categories (name, slug, description) VALUES
('Payment Methods', 'payment-methods', 'Available payment methods for course purchases')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- DATABASE VIEWS FOR ANALYTICS
-- =====================================================

-- View for payment submission statistics
CREATE OR REPLACE VIEW payment_statistics AS
SELECT 
    i.id as instructor_id,
    i.full_name as instructor_name,
    COUNT(ps.id) as total_submissions,
    COUNT(CASE WHEN ps.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN ps.status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN ps.status = 'rejected' THEN 1 END) as rejected_count,
    COUNT(CASE WHEN ps.status = 'expired' THEN 1 END) as expired_count,
    SUM(CASE WHEN ps.status = 'approved' THEN ps.amount ELSE 0 END) as total_revenue,
    AVG(EXTRACT(EPOCH FROM (ps.reviewed_at - ps.submitted_at))/3600) as avg_review_time_hours
FROM public.users i
LEFT JOIN public.payment_submissions ps ON ps.instructor_id = i.id
WHERE i.role IN ('instructor', 'admin')
GROUP BY i.id, i.full_name;

-- Success message
SELECT 'Custom Payment Management System - Database Migration Completed Successfully!' as message;