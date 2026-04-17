-- =====================================================
-- BePro Academy - Meetings & Notifications Schema
-- Migration: 002_meetings_notifications.sql
-- =====================================================

-- =====================================================
-- MEETINGS TABLE
-- =====================================================
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

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_meetings_course_id ON public.meetings(course_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON public.meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON public.meetings(created_by);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
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

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- =====================================================
-- LESSON FILES TABLE (for attachments)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.lesson_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER,
    file_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_lesson_files_lesson_id ON public.lesson_files(lesson_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_files ENABLE ROW LEVEL SECURITY;

-- MEETINGS POLICIES
-- Anyone can view meetings for courses they're enrolled in
CREATE POLICY "Users can view meetings for enrolled courses"
    ON public.meetings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments
            WHERE enrollments.course_id = meetings.course_id
            AND enrollments.user_id = auth.uid()
        )
        OR
        created_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Teachers can create meetings for their courses
CREATE POLICY "Teachers can create meetings for their courses"
    ON public.meetings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = course_id
            AND courses.instructor_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Teachers can update their own meetings
CREATE POLICY "Teachers can update their own meetings"
    ON public.meetings FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Teachers can delete their own meetings
CREATE POLICY "Teachers can delete their own meetings"
    ON public.meetings FOR DELETE
    USING (created_by = auth.uid());

-- NOTIFICATIONS POLICIES
-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

-- Teachers/Admins can create notifications
CREATE POLICY "Teachers and admins can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('teacher', 'admin')
        )
    );

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- LESSON FILES POLICIES
-- Anyone enrolled can view lesson files
CREATE POLICY "Users can view lesson files for enrolled courses"
    ON public.lesson_files FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons
            JOIN public.enrollments ON enrollments.course_id = lessons.course_id
            WHERE lessons.id = lesson_files.lesson_id
            AND enrollments.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.lessons
            JOIN public.courses ON courses.id = lessons.course_id
            WHERE lessons.id = lesson_files.lesson_id
            AND courses.instructor_id = auth.uid()
        )
    );

-- Teachers can add files to their course lessons
CREATE POLICY "Teachers can add files to their lessons"
    ON public.lesson_files FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lessons
            JOIN public.courses ON courses.id = lessons.course_id
            WHERE lessons.id = lesson_id
            AND courses.instructor_id = auth.uid()
        )
    );

-- Teachers can delete files from their lessons
CREATE POLICY "Teachers can delete their lesson files"
    ON public.lesson_files FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons
            JOIN public.courses ON courses.id = lessons.course_id
            WHERE lessons.id = lesson_files.lesson_id
            AND courses.instructor_id = auth.uid()
        )
    );

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON public.meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================
-- Uncomment to add sample data
/*
INSERT INTO public.meetings (course_id, created_by, title, description, meet_link, scheduled_at, duration_minutes)
SELECT 
    (SELECT id FROM public.courses LIMIT 1),
    (SELECT id FROM public.users WHERE role = 'teacher' LIMIT 1),
    'جلسة مراجعة - الأسبوع الأول',
    'مراجعة لمحتوى الأسبوع الأول والإجابة على الأسئلة',
    'https://meet.google.com/abc-defg-hij',
    NOW() + INTERVAL '1 day',
    60
WHERE EXISTS (SELECT 1 FROM public.courses) AND EXISTS (SELECT 1 FROM public.users WHERE role = 'teacher');
*/