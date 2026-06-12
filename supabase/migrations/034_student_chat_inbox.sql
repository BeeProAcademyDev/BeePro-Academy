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
