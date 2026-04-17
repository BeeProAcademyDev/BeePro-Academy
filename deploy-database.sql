-- =====================================================
-- BePro Academy - Complete Database Deployment Script
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 2: Apply Core Schema (from schema.sql)
-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('student','instructor','admin')) DEFAULT 'student',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COURSES TABLE
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT CHECK (category IN ('programming','graphic','it','financial')),
  description TEXT,
  instructor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  thumbnail_url TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  level TEXT CHECK (level IN ('beginner','intermediate','advanced')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LESSONS TABLE
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT,
  duration INTEGER,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Apply Enhanced Schema (from 003_enhanced_education_platform.sql)
-- This will add all the advanced features like quizzes, certificates, etc.
-- Copy and paste the contents of 003_enhanced_education_platform.sql here
-- Or run it separately after this script

-- Step 4: Apply Storage Configuration (from storage-buckets-config.sql)
-- Run this after the main schema is deployed
-- Copy and paste the contents of storage-buckets-config.sql

-- Step 5: Enable RLS and Basic Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public can view user profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view courses" ON courses
  FOR SELECT USING (true);

CREATE POLICY "Instructors can create courses" ON courses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('instructor', 'admin'))
  );

CREATE POLICY "Instructors can update their own courses" ON courses
  FOR UPDATE USING (instructor_id = auth.uid());

CREATE POLICY "Admins can manage all courses" ON courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Step 6: Create Basic Indexes
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_course ON reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

-- =====================================================
-- DEPLOYMENT INSTRUCTIONS
-- =====================================================
/*
1. Run this script first in Supabase SQL Editor
2. Then run the enhanced schema: 003_enhanced_education_platform.sql
3. Finally run the storage configuration: storage-buckets-config.sql

OR

Copy the contents of each file and run them in sequence:
1. This file (basic setup)
2. 003_enhanced_education_platform.sql (full features)
3. storage-buckets-config.sql (file storage)
*/

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'BePro Academy Database - Basic setup completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run 003_enhanced_education_platform.sql for full features';
    RAISE NOTICE '2. Run storage-buckets-config.sql for file storage';
    RAISE NOTICE '3. Create your admin user in Authentication panel';
END $$;