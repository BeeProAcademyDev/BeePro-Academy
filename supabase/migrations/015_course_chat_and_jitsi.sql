-- =====================================================
-- BePro Academy - Course Chat & Jitsi Integration
-- Migration: 015_course_chat_and_jitsi.sql
-- =====================================================

-- Ensure meetings table exists (normally created in 002; safe if 002 was skipped)
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

CREATE INDEX IF NOT EXISTS idx_meetings_course_id ON public.meetings(course_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON public.meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON public.meetings(created_by);

-- Extend existing meetings table for Jitsi (no-op if columns already exist)
ALTER TABLE public.meetings
    ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'google_meet';

ALTER TABLE public.meetings
    ADD COLUMN IF NOT EXISTS jitsi_room_name VARCHAR(255);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'meetings_platform_check'
          AND conrelid = 'public.meetings'::regclass
    ) THEN
        ALTER TABLE public.meetings
            ADD CONSTRAINT meetings_platform_check
            CHECK (platform IN ('google_meet', 'jitsi'));
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Make meet_link optional for Jitsi-only sessions
DO $$
BEGIN
    ALTER TABLE public.meetings ALTER COLUMN meet_link DROP NOT NULL;
EXCEPTION
    WHEN undefined_column THEN NULL;
END $$;

-- Basic RLS (same as 002; safe if 002 was never applied)
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view meetings for enrolled courses" ON public.meetings;
CREATE POLICY "Users can view meetings for enrolled courses"
    ON public.meetings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments
            WHERE enrollments.course_id = meetings.course_id
            AND enrollments.user_id = auth.uid()
        )
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Teachers can create meetings for their courses" ON public.meetings;
CREATE POLICY "Teachers can create meetings for their courses"
    ON public.meetings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = course_id AND courses.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Teachers can update their own meetings" ON public.meetings;
CREATE POLICY "Teachers can update their own meetings"
    ON public.meetings FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete their own meetings" ON public.meetings;
CREATE POLICY "Teachers can delete their own meetings"
    ON public.meetings FOR DELETE
    USING (created_by = auth.uid());

-- =====================================================
-- COURSE CHAT: one conversation per student per course
-- =====================================================
CREATE TABLE IF NOT EXISTS public.course_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_course_student_conversation UNIQUE (course_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.course_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.course_conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_conversations_course_id ON public.course_conversations(course_id);
CREATE INDEX IF NOT EXISTS idx_course_conversations_student_id ON public.course_conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_course_conversations_instructor_id ON public.course_conversations(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_messages_conversation_id ON public.course_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_course_messages_created_at ON public.course_messages(created_at);

-- Update conversation timestamp on new message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.course_conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.course_messages;
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON public.course_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.course_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: students see their own, instructors see course conversations
DROP POLICY IF EXISTS "Students can view own conversations" ON public.course_conversations;
CREATE POLICY "Students can view own conversations"
    ON public.course_conversations FOR SELECT
    USING (
        student_id = auth.uid()
        OR instructor_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Students can create conversations when enrolled" ON public.course_conversations;
CREATE POLICY "Students can create conversations when enrolled"
    ON public.course_conversations FOR INSERT
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.enrollments
            WHERE enrollments.course_id = course_conversations.course_id
            AND enrollments.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = course_conversations.course_id
            AND courses.instructor_id = course_conversations.instructor_id
        )
    );

-- Messages: participants only
DROP POLICY IF EXISTS "Conversation participants can view messages" ON public.course_messages;
CREATE POLICY "Conversation participants can view messages"
    ON public.course_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.course_conversations cc
            WHERE cc.id = course_messages.conversation_id
            AND (cc.student_id = auth.uid() OR cc.instructor_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Conversation participants can send messages" ON public.course_messages;
CREATE POLICY "Conversation participants can send messages"
    ON public.course_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.course_conversations cc
            WHERE cc.id = course_messages.conversation_id
            AND (cc.student_id = auth.uid() OR cc.instructor_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.course_messages;
CREATE POLICY "Recipients can mark messages as read"
    ON public.course_messages FOR UPDATE
    USING (
        sender_id != auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.course_conversations cc
            WHERE cc.id = course_messages.conversation_id
            AND (cc.student_id = auth.uid() OR cc.instructor_id = auth.uid())
        )
    )
    WITH CHECK (
        sender_id != auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.course_conversations cc
            WHERE cc.id = course_messages.conversation_id
            AND (cc.student_id = auth.uid() OR cc.instructor_id = auth.uid())
        )
    );

-- =====================================================
-- REALTIME for chat messages
-- =====================================================
ALTER TABLE public.course_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.course_messages;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;

SELECT '015_course_chat_and_jitsi applied' AS message;
