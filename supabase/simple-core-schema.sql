-- =====================================================
-- BePro Academy - Simple Core Schema
-- Essential tables for sign up/sign in and course creation
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE AUTHENTICATION & USER MANAGEMENT
-- =====================================================

-- USERS TABLE (Main authentication table)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('student','instructor','admin')) DEFAULT 'student',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CATEGORIES TABLE (For course organization)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COURSE MANAGEMENT SYSTEM
-- =====================================================

-- COURSES TABLE (Main course structure)
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('programming','graphic','it','financial')),
    instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    thumbnail_url TEXT,
    price NUMERIC(10,2) DEFAULT 0,
    level TEXT CHECK (level IN ('beginner','intermediate','advanced')),
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COURSE SECTIONS (For organizing lessons into modules)
CREATE TABLE IF NOT EXISTS public.course_sections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LESSONS TABLE (Individual course lessons)
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT,
    duration INTEGER,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to lessons table safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='section_id') THEN
        ALTER TABLE public.lessons ADD COLUMN section_id UUID REFERENCES public.course_sections(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='description') THEN
        ALTER TABLE public.lessons ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='is_published') THEN
        ALTER TABLE public.lessons ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- LESSON FILES (Attachments, PDFs, etc.)
CREATE TABLE IF NOT EXISTS public.lesson_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENROLLMENTS TABLE (Student course enrollment)
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, course_id)
);

-- LESSON PROGRESS (Track student progress through lessons)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, lesson_id)
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Course indexes  
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(is_published);

-- Lesson indexes
CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.lessons(course_id);

-- Create indexes only if columns exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='is_published') THEN
        CREATE INDEX IF NOT EXISTS idx_lessons_published ON public.lessons(is_published);
    END IF;
END $$;

-- Section indexes
CREATE INDEX IF NOT EXISTS idx_course_sections_course ON public.course_sections(course_id);

-- Create section_id index only if column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='section_id') THEN
        CREATE INDEX IF NOT EXISTS idx_lessons_section ON public.lessons(section_id);
    END IF;
END $$;

-- Progress indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course ON public.lesson_progress(course_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (SAFE CREATION WITH EXISTING POLICY HANDLING)
-- =====================================================

-- Drop existing policies safely to recreate them
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing policies on our tables
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors, policy might not exist
            NULL;
        END;
    END LOOP;
END $$;

-- Users policies (for profile management)
CREATE POLICY "Users can view all profiles" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Categories policies (public read)
CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Courses policies
CREATE POLICY "Anyone can view published courses" ON public.courses
    FOR SELECT USING (
        is_published = true OR
        instructor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

CREATE POLICY "Instructors can create courses" ON public.courses
    FOR INSERT WITH CHECK (
        auth.uid() = instructor_id AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('instructor', 'admin'))
    );

CREATE POLICY "Instructors can update their own courses" ON public.courses
    FOR UPDATE USING (
        instructor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

CREATE POLICY "Instructors can delete their own courses" ON public.courses
    FOR DELETE USING (
        instructor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Course sections policies
CREATE POLICY "Users can view course sections" ON public.course_sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = course_sections.course_id
            AND (courses.is_published = true OR courses.instructor_id = auth.uid())
        ) OR
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

CREATE POLICY "Instructors can manage their course sections" ON public.course_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = course_sections.course_id
            AND courses.instructor_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Lessons policies
CREATE POLICY "Users can view lessons" ON public.lessons
    FOR SELECT USING (true);

CREATE POLICY "Instructors can manage their course lessons" ON public.lessons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = lessons.course_id
            AND courses.instructor_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Lesson files policies
CREATE POLICY "Users can view lesson files" ON public.lesson_files
    FOR SELECT USING (true);

CREATE POLICY "Instructors can manage lesson files" ON public.lesson_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.lessons
            JOIN public.courses ON courses.id = lessons.course_id
            WHERE lessons.id = lesson_files.lesson_id
            AND courses.instructor_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Enrollments policies
CREATE POLICY "Users can view their own enrollments" ON public.enrollments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Students can enroll in courses" ON public.enrollments
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own enrollment progress" ON public.enrollments
    FOR UPDATE USING (user_id = auth.uid());

-- Lesson progress policies
CREATE POLICY "Users can manage their own progress" ON public.lesson_progress
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =====================================================

-- Function to calculate course progress
CREATE OR REPLACE FUNCTION calculate_course_progress(p_user_id UUID, p_course_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_lessons INTEGER;
    completed_lessons INTEGER;
    progress_percentage INTEGER;
BEGIN
    -- Get total published lessons for the course
    SELECT COUNT(*) INTO total_lessons
    FROM public.lessons
    WHERE course_id = p_course_id AND is_published = true;
    
    -- Get completed lessons for the user
    SELECT COUNT(*) INTO completed_lessons
    FROM public.lesson_progress
    WHERE user_id = p_user_id 
    AND course_id = p_course_id 
    AND is_completed = true;
    
    -- Calculate percentage
    IF total_lessons = 0 THEN
        progress_percentage := 0;
    ELSE
        progress_percentage := ROUND((completed_lessons::DECIMAL / total_lessons::DECIMAL) * 100);
    END IF;
    
    RETURN progress_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update enrollment progress automatically
CREATE OR REPLACE FUNCTION update_course_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update enrollment progress when lesson progress changes
    UPDATE public.enrollments
    SET progress = calculate_course_progress(NEW.user_id, NEW.course_id)
    WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update course progress when lesson is completed
CREATE OR REPLACE TRIGGER trigger_update_course_progress
    AFTER INSERT OR UPDATE ON public.lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_course_progress();

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample categories
INSERT INTO public.categories (name, slug, description) VALUES 
('Programming', 'programming', 'Learn programming languages and software development'),
('Design', 'design', 'Graphic design, UI/UX, and creative skills'),
('Business', 'business', 'Entrepreneurship, marketing, and business skills'),
('IT & Technology', 'it', 'Information technology and technical skills')
ON CONFLICT (slug) DO NOTHING;

-- Success message
SELECT 'BePro Academy - Simple Core Schema Deployed Successfully!' as message,
       'Ready for user authentication and course creation!' as status;