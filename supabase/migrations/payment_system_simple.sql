-- =====================================================
-- Simple Payment System Migration
-- Compatible with existing BePro Academy schema
-- Run this AFTER the base schema is already deployed
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
    display_name VARCHAR(100) NOT NULL,
    payment_details JSONB NOT NULL,
    instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment submissions from students
CREATE TABLE IF NOT EXISTS public.payment_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    payment_method_id UUID REFERENCES public.instructor_payment_methods(id) ON DELETE CASCADE NOT NULL,
    
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    transaction_reference TEXT,
    
    payment_screenshot_url TEXT NOT NULL,
    additional_notes TEXT,
    
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment approval history
CREATE TABLE IF NOT EXISTS public.payment_approval_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_submission_id UUID REFERENCES public.payment_submissions(id) ON DELETE CASCADE NOT NULL,
    reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_info')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment notifications
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
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_instructor_payment_methods_instructor ON public.instructor_payment_methods(instructor_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_student ON public.payment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_instructor ON public.payment_submissions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON public.payment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_pending ON public.payment_submissions(instructor_id, status) WHERE status = 'pending';

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.instructor_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;

-- Payment Methods Policies
CREATE POLICY "Instructors manage own payment methods" ON public.instructor_payment_methods
    FOR ALL USING (
        instructor_id = auth.uid() AND 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('instructor', 'admin'))
    );

CREATE POLICY "Students view active payment methods" ON public.instructor_payment_methods
    FOR SELECT USING (
        is_active = TRUE AND 
        auth.role() = 'authenticated'
    );

-- Payment Submissions Policies
CREATE POLICY "Students create payment submissions" ON public.payment_submissions
    FOR INSERT WITH CHECK (
        student_id = auth.uid()
    );

CREATE POLICY "Students view own submissions" ON public.payment_submissions
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Instructors view course submissions" ON public.payment_submissions
    FOR SELECT USING (
        instructor_id = auth.uid() AND 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('instructor', 'admin'))
    );

CREATE POLICY "Instructors update course submissions" ON public.payment_submissions
    FOR UPDATE USING (
        instructor_id = auth.uid() AND 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('instructor', 'admin'))
    );

CREATE POLICY "Admins update all submissions" ON public.payment_submissions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Approve payment function
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
    WHERE ps.id = submission_id AND ps.status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment submission not found or already processed';
    END IF;
    
    UPDATE public.payment_submissions 
    SET status = 'approved', reviewed_by = reviewer_id, reviewed_at = NOW(), 
        review_notes = approve_payment_submission.review_notes, updated_at = NOW()
    WHERE id = submission_id;
    
    SELECT EXISTS(
        SELECT 1 FROM public.enrollments 
        WHERE user_id = submission_record.student_id AND course_id = submission_record.course_id
    ) INTO enrollment_exists;
    
    IF NOT enrollment_exists THEN
        INSERT INTO public.enrollments (user_id, course_id, enrolled_at)
        VALUES (submission_record.student_id, submission_record.course_id, NOW());
    END IF;
    
    INSERT INTO public.payment_approval_history (payment_submission_id, reviewer_id, action, notes)
    VALUES (submission_id, reviewer_id, 'approved', approve_payment_submission.review_notes);
    
    INSERT INTO public.notifications (user_id, course_id, title, message, type)
    VALUES (
        submission_record.student_id, submission_record.course_id,
        'Payment Approved',
        'Your payment for course "' || submission_record.course_title || '" has been approved!',
        'payment_approval'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject payment function
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
    WHERE ps.id = submission_id AND ps.status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment submission not found or already processed';
    END IF;
    
    UPDATE public.payment_submissions 
    SET status = 'rejected', reviewed_by = reviewer_id, reviewed_at = NOW(),
        review_notes = reject_payment_submission.review_notes, updated_at = NOW()
    WHERE id = submission_id;
    
    INSERT INTO public.payment_approval_history (payment_submission_id, reviewer_id, action, notes)
    VALUES (submission_id, reviewer_id, 'rejected', reject_payment_submission.review_notes);
    
    INSERT INTO public.notifications (user_id, course_id, title, message, type)
    VALUES (
        submission_record.student_id, submission_record.course_id,
        'Payment Rejected',
        'Your payment for course "' || submission_record.course_title || '" was rejected: ' || 
        COALESCE(reject_payment_submission.review_notes, 'No reason provided'),
        'payment_rejection'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Simple Payment System - Migration Completed Successfully!' as message;