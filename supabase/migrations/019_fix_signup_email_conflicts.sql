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
