-- =====================================================
-- BePro Academy - Initial Schema (Source of Truth)
-- Migration: 001_init.sql
--
-- This migration replaces the old `supabase/schema.sql` approach.
-- Keep ALL schema changes in `supabase/migrations/*` to avoid drift.
-- =====================================================

-- Extensions required by later migrations (e.g. gen_random_uuid()).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text CHECK (role IN ('student','instructor','admin')) DEFAULT 'student',
  avatar_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  category text CHECK (category IN ('programming','graphic','it','financial')),
  description text,
  instructor_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  thumbnail_url text,
  price numeric(10,2) DEFAULT 0,
  level text CHECK (level IN ('beginner','intermediate','advanced')),
  created_at timestamp with time zone DEFAULT now()
);

-- LESSONS TABLE
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  video_url text,
  duration integer,
  order_index integer,
  created_at timestamp with time zone DEFAULT now()
);

-- ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  enrolled_at timestamp with time zone DEFAULT now()
);

-- REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- NOTE: This policy allows public reads of `public.users`.
-- It existed in the previous schema and is preserved to avoid breaking existing app behavior.
CREATE POLICY "Public can view user profiles" ON public.users
  FOR SELECT USING (true);

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

-- Lessons policies
CREATE POLICY "Anyone can view lessons" ON public.lessons
  FOR SELECT USING (true);

CREATE POLICY "Instructors can manage lessons of their courses" ON public.lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE public.courses.id = public.lessons.course_id
      AND public.courses.instructor_id = auth.uid()
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
      WHERE public.enrollments.user_id = auth.uid()
      AND public.enrollments.course_id = public.reviews.course_id
    )
  );

CREATE POLICY "Users can update their own reviews" ON public.reviews
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews" ON public.reviews
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_course ON public.reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);

