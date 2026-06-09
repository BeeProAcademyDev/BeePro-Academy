-- =====================================================
-- BePro Academy - Production Migrations 015 to 034
-- Run this ONCE in Supabase Dashboard -> SQL Editor
-- Project: your hosted Supabase (same as VITE_SUPABASE_URL)
-- =====================================================
-- Includes: Jitsi meetings, course chat, realtime, notifications,
--           role approval, payment gates, and security hardening.
-- Safe to re-run: migrations use IF NOT EXISTS / CREATE OR REPLACE.
-- =====================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 015_course_chat_and_jitsi.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 016_role_approval_system.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- BePro Academy - Role Approval System
-- Migration: 016_role_approval_system.sql
-- Adds pending_instructor role for teacher signup approval
-- =====================================================

-- 1) Extend allowed roles
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('student', 'pending_instructor', 'instructor', 'admin'));

-- 2) Update auth profile trigger: instructor signups become pending_instructor
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    resolved_role TEXT;
BEGIN
    resolved_role := CASE
        WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
        WHEN NEW.raw_user_meta_data->>'role' = 'pending_instructor' THEN 'pending_instructor'
        WHEN NEW.raw_user_meta_data->>'role' IN ('instructor', 'teacher') THEN 'pending_instructor'
        WHEN NEW.raw_user_meta_data->>'role' = 'student' THEN 'student'
        ELSE 'student'
    END;

    BEGIN
        INSERT INTO public.users (id, email, full_name, role)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(
                NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
                split_part(NEW.email, '@', 1),
                'Student'
            ),
            resolved_role
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION
        WHEN unique_violation THEN
            NULL;
    END;

    RETURN NEW;
END;
$$;

-- 3) Admin role update function supports pending_instructor
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    target_user_id UUID,
    new_role TEXT,
    admin_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = admin_user_id AND users.role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    IF new_role NOT IN ('student', 'pending_instructor', 'instructor', 'admin') THEN
        RETURN '{"success": false, "error": "Invalid role specified."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = target_user_id
    ) THEN
        RETURN '{"success": false, "error": "Target user not found."}'::JSON;
    END IF;

    IF target_user_id = admin_user_id AND new_role != 'admin' THEN
        RETURN '{"success": false, "error": "Cannot change your own admin role."}'::JSON;
    END IF;

    UPDATE public.users
    SET role = new_role
    WHERE id = target_user_id;

    RETURN '{"success": true, "message": "User role updated successfully."}'::JSON;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Approve instructor application
CREATE OR REPLACE FUNCTION public.admin_approve_instructor(
    target_user_id UUID,
    admin_user_id UUID
)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = admin_user_id AND users.role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = target_user_id AND role = 'pending_instructor'
    ) THEN
        RETURN '{"success": false, "error": "User is not pending instructor approval."}'::JSON;
    END IF;

    UPDATE public.users
    SET role = 'instructor'
    WHERE id = target_user_id;

    RETURN '{"success": true, "message": "Instructor approved successfully."}'::JSON;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Reject instructor application
CREATE OR REPLACE FUNCTION public.admin_reject_instructor(
    target_user_id UUID,
    admin_user_id UUID
)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = admin_user_id AND users.role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = target_user_id AND role = 'pending_instructor'
    ) THEN
        RETURN '{"success": false, "error": "User is not pending instructor approval."}'::JSON;
    END IF;

    UPDATE public.users
    SET role = 'student'
    WHERE id = target_user_id;

    RETURN '{"success": true, "message": "Instructor application rejected."}'::JSON;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_approve_instructor(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_instructor(UUID, UUID) TO authenticated;

SELECT '016_role_approval_system applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 017_security_hardening.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- BePro Academy - Security Hardening
-- Migration: 017_security_hardening.sql
-- Fixes privilege escalation, IDOR, payment/enrollment bypass
-- =====================================================

-- =====================================================
-- 1) Admin email allowlist (server-side, not client metadata)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_email_allowlist (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_email_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins manage allowlist" ON public.admin_email_allowlist;
CREATE POLICY "Only admins manage allowlist"
    ON public.admin_email_allowlist
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Seed common dev admin (replace in production via SQL Editor)
INSERT INTO public.admin_email_allowlist (email)
VALUES ('admin@bepro.academy')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 2) Resolve signup role server-side (never trust metadata admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.resolve_signup_role(meta_role TEXT, user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    normalized_email TEXT := lower(trim(coalesce(user_email, '')));
    normalized_meta TEXT := lower(trim(coalesce(meta_role, '')));
BEGIN
    IF normalized_email <> ''
       AND EXISTS (
           SELECT 1 FROM public.admin_email_allowlist a
           WHERE lower(a.email) = normalized_email
       ) THEN
        RETURN 'admin';
    END IF;

    IF normalized_meta IN ('instructor', 'teacher', 'pending_instructor') THEN
        RETURN 'pending_instructor';
    END IF;

    RETURN 'student';
END;
$$;

-- =====================================================
-- 3) Protect role column from client tampering
-- =====================================================
CREATE OR REPLACE FUNCTION public.protect_user_role_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Role changes require authentication';
        END IF;

        -- Allowlisted user may promote only their own account to admin
        IF NEW.role = 'admin'
           AND OLD.role <> 'admin'
           AND auth.uid() = NEW.id
           AND EXISTS (
               SELECT 1 FROM public.admin_email_allowlist a
               WHERE lower(a.email) = lower(NEW.email)
           ) THEN
            RETURN NEW;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Role changes require admin authorization';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.role IS NULL OR NEW.role NOT IN ('student', 'pending_instructor', 'instructor', 'admin') THEN
            NEW.role := 'student';
        END IF;

        -- Self-registration: only student, pending_instructor, or allowlisted admin email
        IF auth.uid() = NEW.id THEN
            IF NEW.role = 'admin' THEN
                IF NOT EXISTS (
                    SELECT 1 FROM public.admin_email_allowlist a
                    WHERE lower(a.email) = lower(NEW.email)
                ) THEN
                    NEW.role := 'student';
                END IF;
            ELSIF NEW.role = 'instructor' THEN
                NEW.role := 'pending_instructor';
            ELSIF NEW.role NOT IN ('student', 'pending_instructor') THEN
                NEW.role := 'student';
            END IF;
            RETURN NEW;
        END IF;

        IF NEW.role IN ('instructor', 'admin')
           AND NOT EXISTS (
               SELECT 1 FROM public.users
               WHERE id = auth.uid() AND role = 'admin'
           ) THEN
            NEW.role := 'student';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_user_role ON public.users;
CREATE TRIGGER trigger_protect_user_role
    BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_user_role_column();

-- =====================================================
-- 4) Safe auth profile sync trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    resolved_role TEXT;
BEGIN
    resolved_role := public.resolve_signup_role(
        NEW.raw_user_meta_data->>'role',
        NEW.email
    );

    BEGIN
        INSERT INTO public.users (id, email, full_name, role)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(
                NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
                split_part(NEW.email, '@', 1),
                'Student'
            ),
            resolved_role
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION
        WHEN unique_violation THEN
            NULL;
    END;

    RETURN NEW;
END;
$$;

-- =====================================================
-- 5) Restrict public user data exposure
-- =====================================================
DROP POLICY IF EXISTS "Public can view user profiles" ON public.users;

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.users;
CREATE POLICY "Authenticated users can view profiles"
    ON public.users
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Users can only update safe profile fields (role protected by trigger)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users"
    ON public.users
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- =====================================================
-- 6) Admin RPCs use auth.uid() — never client-supplied admin id
-- =====================================================
DROP FUNCTION IF EXISTS public.admin_update_user_role(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.admin_approve_instructor(UUID, UUID);
DROP FUNCTION IF EXISTS public.admin_reject_instructor(UUID, UUID);
DROP FUNCTION IF EXISTS public.admin_get_all_users(UUID);
DROP FUNCTION IF EXISTS public.admin_get_user_details(UUID, UUID);

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    target_user_id UUID,
    new_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN
        RETURN '{"success": false, "error": "Not authenticated."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = caller_id AND role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    IF new_role NOT IN ('student', 'pending_instructor', 'instructor', 'admin') THEN
        RETURN '{"success": false, "error": "Invalid role specified."}'::JSON;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = target_user_id) THEN
        RETURN '{"success": false, "error": "Target user not found."}'::JSON;
    END IF;

    IF target_user_id = caller_id AND new_role <> 'admin' THEN
        RETURN '{"success": false, "error": "Cannot change your own admin role."}'::JSON;
    END IF;

    UPDATE public.users SET role = new_role WHERE id = target_user_id;

    RETURN '{"success": true, "message": "User role updated successfully."}'::JSON;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_instructor(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN
        RETURN '{"success": false, "error": "Not authenticated."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = caller_id AND role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = target_user_id AND role = 'pending_instructor'
    ) THEN
        RETURN '{"success": false, "error": "User is not pending instructor approval."}'::JSON;
    END IF;

    UPDATE public.users SET role = 'instructor' WHERE id = target_user_id;

    RETURN '{"success": true, "message": "Instructor approved successfully."}'::JSON;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_instructor(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN
        RETURN '{"success": false, "error": "Not authenticated."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = caller_id AND role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = target_user_id AND role = 'pending_instructor'
    ) THEN
        RETURN '{"success": false, "error": "User is not pending instructor approval."}'::JSON;
    END IF;

    UPDATE public.users SET role = 'student' WHERE id = target_user_id;

    RETURN '{"success": true, "message": "Instructor application rejected."}'::JSON;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_admin_role_if_allowed()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
    caller_email TEXT;
BEGIN
    IF caller_id IS NULL THEN
        RETURN '{"success": false, "error": "Not authenticated."}'::JSON;
    END IF;

    SELECT lower(trim(email)) INTO caller_email
    FROM public.users
    WHERE id = caller_id;

    IF caller_email IS NULL OR caller_email = '' THEN
        SELECT lower(trim(email)) INTO caller_email
        FROM auth.users
        WHERE id = caller_id;
    END IF;

    IF caller_email IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.admin_email_allowlist a
        WHERE lower(a.email) = caller_email
    ) THEN
        RETURN '{"success": false, "error": "Email is not on admin allowlist."}'::JSON;
    END IF;

    UPDATE public.users SET role = 'admin' WHERE id = caller_id;

    RETURN '{"success": true, "message": "Admin role synchronized."}'::JSON;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
    id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    total_courses BIGINT,
    total_enrollments BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users WHERE users.id = caller_id AND users.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.avatar_url,
        u.created_at,
        COALESCE(courses_count.total, 0) AS total_courses,
        COALESCE(enrollments_count.total, 0) AS total_enrollments
    FROM public.users u
    LEFT JOIN (
        SELECT instructor_id, COUNT(*) AS total
        FROM public.courses
        GROUP BY instructor_id
    ) courses_count ON u.id = courses_count.instructor_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) AS total
        FROM public.enrollments
        GROUP BY user_id
    ) enrollments_count ON u.id = enrollments_count.user_id
    ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_user_details(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
    user_info RECORD;
    courses_data JSON;
    enrollments_data JSON;
BEGIN
    IF caller_id IS NULL THEN
        RETURN '{"success": false, "error": "Not authenticated."}'::JSON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = caller_id AND role = 'admin'
    ) THEN
        RETURN '{"success": false, "error": "Access denied. Admin role required."}'::JSON;
    END IF;

    SELECT * INTO user_info FROM public.users WHERE id = target_user_id;

    IF user_info IS NULL THEN
        RETURN '{"success": false, "error": "User not found."}'::JSON;
    END IF;

    IF user_info.role = 'instructor' THEN
        SELECT json_agg(
            json_build_object(
                'id', c.id,
                'title', c.title,
                'status', 'published',
                'enrollments', COALESCE(e.enrollment_count, 0)
            )
        ) INTO courses_data
        FROM public.courses c
        LEFT JOIN (
            SELECT course_id, COUNT(*) AS enrollment_count
            FROM public.enrollments
            GROUP BY course_id
        ) e ON c.id = e.course_id
        WHERE c.instructor_id = target_user_id;
    END IF;

    IF user_info.role = 'student' THEN
        SELECT json_agg(
            json_build_object(
                'id', en.id,
                'course_title', c.title,
                'instructor_name', i.full_name,
                'progress', en.progress
            )
        ) INTO enrollments_data
        FROM public.enrollments en
        JOIN public.courses c ON c.id = en.course_id
        JOIN public.users i ON i.id = c.instructor_id
        WHERE en.user_id = target_user_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', user_info.id,
            'full_name', user_info.full_name,
            'email', user_info.email,
            'role', user_info.role,
            'avatar_url', user_info.avatar_url,
            'created_at', user_info.created_at
        ),
        'courses', COALESCE(courses_data, '[]'::JSON),
        'enrollments', COALESCE(enrollments_data, '[]'::JSON)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_instructor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_instructor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_admin_role_if_allowed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_signup_role(TEXT, TEXT) TO authenticated;

-- =====================================================
-- 7) Payment submissions — students cannot self-approve
-- =====================================================
DROP POLICY IF EXISTS "Students can create payment submissions" ON public.payment_submissions;
DROP POLICY IF EXISTS "Students create payment submissions" ON public.payment_submissions;

CREATE POLICY "Students can create payment submissions"
    ON public.payment_submissions
    FOR INSERT
    WITH CHECK (
        student_id = auth.uid()
        AND status = 'pending'
        AND reviewed_by IS NULL
        AND reviewed_at IS NULL
        AND EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'student'
        )
    );

DROP POLICY IF EXISTS "Students cannot approve own payments" ON public.payment_submissions;
CREATE POLICY "Students can update own pending submissions"
    ON public.payment_submissions
    FOR UPDATE
    USING (
        student_id = auth.uid()
        AND status = 'pending'
    )
    WITH CHECK (
        student_id = auth.uid()
        AND status = 'pending'
    );

-- =====================================================
-- 8) Enrollment progress — system-managed only
-- =====================================================
CREATE OR REPLACE FUNCTION public.protect_enrollment_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Allow nested DB triggers (lesson_progress -> enrollment progress)
        IF pg_trigger_depth() > 1 THEN
            RETURN NEW;
        END IF;

        IF NEW.progress IS DISTINCT FROM OLD.progress THEN
            RAISE EXCEPTION 'Enrollment progress is system-managed';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_enrollment_progress ON public.enrollments;
CREATE TRIGGER trigger_protect_enrollment_progress
    BEFORE UPDATE ON public.enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_enrollment_progress();

SELECT '017_security_hardening applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 018_enrollment_payment_gate.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- BePro Academy - Enrollment Payment Gate
-- Migration: 018_enrollment_payment_gate.sql
-- Blocks free enrollment bypass for paid courses
-- =====================================================

-- Unique enrollment per student/course
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_user_course_enrollment'
          AND conrelid = 'public.enrollments'::regclass
    ) THEN
        ALTER TABLE public.enrollments
            ADD CONSTRAINT unique_user_course_enrollment UNIQUE (user_id, course_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Check if a user may enroll in a course
CREATE OR REPLACE FUNCTION public.can_student_enroll(
    p_user_id UUID,
    p_course_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = p_user_id AND u.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = p_course_id
              AND c.instructor_id = p_user_id
        )
        OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = p_course_id
              AND COALESCE(c.price, 0) <= 0
        )
        OR EXISTS (
            SELECT 1 FROM public.payment_submissions ps
            WHERE ps.student_id = p_user_id
              AND ps.course_id = p_course_id
              AND ps.status = 'approved'
        );
$$;

-- Safe enrollment entry point for students
CREATE OR REPLACE FUNCTION public.enroll_student_if_eligible(p_course_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_existing UUID;
    v_new_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN '{"success": false, "error": "Not authenticated."}'::JSON;
    END IF;

    IF NOT public.can_student_enroll(v_user_id, p_course_id) THEN
        RETURN '{"success": false, "error": "Payment approval is required before enrolling in this course."}'::JSON;
    END IF;

    SELECT e.id INTO v_existing
    FROM public.enrollments e
    WHERE e.user_id = v_user_id
      AND e.course_id = p_course_id;

    IF v_existing IS NOT NULL THEN
        RETURN json_build_object(
            'success', true,
            'enrollment_id', v_existing,
            'already_enrolled', true
        );
    END IF;

    INSERT INTO public.enrollments (user_id, course_id, progress)
    VALUES (v_user_id, p_course_id, 0)
    RETURNING id INTO v_new_id;

    RETURN json_build_object(
        'success', true,
        'enrollment_id', v_new_id,
        'already_enrolled', false
    );
END;
$$;

-- Tighten enrollment INSERT policy
DROP POLICY IF EXISTS "Users can enroll themselves" ON public.enrollments;

CREATE POLICY "Students can enroll when payment approved or course is free"
    ON public.enrollments
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND public.can_student_enroll(auth.uid(), course_id)
    );

-- Harden payment approval: use auth.uid() as reviewer, auto-enroll via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.approve_payment_submission(
    submission_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reviewer_id UUID := auth.uid();
    submission_record RECORD;
    enrollment_exists BOOLEAN;
BEGIN
    IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT ps.*, c.title AS course_title, u.full_name AS student_name
    INTO submission_record
    FROM public.payment_submissions ps
    JOIN public.courses c ON c.id = ps.course_id
    JOIN public.users u ON u.id = ps.student_id
    WHERE ps.id = submission_id
      AND ps.status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment submission not found or already processed';
    END IF;

    IF submission_record.instructor_id <> v_reviewer_id
       AND NOT EXISTS (
           SELECT 1 FROM public.users
           WHERE id = v_reviewer_id AND role = 'admin'
       ) THEN
        RAISE EXCEPTION 'Only the course instructor or an admin can approve this payment';
    END IF;

    UPDATE public.payment_submissions
    SET
        status = 'approved',
        reviewed_by = v_reviewer_id,
        reviewed_at = NOW(),
        review_notes = approve_payment_submission.review_notes,
        updated_at = NOW()
    WHERE id = submission_id;

    SELECT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE user_id = submission_record.student_id
          AND course_id = submission_record.course_id
    ) INTO enrollment_exists;

    IF NOT enrollment_exists THEN
        INSERT INTO public.enrollments (user_id, course_id, enrolled_at, progress)
        VALUES (submission_record.student_id, submission_record.course_id, NOW(), 0);
    END IF;

    INSERT INTO public.payment_approval_history (
        payment_submission_id, reviewer_id, action, notes
    )
    VALUES (submission_id, v_reviewer_id, 'approved', approve_payment_submission.review_notes);

    BEGIN
        INSERT INTO public.notifications (user_id, course_id, title, message, type, action_url)
        VALUES (
            submission_record.student_id,
            submission_record.course_id,
            'Payment Approved',
            'Your payment for course "' || submission_record.course_title || '" has been approved. You now have access to the course!',
            'payment_approval',
            '/courses/' || submission_record.course_id || '/learn'
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'approve_payment_submission notification skipped: %', SQLERRM;
    END;

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_payment_submission(
    submission_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reviewer_id UUID := auth.uid();
    submission_record RECORD;
BEGIN
    IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT ps.*
    INTO submission_record
    FROM public.payment_submissions ps
    WHERE ps.id = submission_id
      AND ps.status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment submission not found or already processed';
    END IF;

    IF submission_record.instructor_id <> v_reviewer_id
       AND NOT EXISTS (
           SELECT 1 FROM public.users
           WHERE id = v_reviewer_id AND role = 'admin'
       ) THEN
        RAISE EXCEPTION 'Only the course instructor or an admin can reject this payment';
    END IF;

    UPDATE public.payment_submissions
    SET
        status = 'rejected',
        reviewed_by = v_reviewer_id,
        reviewed_at = NOW(),
        review_notes = reject_payment_submission.review_notes,
        updated_at = NOW()
    WHERE id = submission_id;

    INSERT INTO public.payment_approval_history (
        payment_submission_id, reviewer_id, action, notes
    )
    VALUES (submission_id, v_reviewer_id, 'rejected', reject_payment_submission.review_notes);

    RETURN TRUE;
END;
$$;

-- Drop legacy signatures that accepted reviewer_id from client
DROP FUNCTION IF EXISTS public.approve_payment_submission(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_payment_submission(UUID, UUID, TEXT);

GRANT EXECUTE ON FUNCTION public.can_student_enroll(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_student_if_eligible(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_payment_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment_submission(UUID, TEXT) TO authenticated;

SELECT '018_enrollment_payment_gate applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 019_fix_signup_email_conflicts.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- BePro Academy - Fix signup email unique conflicts
-- Migration: 019_fix_signup_email_conflicts.sql
-- Restores conflict-safe email strategy for auth profile sync
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    resolved_role TEXT;
    desired_email TEXT;
BEGIN
    resolved_role := public.resolve_signup_role(
        NEW.raw_user_meta_data->>'role',
        NEW.email
    );

    desired_email := NEW.email;

    IF EXISTS (
        SELECT 1
        FROM public.users ue
        WHERE lower(ue.email) = lower(NEW.email)
          AND ue.id <> NEW.id
    ) THEN
        desired_email := 'user-' || NEW.id::text || '@profile.local';
    END IF;

    BEGIN
        INSERT INTO public.users (id, email, full_name, role)
        VALUES (
            NEW.id,
            desired_email,
            COALESCE(
                NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
                split_part(NEW.email, '@', 1),
                'Student'
            ),
            resolved_role
        )
        ON CONFLICT (id) DO UPDATE
        SET
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role;
    EXCEPTION
        WHEN unique_violation THEN
            NULL;
    END;

    RETURN NEW;
END;
$$;

SELECT '019_fix_signup_email_conflicts applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 020_fix_payment_submissions_rls_recursion.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- Fix infinite recursion in payment_submissions RLS
-- Migration: 020_fix_payment_submissions_rls_recursion.sql
--
-- Problem: policy "Students cannot approve own payments" (017) runs
--   SELECT ... FROM payment_submissions inside an UPDATE policy on the
--   same table, which triggers infinite RLS recursion on any UPDATE.
-- =====================================================

DROP POLICY IF EXISTS "Students cannot approve own payments" ON public.payment_submissions;

-- Students may edit their own submission only while it remains pending.
-- They cannot change status to approved/rejected (no self-approval).
CREATE POLICY "Students can update own pending submissions"
    ON public.payment_submissions
    FOR UPDATE
    USING (
        student_id = auth.uid()
        AND status = 'pending'
    )
    WITH CHECK (
        student_id = auth.uid()
        AND status = 'pending'
    );

-- Ensure reviewer policies remain in place
DROP POLICY IF EXISTS "Instructors can update payment submissions for their courses" ON public.payment_submissions;
CREATE POLICY "Instructors can update payment submissions for their courses"
    ON public.payment_submissions
    FOR UPDATE
    USING (
        instructor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('instructor', 'admin')
        )
    )
    WITH CHECK (
        instructor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('instructor', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update all payment submissions" ON public.payment_submissions;
CREATE POLICY "Admins can update all payment submissions"
    ON public.payment_submissions
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

SELECT '020_fix_payment_submissions_rls_recursion applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 021_fix_notifications_columns.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- Fix notifications schema for payment approval flows
-- Migration: 021_fix_notifications_columns.sql
--
-- Problem: approve_payment_submission inserts course_id / action_url
-- into notifications, but older databases may lack those columns.
-- =====================================================

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS action_url VARCHAR(500);

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check CHECK (
        type IN (
            'general',
            'meeting',
            'enrollment',
            'course_update',
            'reminder',
            'announcement',
            'payment',
            'payment_approval',
            'payment_rejection',
            'payment_expired',
            'payment_info_requested'
        )
    );

CREATE OR REPLACE FUNCTION public._approve_payment_submission_core(
    submission_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reviewer_id UUID := auth.uid();
    submission_record RECORD;
    enrollment_exists BOOLEAN;
BEGIN
    IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT ps.*, c.title AS course_title, u.full_name AS student_name
    INTO submission_record
    FROM public.payment_submissions ps
    JOIN public.courses c ON c.id = ps.course_id
    JOIN public.users u ON u.id = ps.student_id
    WHERE ps.id = submission_id
      AND ps.status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment submission not found or already processed';
    END IF;

    IF submission_record.instructor_id <> v_reviewer_id
       AND NOT EXISTS (
           SELECT 1 FROM public.users
           WHERE id = v_reviewer_id AND role = 'admin'
       ) THEN
        RAISE EXCEPTION 'Only the course instructor or an admin can approve this payment';
    END IF;

    UPDATE public.payment_submissions
    SET
        status = 'approved',
        reviewed_by = v_reviewer_id,
        reviewed_at = NOW(),
        review_notes = _approve_payment_submission_core.review_notes,
        updated_at = NOW()
    WHERE id = submission_id;

    SELECT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE user_id = submission_record.student_id
          AND course_id = submission_record.course_id
    ) INTO enrollment_exists;

    IF NOT enrollment_exists THEN
        INSERT INTO public.enrollments (user_id, course_id, enrolled_at, progress)
        VALUES (submission_record.student_id, submission_record.course_id, NOW(), 0);
    END IF;

    INSERT INTO public.payment_approval_history (
        payment_submission_id, reviewer_id, action, notes
    )
    VALUES (submission_id, v_reviewer_id, 'approved', _approve_payment_submission_core.review_notes);

    BEGIN
        INSERT INTO public.notifications (user_id, course_id, title, message, type, action_url)
        VALUES (
            submission_record.student_id,
            submission_record.course_id,
            'Payment Approved',
            'Your payment for course "' || submission_record.course_title || '" has been approved. You now have access to the course!',
            'payment_approval',
            '/courses/' || submission_record.course_id || '/learn'
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'approve_payment_submission notification skipped: %', SQLERRM;
    END;

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public._reject_payment_submission_core(
    submission_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reviewer_id UUID := auth.uid();
    submission_record RECORD;
BEGIN
    IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT ps.*, c.title AS course_title
    INTO submission_record
    FROM public.payment_submissions ps
    JOIN public.courses c ON c.id = ps.course_id
    WHERE ps.id = submission_id
      AND ps.status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment submission not found or already processed';
    END IF;

    IF submission_record.instructor_id <> v_reviewer_id
       AND NOT EXISTS (
           SELECT 1 FROM public.users
           WHERE id = v_reviewer_id AND role = 'admin'
       ) THEN
        RAISE EXCEPTION 'Only the course instructor or an admin can reject this payment';
    END IF;

    UPDATE public.payment_submissions
    SET
        status = 'rejected',
        reviewed_by = v_reviewer_id,
        reviewed_at = NOW(),
        review_notes = _reject_payment_submission_core.review_notes,
        updated_at = NOW()
    WHERE id = submission_id;

    INSERT INTO public.payment_approval_history (
        payment_submission_id, reviewer_id, action, notes
    )
    VALUES (submission_id, v_reviewer_id, 'rejected', _reject_payment_submission_core.review_notes);

    BEGIN
        INSERT INTO public.notifications (user_id, course_id, title, message, type, action_url)
        VALUES (
            submission_record.student_id,
            submission_record.course_id,
            'Payment Rejected',
            'Your payment for course "' || submission_record.course_title || '" was rejected.',
            'payment_rejection',
            NULL
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'reject_payment_submission notification skipped: %', SQLERRM;
    END;

    RETURN TRUE;
END;
$$;

DROP FUNCTION IF EXISTS public.approve_payment_submission(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_payment_submission(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.approve_payment_submission(UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_payment_submission(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.approve_payment_submission(
    submission_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public._approve_payment_submission_core(submission_id, review_notes);
$$;

CREATE OR REPLACE FUNCTION public.reject_payment_submission(
    submission_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public._reject_payment_submission_core(submission_id, review_notes);
$$;

CREATE OR REPLACE FUNCTION public.approve_payment_submission(
    submission_id UUID,
    reviewer_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public._approve_payment_submission_core(submission_id, review_notes);
$$;

CREATE OR REPLACE FUNCTION public.reject_payment_submission(
    submission_id UUID,
    reviewer_id UUID,
    review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public._reject_payment_submission_core(submission_id, review_notes);
$$;

GRANT EXECUTE ON FUNCTION public._approve_payment_submission_core(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public._reject_payment_submission_core(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_payment_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_payment_submission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment_submission(UUID, UUID, TEXT) TO authenticated;

SELECT '021_fix_notifications_columns applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 022_ensure_meetings_table.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 023_fix_notifications_insert_rls.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- Fix notifications INSERT RLS for teachers/instructors
-- Migration: 023_fix_notifications_insert_rls.sql
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON TABLE public.notifications TO authenticated;

DROP POLICY IF EXISTS "Teachers and admins can create notifications" ON public.notifications;

CREATE POLICY "Teachers and admins can create notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
              AND u.role IN ('instructor', 'teacher', 'admin')
        )
        OR (
            course_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.courses c
                WHERE c.id = notifications.course_id
                  AND c.instructor_id = auth.uid()
            )
        )
    );

-- SECURITY DEFINER helper: notify eligible students (bypasses INSERT RLS safely)
CREATE OR REPLACE FUNCTION public.notify_course_students(
    p_course_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'meeting',
    p_action_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
    course_price NUMERIC;
    student_ids UUID[];
    inserted_count INT := 0;
BEGIN
    IF caller_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = p_course_id AND c.instructor_id = caller_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = caller_id AND u.role = 'admin'
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only the course instructor or admin can notify students'
        );
    END IF;

    SELECT COALESCE(c.price, 0)
    INTO course_price
    FROM public.courses c
    WHERE c.id = p_course_id;

    IF course_price > 0 THEN
        SELECT COALESCE(array_agg(DISTINCT ps.student_id), ARRAY[]::UUID[])
        INTO student_ids
        FROM public.payment_submissions ps
        WHERE ps.course_id = p_course_id
          AND ps.status = 'approved';
    ELSE
        SELECT COALESCE(array_agg(DISTINCT e.user_id), ARRAY[]::UUID[])
        INTO student_ids
        FROM public.enrollments e
        WHERE e.course_id = p_course_id;
    END IF;

    IF student_ids IS NULL OR array_length(student_ids, 1) IS NULL THEN
        RETURN json_build_object('success', true, 'count', 0);
    END IF;

    BEGIN
        INSERT INTO public.notifications (user_id, course_id, title, message, type, action_url)
        SELECT
            unnest(student_ids),
            p_course_id,
            p_title,
            p_message,
            p_type,
            p_action_url;
    EXCEPTION
        WHEN undefined_column THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            SELECT unnest(student_ids), p_title, p_message, p_type;
    END;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    RETURN json_build_object('success', true, 'count', inserted_count);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_course_students(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

SELECT '023_fix_notifications_insert_rls applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 024_fix_meetings_jitsi_backfill.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- Backfill Jitsi room names for in-platform sessions
-- Migration: 024_fix_meetings_jitsi_backfill.sql
-- =====================================================

ALTER TABLE public.meetings
    ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'google_meet';

ALTER TABLE public.meetings
    ADD COLUMN IF NOT EXISTS jitsi_room_name VARCHAR(255);

UPDATE public.meetings
SET
    platform = 'jitsi',
    jitsi_room_name = 'bepro_' || replace(id::text, '-', '')
WHERE meet_link IS NULL
  AND COALESCE(jitsi_room_name, '') = '';

SELECT '024_fix_meetings_jitsi_backfill applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 025_meetings_access_for_paid_students.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- Allow paid (approved) students to view course meetings
-- Migration: 025_meetings_access_for_paid_students.sql
-- =====================================================

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

SELECT '025_meetings_access_for_paid_students applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 026_student_course_meetings_rpc.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- RPC: fetch course meetings for students (bypass RLS gaps)
-- Migration: 026_student_course_meetings_rpc.sql
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_course_meetings_for_student(p_course_id UUID)
RETURNS SETOF public.meetings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.course_id = p_course_id
          AND e.user_id = v_user_id
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.payment_submissions ps
        WHERE ps.course_id = p_course_id
          AND ps.student_id = v_user_id
          AND ps.status = 'approved'
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = p_course_id
          AND c.instructor_id = v_user_id
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = v_user_id
          AND u.role IN ('admin', 'teacher', 'instructor')
    ) THEN
        RAISE EXCEPTION 'Access denied to course meetings';
    END IF;

    RETURN QUERY
    SELECT m.*
    FROM public.meetings m
    WHERE m.course_id = p_course_id
    ORDER BY
        CASE WHEN m.status = 'live' THEN 0 ELSE 1 END,
        m.scheduled_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_meetings_for_student(UUID) TO authenticated;

SELECT '026_student_course_meetings_rpc applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 027_fix_meeting_join_links.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- Fix Jitsi room names + student meetings RPC (computed join fields)
-- Migration: 027_fix_meeting_join_links.sql
-- =====================================================

ALTER TABLE public.meetings
    ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'google_meet';

ALTER TABLE public.meetings
    ADD COLUMN IF NOT EXISTS jitsi_room_name VARCHAR(255);

UPDATE public.meetings
SET jitsi_room_name = COALESCE(
        NULLIF(TRIM(jitsi_room_name), ''),
        'bepro_' || replace(id::text, '-', '')
    )
WHERE COALESCE(NULLIF(TRIM(jitsi_room_name), ''), '') = '';

UPDATE public.meetings
SET platform = 'jitsi'
WHERE (meet_link IS NULL OR TRIM(meet_link) = '')
  AND COALESCE(platform, 'google_meet') <> 'jitsi';

CREATE OR REPLACE FUNCTION public.get_course_meetings_for_student(p_course_id UUID)
RETURNS SETOF public.meetings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.course_id = p_course_id
          AND e.user_id = v_user_id
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.payment_submissions ps
        WHERE ps.course_id = p_course_id
          AND ps.student_id = v_user_id
          AND ps.status = 'approved'
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = p_course_id
          AND c.instructor_id = v_user_id
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = v_user_id
          AND u.role IN ('admin', 'teacher', 'instructor')
    ) THEN
        RAISE EXCEPTION 'Access denied to course meetings';
    END IF;

    RETURN QUERY
    SELECT
        m.id,
        m.course_id,
        m.created_by,
        m.title,
        m.description,
        m.meet_link,
        m.scheduled_at,
        m.duration_minutes,
        m.status,
        m.recording_url,
        CASE
            WHEN m.meet_link IS NOT NULL
                 AND TRIM(m.meet_link) <> ''
                 AND COALESCE(m.platform, 'google_meet') <> 'jitsi'
                 AND COALESCE(NULLIF(TRIM(m.jitsi_room_name), ''), '') = ''
            THEN COALESCE(m.platform, 'google_meet')
            ELSE 'jitsi'
        END AS platform,
        COALESCE(
            NULLIF(TRIM(m.jitsi_room_name), ''),
            'bepro_' || replace(m.id::text, '-', '')
        ) AS jitsi_room_name,
        m.created_at,
        m.updated_at
    FROM public.meetings m
    WHERE m.course_id = p_course_id
    ORDER BY
        CASE WHEN m.status = 'live' THEN 0 ELSE 1 END,
        m.scheduled_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_meetings_for_student(UUID) TO authenticated;

SELECT '027_fix_meeting_join_links applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 028_notifications_student_access.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- Ensure students can read notifications + realtime
-- Migration: 028_notifications_student_access.sql
-- =====================================================

GRANT SELECT, UPDATE ON TABLE public.notifications TO authenticated;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

SELECT '028_notifications_student_access applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 029_fix_notify_and_read_notifications.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- Fix meeting notifications delivery + student read access
-- Migration: 029_fix_notify_and_read_notifications.sql
-- =====================================================

-- Broader student selection + reliable read RPCs
CREATE OR REPLACE FUNCTION public.notify_course_students(
    p_course_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'meeting',
    p_action_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
    student_ids UUID[];
    inserted_count INT := 0;
BEGIN
    IF caller_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = p_course_id AND c.instructor_id = caller_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = caller_id AND u.role = 'admin'
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only the course instructor or admin can notify students'
        );
    END IF;

    SELECT COALESCE(array_agg(DISTINCT eligible.user_id), ARRAY[]::UUID[])
    INTO student_ids
    FROM (
        SELECT e.user_id
        FROM public.enrollments e
        WHERE e.course_id = p_course_id
        UNION
        SELECT ps.student_id AS user_id
        FROM public.payment_submissions ps
        WHERE ps.course_id = p_course_id
          AND LOWER(TRIM(ps.status)) = 'approved'
    ) eligible
    WHERE eligible.user_id IS NOT NULL;

    IF student_ids IS NULL OR array_length(student_ids, 1) IS NULL THEN
        RETURN json_build_object('success', true, 'count', 0);
    END IF;

    BEGIN
        INSERT INTO public.notifications (user_id, course_id, title, message, type, action_url, is_read)
        SELECT
            unnest(student_ids),
            p_course_id,
            p_title,
            p_message,
            p_type,
            p_action_url,
            FALSE;
    EXCEPTION
        WHEN undefined_column THEN
            INSERT INTO public.notifications (user_id, title, message, type, is_read)
            SELECT unnest(student_ids), p_title, p_message, p_type, FALSE;
    END;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    RETURN json_build_object('success', true, 'count', inserted_count);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_course_students(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_notifications(
    p_limit INT DEFAULT 20,
    p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS SETOF public.notifications
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT n.*
    FROM public.notifications n
    WHERE n.user_id = auth.uid()
      AND (NOT p_unread_only OR COALESCE(n.is_read, FALSE) = FALSE)
    ORDER BY n.created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50));
$$;

CREATE OR REPLACE FUNCTION public.get_my_unread_notification_count()
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT COUNT(*)::INT
    FROM public.notifications n
    WHERE n.user_id = auth.uid()
      AND COALESCE(n.is_read, FALSE) = FALSE;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_notifications(INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_unread_notification_count() TO authenticated;

SELECT '029_fix_notify_and_read_notifications applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 030_course_chat_realtime_paid_students.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- Course chat tables + real-time WebSocket (self-contained)
-- Migration: 030_course_chat_realtime_paid_students.sql
-- Safe to run even if 015 was never applied.
-- =====================================================

-- -----------------------------------------------------
-- 1) TABLES
-- -----------------------------------------------------
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

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.course_conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.course_messages;
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON public.course_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_last_message();

-- -----------------------------------------------------
-- 2) HELPERS (must exist before RLS policies below)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_registered_student(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p_user_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = p_user_id
              AND LOWER(TRIM(COALESCE(u.role, 'student'))) NOT IN (
                  'teacher', 'instructor', 'admin', 'pending_instructor'
              )
        );
$$;

GRANT EXECUTE ON FUNCTION public.is_registered_student(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.student_has_course_chat_access(
    p_course_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p_user_id IS NOT NULL
        AND (
            public.is_registered_student(p_user_id)
            OR EXISTS (
                SELECT 1 FROM public.courses c
                WHERE c.id = p_course_id AND c.instructor_id = p_user_id
            )
            OR EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = p_user_id AND u.role = 'admin'
            )
        );
$$;

GRANT EXECUTE ON FUNCTION public.student_has_course_chat_access(UUID, UUID) TO authenticated;

-- -----------------------------------------------------
-- 3) RLS
-- -----------------------------------------------------
ALTER TABLE public.course_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.course_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.course_messages TO authenticated;

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
DROP POLICY IF EXISTS "Students can create conversations when eligible" ON public.course_conversations;
DROP POLICY IF EXISTS "Registered students can create conversations" ON public.course_conversations;
CREATE POLICY "Registered students can create conversations"
    ON public.course_conversations FOR INSERT
    WITH CHECK (
        student_id = auth.uid()
        AND public.is_registered_student(auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = course_conversations.course_id
              AND courses.instructor_id = course_conversations.instructor_id
        )
    );

DROP POLICY IF EXISTS "Instructors can create conversations for paid students" ON public.course_conversations;
DROP POLICY IF EXISTS "Instructors can create conversations for registered students" ON public.course_conversations;
CREATE POLICY "Instructors can create conversations for registered students"
    ON public.course_conversations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_conversations.course_id
              AND c.instructor_id = auth.uid()
        )
        AND public.is_registered_student(course_conversations.student_id)
    );

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
        sender_id <> auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.course_conversations cc
            WHERE cc.id = course_messages.conversation_id
              AND (cc.student_id = auth.uid() OR cc.instructor_id = auth.uid())
        )
    )
    WITH CHECK (
        sender_id <> auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.course_conversations cc
            WHERE cc.id = course_messages.conversation_id
              AND (cc.student_id = auth.uid() OR cc.instructor_id = auth.uid())
        )
    );

-- -----------------------------------------------------
-- 4) RPCs
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_course_conversation(
    p_course_id UUID,
    p_student_id UUID DEFAULT NULL
)
RETURNS public.course_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
    target_student_id UUID := COALESCE(p_student_id, caller_id);
    target_instructor_id UUID;
    existing public.course_conversations;
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT c.instructor_id
    INTO target_instructor_id
    FROM public.courses c
    WHERE c.id = p_course_id;

    IF target_instructor_id IS NULL THEN
        RAISE EXCEPTION 'Course not found';
    END IF;

    IF target_student_id = caller_id THEN
        IF NOT public.is_registered_student(target_student_id) THEN
            RAISE EXCEPTION 'Chat is available only to registered students';
        END IF;
    ELSIF target_instructor_id <> caller_id
          AND NOT EXISTS (
              SELECT 1 FROM public.users u
              WHERE u.id = caller_id AND u.role = 'admin'
          ) THEN
        RAISE EXCEPTION 'Only the course instructor can open a student conversation';
    ELSIF NOT public.is_registered_student(target_student_id) THEN
        RAISE EXCEPTION 'Selected user is not a registered student';
    END IF;

    SELECT *
    INTO existing
    FROM public.course_conversations cc
    WHERE cc.course_id = p_course_id
      AND cc.student_id = target_student_id
    LIMIT 1;

    IF existing.id IS NOT NULL THEN
        RETURN existing;
    END IF;

    INSERT INTO public.course_conversations (course_id, student_id, instructor_id)
    VALUES (p_course_id, target_student_id, target_instructor_id)
    RETURNING * INTO existing;

    RETURN existing;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_course_conversation(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_instructor_course_chat_roster(p_course_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
    course_instructor_id UUID;
BEGIN
    IF caller_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT c.instructor_id
    INTO course_instructor_id
    FROM public.courses c
    WHERE c.id = p_course_id;

    IF course_instructor_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Course not found');
    END IF;

    IF course_instructor_id <> caller_id
       AND NOT EXISTS (
           SELECT 1 FROM public.users u
           WHERE u.id = caller_id AND u.role = 'admin'
       ) THEN
        RETURN json_build_object('success', false, 'error', 'Access denied');
    END IF;

    RETURN json_build_object(
        'success', true,
        'students', COALESCE((
            SELECT json_agg(row_to_json(entry) ORDER BY entry.last_message_at DESC NULLS LAST, entry.full_name ASC)
            FROM (
                SELECT
                    u.id AS user_id,
                    u.full_name,
                    u.email,
                    u.avatar_url,
                    cc.id AS conversation_id,
                    cc.last_message_at,
                    (
                        SELECT COUNT(*)::INT
                        FROM public.course_messages cm
                        WHERE cm.conversation_id = cc.id
                          AND cm.sender_id = u.id
                          AND COALESCE(cm.is_read, FALSE) = FALSE
                    ) AS unread_count
                FROM public.users u
                LEFT JOIN public.course_conversations cc
                    ON cc.course_id = p_course_id
                   AND cc.student_id = u.id
                WHERE public.is_registered_student(u.id)
                  AND u.id <> course_instructor_id
            ) entry
        ), '[]'::json)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_instructor_course_chat_roster(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_course_chat_messages(
    p_conversation_id UUID,
    p_limit INT DEFAULT 100
)
RETURNS SETOF public.course_messages
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT cm.*
    FROM public.course_messages cm
    JOIN public.course_conversations cc ON cc.id = cm.conversation_id
    WHERE cm.conversation_id = p_conversation_id
      AND (
          cc.student_id = auth.uid()
          OR cc.instructor_id = auth.uid()
          OR EXISTS (
              SELECT 1 FROM public.users u
              WHERE u.id = auth.uid() AND u.role = 'admin'
          )
      )
    ORDER BY cm.created_at ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 200));
$$;

GRANT EXECUTE ON FUNCTION public.get_course_chat_messages(UUID, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.send_course_chat_message(
    p_conversation_id UUID,
    p_content TEXT
)
RETURNS public.course_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
    trimmed TEXT := TRIM(p_content);
    created public.course_messages;
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF trimmed IS NULL OR char_length(trimmed) = 0 THEN
        RAISE EXCEPTION 'Message cannot be empty';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.course_conversations cc
        WHERE cc.id = p_conversation_id
          AND (cc.student_id = caller_id OR cc.instructor_id = caller_id)
    ) AND NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = caller_id AND u.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    INSERT INTO public.course_messages (conversation_id, sender_id, content, is_read)
    VALUES (p_conversation_id, caller_id, trimmed, FALSE)
    RETURNING * INTO created;

    RETURN created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_course_chat_message(UUID, TEXT) TO authenticated;

-- -----------------------------------------------------
-- 5) REALTIME (WebSocket)
-- -----------------------------------------------------
ALTER TABLE public.course_messages REPLICA IDENTITY FULL;
ALTER TABLE public.course_conversations REPLICA IDENTITY FULL;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_messages;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_conversations;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

SELECT '030_course_chat_realtime_paid_students applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 031_course_chat_all_registered_students.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- Course chat: all registered students (incremental)
-- Migration: 031_course_chat_all_registered_students.sql
-- NOTE: If 030 was applied after the 2026-06-08 update, you do NOT need this file.
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_registered_student(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p_user_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = p_user_id
              AND LOWER(TRIM(COALESCE(u.role, 'student'))) NOT IN (
                  'teacher', 'instructor', 'admin', 'pending_instructor'
              )
        );
$$;

GRANT EXECUTE ON FUNCTION public.is_registered_student(UUID) TO authenticated;

SELECT '031_course_chat_all_registered_students applied (no-op if 030 already updated)' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 032_fix_chat_student_delivery.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- Fix student receiving chat messages + notify on new message
-- Migration: 032_fix_chat_student_delivery.sql
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_my_course_conversation(p_course_id UUID)
RETURNS public.course_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID := auth.uid();
    result public.course_conversations;
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT cc.*
    INTO result
    FROM public.course_conversations cc
    WHERE cc.course_id = p_course_id
      AND cc.student_id = caller_id
    ORDER BY cc.last_message_at DESC NULLS LAST
    LIMIT 1;

    IF result.id IS NOT NULL THEN
        RETURN result;
    END IF;

    IF NOT public.is_registered_student(caller_id) THEN
        RAISE EXCEPTION 'Chat is available only to registered students';
    END IF;

    RETURN public.get_or_create_course_conversation(p_course_id, caller_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_course_conversation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_student_on_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    conv public.course_conversations;
    preview TEXT;
BEGIN
    SELECT *
    INTO conv
    FROM public.course_conversations
    WHERE id = NEW.conversation_id;

    IF conv.id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.sender_id = conv.instructor_id AND conv.student_id IS NOT NULL THEN
        preview := LEFT(TRIM(NEW.content), 180);

        BEGIN
            INSERT INTO public.notifications (user_id, course_id, title, message, type, action_url, is_read)
            VALUES (
                conv.student_id,
                conv.course_id,
                'رسالة جديدة من المدرس',
                preview,
                'general',
                '/courses/' || conv.course_id || '/learn?tab=chat',
                FALSE
            );
        EXCEPTION
            WHEN undefined_column THEN
                INSERT INTO public.notifications (user_id, title, message, type, is_read)
                VALUES (
                    conv.student_id,
                    'رسالة جديدة من المدرس',
                    preview,
                    'general',
                    FALSE
                );
            WHEN OTHERS THEN
                NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_student_on_chat_message ON public.course_messages;
CREATE TRIGGER trigger_notify_student_on_chat_message
    AFTER INSERT ON public.course_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_student_on_chat_message();

SELECT '032_fix_chat_student_delivery applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 033_fix_student_role_and_chat_access.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- Fix student accounts with missing role + chat eligibility
-- Migration: 033_fix_student_role_and_chat_access.sql
-- =====================================================

UPDATE public.users
SET role = 'student'
WHERE role IS NULL
   OR TRIM(role) = '';

CREATE OR REPLACE FUNCTION public.is_registered_student(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p_user_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = p_user_id
              AND LOWER(TRIM(COALESCE(u.role, 'student'))) NOT IN (
                  'teacher', 'instructor', 'admin', 'pending_instructor'
              )
        );
$$;

GRANT EXECUTE ON FUNCTION public.is_registered_student(UUID) TO authenticated;

SELECT '033_fix_student_role_and_chat_access applied' AS message;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 034_student_chat_inbox.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================
-- Student chat inbox: list all conversations with message counts
-- Migration: 034_student_chat_inbox.sql
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_student_chat_inbox()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN
        RETURN '[]'::json;
    END IF;

    RETURN COALESCE((
        SELECT json_agg(row_to_json(entry) ORDER BY entry.message_count DESC, entry.last_message_at DESC NULLS LAST)
        FROM (
            SELECT
                cc.id AS conversation_id,
                cc.course_id,
                c.title,
                c.thumbnail_url,
                cc.last_message_at,
                (
                    SELECT COUNT(*)::INT
                    FROM public.course_messages cm
                    WHERE cm.conversation_id = cc.id
                ) AS message_count,
                (
                    SELECT COUNT(*)::INT
                    FROM public.course_messages cm
                    WHERE cm.conversation_id = cc.id
                      AND cm.sender_id <> caller_id
                      AND COALESCE(cm.is_read, FALSE) = FALSE
                ) AS unread_count
            FROM public.course_conversations cc
            JOIN public.courses c ON c.id = cc.course_id
            WHERE cc.student_id = caller_id
        ) entry
    ), '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_chat_inbox() TO authenticated;

SELECT '034_student_chat_inbox applied' AS message;




SELECT 'Production migrations 015-034 applied successfully' AS message;

