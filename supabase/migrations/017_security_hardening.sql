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
