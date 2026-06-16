-- Google Meet sessions must not expose a synthetic Jitsi room to students.

UPDATE public.meetings
SET
    jitsi_room_name = NULL,
    platform = COALESCE(NULLIF(TRIM(platform), ''), 'google_meet')
WHERE meet_link IS NOT NULL
  AND TRIM(meet_link) <> ''
  AND COALESCE(platform, 'google_meet') <> 'jitsi';

CREATE OR REPLACE FUNCTION public.get_course_meetings_for_student(p_course_id UUID)
RETURNS SETOF public.meetings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_paid BOOLEAN := FALSE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT COALESCE(c.price, 0) > 0 INTO v_is_paid
    FROM public.courses c
    WHERE c.id = p_course_id;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = p_course_id
          AND c.instructor_id = v_user_id
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = v_user_id
          AND u.role IN ('admin', 'teacher', 'instructor')
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.payment_submissions ps
        WHERE ps.course_id = p_course_id
          AND ps.student_id = v_user_id
          AND ps.status = 'approved'
    )
    AND NOT (
        NOT COALESCE(v_is_paid, FALSE)
        AND EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = p_course_id
              AND e.user_id = v_user_id
        )
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
            THEN COALESCE(m.platform, 'google_meet')
            ELSE 'jitsi'
        END AS platform,
        CASE
            WHEN m.meet_link IS NOT NULL
                 AND TRIM(m.meet_link) <> ''
                 AND COALESCE(m.platform, 'google_meet') <> 'jitsi'
            THEN NULL
            ELSE COALESCE(
                NULLIF(TRIM(m.jitsi_room_name), ''),
                'bepro_' || replace(m.id::text, '-', '')
            )
        END AS jitsi_room_name,
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

SELECT '042_fix_google_meet_student_meetings applied' AS message;
