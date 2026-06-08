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
