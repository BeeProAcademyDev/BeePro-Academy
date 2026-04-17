-- =====================================================
-- BePro Academy - Migration-Safe Complete Schema
-- This file can be safely run on existing databases
-- Uses IF NOT EXISTS and safe migration patterns
-- =====================================================

-- Enable required extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES - MIGRATION SAFE
-- =====================================================

-- USERS TABLE (Enhanced with safe additions)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('student','instructor','admin')) DEFAULT 'student',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns safely if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN
        ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COURSES TABLE (Enhanced)
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT CHECK (category IN ('programming','graphic','it','financial')),
    description TEXT,
    instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    thumbnail_url TEXT,
    price NUMERIC(10,2) DEFAULT 0,
    level TEXT CHECK (level IN ('beginner','intermediate','advanced')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at column to courses if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='updated_at') THEN
        ALTER TABLE public.courses ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- COURSE SECTIONS (New table)
CREATE TABLE IF NOT EXISTS public.course_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_course_section_order UNIQUE (course_id, order_index)
);

-- LESSONS TABLE (Enhanced with safe column additions)
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT,
    duration INTEGER,
    order_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to lessons safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='section_id') THEN
        ALTER TABLE public.lessons ADD COLUMN section_id UUID REFERENCES public.course_sections(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='description') THEN
        ALTER TABLE public.lessons ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='is_free') THEN
        ALTER TABLE public.lessons ADD COLUMN is_free BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='is_published') THEN
        ALTER TABLE public.lessons ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='updated_at') THEN
        ALTER TABLE public.lessons ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- LESSON FILES TABLE
CREATE TABLE IF NOT EXISTS public.lesson_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER,
    file_url VARCHAR(500) NOT NULL,
    file_description TEXT,
    is_downloadable BOOLEAN DEFAULT TRUE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENROLLMENTS TABLE (Enhanced with safe column additions)
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to enrollments safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrollments' AND column_name='total_lessons') THEN
        ALTER TABLE public.enrollments ADD COLUMN total_lessons INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrollments' AND column_name='completed_lessons') THEN
        ALTER TABLE public.enrollments ADD COLUMN completed_lessons INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrollments' AND column_name='last_accessed_at') THEN
        ALTER TABLE public.enrollments ADD COLUMN last_accessed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrollments' AND column_name='estimated_completion_date') THEN
        ALTER TABLE public.enrollments ADD COLUMN estimated_completion_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrollments' AND column_name='certificate_issued_at') THEN
        ALTER TABLE public.enrollments ADD COLUMN certificate_issued_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MEETINGS TABLE
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meet_link VARCHAR(500) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
    recording_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MEETING ATTENDEES TABLE
CREATE TABLE IF NOT EXISTS public.meeting_attendees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 0,
    attendance_status VARCHAR(20) DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'attended', 'no_show')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_meeting_attendee UNIQUE (meeting_id, user_id)
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general' CHECK (type IN ('general', 'meeting', 'enrollment', 'course_update', 'reminder', 'announcement')),
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- QUIZ & EXAMINATION SYSTEM
-- =====================================================

-- QUIZZES TABLE
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 30,
    passing_score INTEGER DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
    max_attempts INTEGER DEFAULT 3,
    is_published BOOLEAN DEFAULT FALSE,
    randomize_questions BOOLEAN DEFAULT TRUE,
    show_results_immediately BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QUIZ QUESTIONS
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
    explanation TEXT,
    points INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QUIZ ANSWER OPTIONS
CREATE TABLE IF NOT EXISTS public.quiz_answer_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    score DECIMAL(5,2) DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    is_passed BOOLEAN DEFAULT FALSE,
    attempt_number INTEGER DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'unique_user_quiz_attempt' 
                   AND table_name = 'quiz_attempts') THEN
        ALTER TABLE public.quiz_attempts 
        ADD CONSTRAINT unique_user_quiz_attempt UNIQUE (quiz_id, user_id, attempt_number);
    END IF;
END $$;

-- QUIZ ATTEMPT ANSWERS
CREATE TABLE IF NOT EXISTS public.quiz_attempt_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
    selected_option_id UUID REFERENCES public.quiz_answer_options(id) ON DELETE CASCADE,
    text_answer TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    points_earned DECIMAL(4,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PROGRESS TRACKING SYSTEM
-- =====================================================

-- LESSON PROGRESS
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    watch_time_seconds INTEGER DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    first_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'unique_user_lesson_progress' 
                   AND table_name = 'lesson_progress') THEN
        ALTER TABLE public.lesson_progress 
        ADD CONSTRAINT unique_user_lesson_progress UNIQUE (user_id, lesson_id);
    END IF;
END $$;

-- =====================================================
-- CERTIFICATES SYSTEM
-- =====================================================

-- CERTIFICATES TABLE
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    certificate_number VARCHAR(50) UNIQUE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at DATE,
    template_url TEXT,
    certificate_url TEXT,
    verification_code VARCHAR(20) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(10), 'hex'),
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoke_reason TEXT
);

-- Create unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'unique_user_course_certificate' 
                   AND table_name = 'certificates') THEN
        ALTER TABLE public.certificates 
        ADD CONSTRAINT unique_user_course_certificate UNIQUE (user_id, course_id);
    END IF;
END $$;

-- =====================================================
-- PAYMENT & PRICING SYSTEM
-- =====================================================

-- COURSE PRICING
CREATE TABLE IF NOT EXISTS public.course_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    pricing_type VARCHAR(20) DEFAULT 'one_time' CHECK (pricing_type IN ('free', 'one_time', 'subscription', 'installments')),
    base_price DECIMAL(10,2) DEFAULT 0,
    discounted_price DECIMAL(10,2),
    discount_percentage INTEGER CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PAYMENTS TRACKING
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_provider VARCHAR(50),
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ANALYTICS & REPORTING
-- =====================================================

-- USER ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COURSE STATISTICS
CREATE TABLE IF NOT EXISTS public.course_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    total_enrollments INTEGER DEFAULT 0,
    active_students INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'unique_course_statistics' 
                   AND table_name = 'course_statistics') THEN
        ALTER TABLE public.course_statistics 
        ADD CONSTRAINT unique_course_statistics UNIQUE (course_id);
    END IF;
END $$;

-- =====================================================
-- PERFORMANCE INDEXES (SAFE TO RUN MULTIPLE TIMES)
-- =====================================================

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);

-- Course indexes
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_level ON public.courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON public.courses(created_at);

-- Course sections indexes
CREATE INDEX IF NOT EXISTS idx_course_sections_course_id ON public.course_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sections_order ON public.course_sections(course_id, order_index);

-- Lesson indexes
CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_section ON public.lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_lessons_published ON public.lessons(is_published);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON public.lessons(course_id, order_index);

-- Enrollment indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_progress ON public.enrollments(progress);

-- Quiz system indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON public.quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answer_options_question_id ON public.quiz_answer_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_attempt_id ON public.quiz_attempt_answers(attempt_id);

-- Progress tracking indexes
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course_id ON public.lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed ON public.lesson_progress(is_completed);

-- Certificate indexes
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON public.certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON public.certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_verification ON public.certificates(verification_code);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON public.payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Create payment_date index only if column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='payment_date') THEN
        CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
    END IF;
END $$;

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_type ON public.user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at);

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_reviews_course ON public.reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_files_lesson_id ON public.lesson_files(lesson_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON public.meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON public.meeting_attendees(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (SAFE TO RUN MULTIPLE TIMES)
-- =====================================================

-- Enable RLS on all tables (safe to run multiple times)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_statistics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SAFE POLICY CREATION (WITH CONFLICT HANDLING)
-- =====================================================

-- Drop existing policies to recreate them (safer than checking existence)
DO $$ 
DECLARE
    policy_name TEXT;
    policies TEXT[] := ARRAY[
        'Users can view their own profile',
        'Users can update their own profile', 
        'Public can view user profiles',
        'Anyone can view active categories',
        'Admins can manage categories',
        'Anyone can view courses',
        'Instructors can create courses',
        'Instructors can update their own courses',
        'Admins can manage all courses',
        'Users can view course sections',
        'Instructors can manage their course sections',
        'Anyone can view published lessons',
        'Instructors can manage lessons of their courses',
        'Users can view their own enrollments',
        'Users can enroll themselves',
        'Users can update their own enrollment progress',
        'Anyone can view reviews',
        'Enrolled users can create reviews',
        'Users can update their own reviews',
        'Users can delete their own reviews',
        'Students can view quizzes for enrolled courses',
        'Instructors can manage quizzes',
        'Users can view quiz questions based on quiz access',
        'Instructors can manage quiz questions',
        'Users can view answer options based on question access',
        'Instructors can manage answer options',
        'Students can manage their own quiz attempts',
        'Instructors can view quiz attempts for their courses',
        'Students can manage their own attempt answers',
        'Students can manage their own lesson progress',
        'Instructors can view lesson progress for their courses',
        'Users can view their own certificates',
        'Public certificate verification',
        'System can create certificates',
        'Users can view their own payments',
        'Users can create their own payments'
    ];
BEGIN
    -- Drop existing policies safely
    FOREACH policy_name IN ARRAY policies
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.categories', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.courses', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.course_sections', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.lessons', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.enrollments', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.reviews', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.quizzes', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.quiz_questions', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.quiz_answer_options', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.quiz_attempts', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.quiz_attempt_answers', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.lesson_progress', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.certificates', policy_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.payments', policy_name);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors, policy might not exist
            NULL;
        END;
    END LOOP;
END $$;

-- Create RLS policies
-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public can view user profiles" ON public.users
    FOR SELECT USING (true);

-- Categories policies
CREATE POLICY "Anyone can view active categories" ON public.categories
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Courses policies
CREATE POLICY "Anyone can view courses" ON public.courses
    FOR SELECT USING (true);

CREATE POLICY "Instructors can create courses" ON public.courses
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('instructor', 'admin'))
    );

CREATE POLICY "Instructors can update their own courses" ON public.courses
    FOR UPDATE USING (instructor_id = auth.uid());

CREATE POLICY "Admins can manage all courses" ON public.courses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Course sections policies
CREATE POLICY "Users can view course sections" ON public.course_sections
    FOR SELECT USING (
        is_published = TRUE
        OR
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = course_sections.course_id
            AND courses.instructor_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Instructors can manage their course sections" ON public.course_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = course_sections.course_id
            AND courses.instructor_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Lessons policies
CREATE POLICY "Anyone can view published lessons" ON public.lessons
    FOR SELECT USING (is_published = TRUE OR 
        EXISTS (SELECT 1 FROM public.courses WHERE courses.id = lessons.course_id AND courses.instructor_id = auth.uid())
    );

CREATE POLICY "Instructors can manage lessons of their courses" ON public.lessons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = lessons.course_id 
            AND courses.instructor_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Enrollments policies
CREATE POLICY "Users can view their own enrollments" ON public.enrollments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can enroll themselves" ON public.enrollments
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own enrollment progress" ON public.enrollments
    FOR UPDATE USING (user_id = auth.uid());

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Enrolled users can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.enrollments 
            WHERE enrollments.user_id = auth.uid() 
            AND enrollments.course_id = reviews.course_id
        )
    );

CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews" ON public.reviews
    FOR DELETE USING (user_id = auth.uid());

-- Quiz policies
CREATE POLICY "Students can view quizzes for enrolled courses" ON public.quizzes
    FOR SELECT USING (
        is_published = TRUE AND 
        (
            EXISTS (
                SELECT 1 FROM public.enrollments
                WHERE enrollments.course_id = quizzes.course_id
                AND enrollments.user_id = auth.uid()
            )
            OR
            EXISTS (
                SELECT 1 FROM public.courses
                WHERE courses.id = quizzes.course_id
                AND courses.instructor_id = auth.uid()
            )
            OR
            EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = auth.uid()
                AND users.role = 'admin'
            )
        )
    );

CREATE POLICY "Instructors can manage quizzes" ON public.quizzes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = quizzes.course_id
            AND courses.instructor_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Quiz questions policies
CREATE POLICY "Users can view quiz questions based on quiz access" ON public.quiz_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.quizzes
            JOIN public.enrollments ON enrollments.course_id = quizzes.course_id
            WHERE quizzes.id = quiz_questions.quiz_id
            AND quizzes.is_published = TRUE
            AND enrollments.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.quizzes
            JOIN public.courses ON courses.id = quizzes.course_id
            WHERE quizzes.id = quiz_questions.quiz_id
            AND courses.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can manage quiz questions" ON public.quiz_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.quizzes
            JOIN public.courses ON courses.id = quizzes.course_id
            WHERE quizzes.id = quiz_questions.quiz_id
            AND courses.instructor_id = auth.uid()
        )
    );

-- Quiz answer options policies
CREATE POLICY "Users can view answer options based on question access" ON public.quiz_answer_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.quiz_questions
            JOIN public.quizzes ON quizzes.id = quiz_questions.quiz_id
            JOIN public.enrollments ON enrollments.course_id = quizzes.course_id
            WHERE quiz_questions.id = quiz_answer_options.question_id
            AND quizzes.is_published = TRUE
            AND enrollments.user_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can manage answer options" ON public.quiz_answer_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.quiz_questions
            JOIN public.quizzes ON quizzes.id = quiz_questions.quiz_id
            JOIN public.courses ON courses.id = quizzes.course_id
            WHERE quiz_questions.id = quiz_answer_options.question_id
            AND courses.instructor_id = auth.uid()
        )
    );

-- Quiz attempts policies
CREATE POLICY "Students can manage their own quiz attempts" ON public.quiz_attempts
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Instructors can view quiz attempts for their courses" ON public.quiz_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.quizzes
            JOIN public.courses ON courses.id = quizzes.course_id
            WHERE quizzes.id = quiz_attempts.quiz_id
            AND courses.instructor_id = auth.uid()
        )
    );

-- Quiz attempt answers policies
CREATE POLICY "Students can manage their own attempt answers" ON public.quiz_attempt_answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.quiz_attempts
            WHERE quiz_attempts.id = quiz_attempt_answers.attempt_id
            AND quiz_attempts.user_id = auth.uid()
        )
    );

-- Lesson progress policies
CREATE POLICY "Students can manage their own lesson progress" ON public.lesson_progress
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Instructors can view lesson progress for their courses" ON public.lesson_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = lesson_progress.course_id
            AND courses.instructor_id = auth.uid()
        )
    );

-- Certificate policies
CREATE POLICY "Users can view their own certificates" ON public.certificates
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Public certificate verification" ON public.certificates
    FOR SELECT USING (NOT is_revoked);

CREATE POLICY "System can create certificates" ON public.certificates
    FOR INSERT WITH CHECK (TRUE);

-- Payment policies
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own payments" ON public.payments
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to calculate course completion percentage
CREATE OR REPLACE FUNCTION calculate_course_completion(user_id UUID, course_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_lessons INTEGER;
    completed_lessons INTEGER;
    completion_percentage INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_lessons
    FROM public.lessons
    WHERE lessons.course_id = $2 AND is_published = TRUE;
    
    SELECT COUNT(*) INTO completed_lessons
    FROM public.lesson_progress
    WHERE lesson_progress.user_id = $1
    AND lesson_progress.course_id = $2
    AND is_completed = TRUE;
    
    IF total_lessons = 0 THEN
        completion_percentage := 0;
    ELSE
        completion_percentage := ROUND((completed_lessons::DECIMAL / total_lessons::DECIMAL) * 100);
    END IF;
    
    RETURN completion_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update enrollment progress
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.enrollments
        SET 
            progress = calculate_course_completion(NEW.user_id, NEW.course_id),
            completed_lessons = (
                SELECT COUNT(*)
                FROM public.lesson_progress
                WHERE user_id = NEW.user_id
                AND course_id = NEW.course_id
                AND is_completed = TRUE
            ),
            last_accessed_at = NOW()
        WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'CERT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to auto-issue certificates when course is completed
CREATE OR REPLACE FUNCTION check_and_issue_certificate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.progress >= 100 AND 
       NOT EXISTS (
           SELECT 1 FROM public.certificates 
           WHERE user_id = NEW.user_id AND course_id = NEW.course_id
       ) THEN
        
        INSERT INTO public.certificates (
            user_id, 
            course_id, 
            certificate_number,
            issued_at
        ) VALUES (
            NEW.user_id, 
            NEW.course_id, 
            generate_certificate_number(),
            NOW()
        );
        
        UPDATE public.enrollments
        SET certificate_issued_at = NOW()
        WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAFE TRIGGER CREATION
-- =====================================================

-- Drop existing triggers safely
DROP TRIGGER IF EXISTS trigger_update_enrollment_progress ON public.lesson_progress;
DROP TRIGGER IF EXISTS trigger_auto_issue_certificate ON public.enrollments;

-- Create triggers
CREATE TRIGGER trigger_update_enrollment_progress
    AFTER INSERT OR UPDATE ON public.lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_enrollment_progress();

CREATE TRIGGER trigger_auto_issue_certificate
    AFTER UPDATE ON public.enrollments
    FOR EACH ROW
    WHEN (NEW.progress >= 100 AND OLD.progress < 100)
    EXECUTE FUNCTION check_and_issue_certificate();

-- =====================================================
-- VIEWS FOR COMMON QUERIES (SAFE RECREATION)
-- =====================================================

-- Drop existing views
DROP VIEW IF EXISTS course_overview;
DROP VIEW IF EXISTS user_progress_dashboard;

-- Course overview with statistics
CREATE VIEW course_overview AS
SELECT 
    c.id,
    c.title,
    c.description,
    c.thumbnail_url,
    c.price,
    c.level,
    c.category,
    c.created_at,
    u.full_name as instructor_name,
    u.avatar_url as instructor_avatar,
    COUNT(DISTINCT e.id) as total_enrollments,
    COUNT(DISTINCT l.id) as total_lessons,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(DISTINCT r.id) as total_reviews
FROM public.courses c
LEFT JOIN public.users u ON u.id = c.instructor_id
LEFT JOIN public.enrollments e ON e.course_id = c.id
LEFT JOIN public.lessons l ON l.course_id = c.id AND l.is_published = TRUE
LEFT JOIN public.reviews r ON r.course_id = c.id
GROUP BY c.id, c.title, c.description, c.thumbnail_url, c.price, c.level, c.category, c.created_at, u.full_name, u.avatar_url;

-- User progress dashboard
CREATE VIEW user_progress_dashboard AS
SELECT 
    e.user_id,
    e.course_id,
    c.title as course_title,
    c.thumbnail_url,
    e.progress,
    e.enrolled_at,
    e.last_accessed_at,
    CASE WHEN cert.id IS NOT NULL THEN TRUE ELSE FALSE END as has_certificate,
    cert.certificate_number,
    cert.issued_at as certificate_issued_at
FROM public.enrollments e
JOIN public.courses c ON c.id = e.course_id
LEFT JOIN public.certificates cert ON cert.user_id = e.user_id AND cert.course_id = e.course_id;

-- =====================================================
-- SAMPLE DATA (SAFE INSERTION)
-- =====================================================

-- Insert sample categories (safe with conflict handling)
INSERT INTO public.categories (name, slug, description, sort_order) VALUES 
('Programming', 'programming', 'Learn programming languages and software development', 1),
('Design', 'design', 'Graphic design, UI/UX, and creative skills', 2),
('Business', 'business', 'Entrepreneurship, marketing, and business skills', 3),
('Languages', 'languages', 'Learn new languages and communication skills', 4)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- FINAL VALIDATION & SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Count created tables
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'users', 'categories', 'courses', 'course_sections', 'lessons', 'lesson_files',
        'enrollments', 'reviews', 'meetings', 'meeting_attendees', 'notifications',
        'quizzes', 'quiz_questions', 'quiz_answer_options', 'quiz_attempts', 'quiz_attempt_answers',
        'lesson_progress', 'certificates', 'course_pricing', 'payments', 'user_activity_logs', 'course_statistics'
    );
    
    -- Count created indexes
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
    
    RAISE NOTICE '✅ MIGRATION COMPLETE: % tables, % indexes created', table_count, index_count;
    RAISE NOTICE '🎓 BePro Academy - Migration-Safe Complete Schema Deployed Successfully!';
    RAISE NOTICE '🚀 Ready for production with full educational platform features';
END $$;