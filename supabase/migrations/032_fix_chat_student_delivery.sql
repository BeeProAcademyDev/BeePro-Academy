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
