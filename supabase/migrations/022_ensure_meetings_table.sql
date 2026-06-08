-- =====================================================
-- Ensure meetings table exists (live sessions)
-- Migration: 022_ensure_meetings_table.sql
--
-- Run this if students see:
--   Could not find the table 'public.meetings' in the schema cache
-- =====================================================

CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meet_link VARCHAR(500),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
    recording_url VARCHAR(500),
    platform VARCHAR(20) DEFAULT 'google_meet',
    jitsi_room_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.meetings
    ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'google_meet';

ALTER TABLE public.meetings
    ADD COLUMN IF NOT EXISTS jitsi_room_name VARCHAR(255);

DO $$
BEGIN
    ALTER TABLE public.meetings ALTER COLUMN meet_link DROP NOT NULL;
EXCEPTION
    WHEN undefined_column THEN NULL;
END $$;

ALTER TABLE public.meetings
    DROP CONSTRAINT IF EXISTS meetings_platform_check;

ALTER TABLE public.meetings
    ADD CONSTRAINT meetings_platform_check
    CHECK (platform IN ('google_meet', 'jitsi'));

CREATE INDEX IF NOT EXISTS idx_meetings_course_id ON public.meetings(course_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON public.meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON public.meetings(created_by);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view meetings for enrolled courses" ON public.meetings;
CREATE POLICY "Users can view meetings for enrolled courses"
    ON public.meetings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = meetings.course_id
              AND e.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.payment_submissions ps
            WHERE ps.course_id = meetings.course_id
              AND ps.student_id = auth.uid()
              AND ps.status = 'approved'
        )
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = meetings.course_id
              AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Teachers can create meetings for their courses" ON public.meetings;
CREATE POLICY "Teachers can create meetings for their courses"
    ON public.meetings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_id AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Teachers can update their own meetings" ON public.meetings;
CREATE POLICY "Teachers can update their own meetings"
    ON public.meetings FOR UPDATE
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = meetings.course_id AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    )
    WITH CHECK (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = meetings.course_id AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Teachers can delete their own meetings" ON public.meetings;
CREATE POLICY "Teachers can delete their own meetings"
    ON public.meetings FOR DELETE
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = meetings.course_id AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.meetings TO authenticated;

SELECT '022_ensure_meetings_table applied' AS message;
