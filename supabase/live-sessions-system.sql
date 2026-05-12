-- =====================================================
-- BePro Academy - Live Sessions System with Jitsi Integration
-- Complete Backend Architecture for Teacher-Approved Live Sessions
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS FOR SESSION STATUS AND REQUEST STATUS
-- =====================================================

-- Session status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status_enum') THEN
        CREATE TYPE session_status_enum AS ENUM (
            'scheduled',    -- Session is planned for future
            'live',        -- Session is currently active
            'ended',       -- Session has finished
            'cancelled'    -- Session was cancelled
        );
    END IF;
END $$;

-- Join request status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'join_request_status_enum') THEN
        CREATE TYPE join_request_status_enum AS ENUM (
            'pending',     -- Student requested, waiting for approval
            'approved',    -- Teacher approved the request
            'rejected',    -- Teacher rejected the request
            'revoked'      -- Teacher revoked previously approved access
        );
    END IF;
END $$;

-- Participant role enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'participant_role_enum') THEN
        CREATE TYPE participant_role_enum AS ENUM (
            'moderator',   -- Teacher with full control
            'participant'  -- Student with limited access
        );
    END IF;
END $$;

-- Attendance status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_enum') THEN
        CREATE TYPE attendance_status_enum AS ENUM (
            'joined',      -- User joined the session
            'left',        -- User left the session
            'kicked',      -- User was removed by moderator
            'disconnected' -- User lost connection
        );
    END IF;
END $$;

-- =====================================================
-- 1. LIVE SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.live_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Session Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Scheduling
    scheduled_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
    scheduled_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Jitsi Configuration
    jitsi_room_name VARCHAR(255) UNIQUE NOT NULL,
    jitsi_room_password VARCHAR(50),
    waiting_room_enabled BOOLEAN DEFAULT TRUE,
    
    -- Session Status and Control
    status session_status_enum DEFAULT 'scheduled',
    max_participants INTEGER DEFAULT 50 CHECK (max_participants > 0),
    is_recording_enabled BOOLEAN DEFAULT FALSE,
    
    -- Session URLs and Access
    moderator_join_url TEXT, -- Direct URL for instructor with moderator access
    participant_join_url TEXT, -- Base URL for approved students
    
    -- Timing and Metadata
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_duration CHECK (duration_minutes BETWEEN 15 AND 480) -- 15 min to 8 hours
);

-- =====================================================
-- 2. SESSION JOIN REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.session_join_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Request Details
    status join_request_status_enum DEFAULT 'pending',
    request_message TEXT, -- Optional message from student
    
    -- Approval/Rejection
    reviewed_by UUID REFERENCES public.users(id), -- Instructor who approved/rejected
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_message TEXT, -- Optional message from instructor
    
    -- Access Control
    access_granted_at TIMESTAMP WITH TIME ZONE,
    access_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_student_session_request UNIQUE (session_id, student_id)
    -- Note: Role and enrollment validation handled by triggers and RLS policies
);

-- =====================================================
-- 3. SESSION PARTICIPANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.session_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Participant Role and Access
    role participant_role_enum NOT NULL,
    join_token VARCHAR(255) UNIQUE, -- Unique token for Jitsi access
    
    -- Permissions
    can_speak BOOLEAN DEFAULT TRUE,
    can_share_screen BOOLEAN DEFAULT FALSE,
    can_use_chat BOOLEAN DEFAULT TRUE,
    is_muted BOOLEAN DEFAULT FALSE,
    is_camera_off BOOLEAN DEFAULT FALSE,
    
    -- Session Participation
    joined_at TIMESTAMP WITH TIME ZONE,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    total_duration_minutes INTEGER DEFAULT 0,
    
    -- Metadata
    join_ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_session_participation UNIQUE (session_id, user_id)
    -- Note: Role validation handled by triggers and RLS policies
);

-- =====================================================
-- 4. SESSION ATTENDANCE LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.session_attendance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE NOT NULL,
    participant_id UUID REFERENCES public.session_participants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Attendance Event
    action attendance_status_enum NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Context and Metadata
    reason TEXT, -- Optional reason for kick/disconnect
    triggered_by UUID REFERENCES public.users(id), -- Who caused the action (for kicks)
    
    -- Technical Details
    ip_address INET,
    user_agent TEXT,
    connection_quality VARCHAR(20), -- excellent, good, fair, poor
    
    -- Session State at Time of Event
    session_participants_count INTEGER,
    duration_until_event_minutes INTEGER,
    
    -- Constraints
    CONSTRAINT valid_action_context CHECK (
        (action IN ('joined', 'left', 'disconnected') AND triggered_by IS NULL) OR
        (action = 'kicked' AND triggered_by IS NOT NULL)
    )
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Live Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_live_sessions_course_id ON public.live_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_instructor_id ON public.live_sessions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON public.live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled_time ON public.live_sessions(scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_live_sessions_jitsi_room ON public.live_sessions(jitsi_room_name);

-- Join Requests Indexes
CREATE INDEX IF NOT EXISTS idx_join_requests_session_id ON public.session_join_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_student_id ON public.session_join_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON public.session_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_requested_at ON public.session_join_requests(requested_at);

-- Participants Indexes
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON public.session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON public.session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_role ON public.session_participants(role);
CREATE INDEX IF NOT EXISTS idx_participants_join_token ON public.session_participants(join_token);

-- Attendance Logs Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_logs_session_id ON public.session_attendance_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id ON public.session_attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_participant_id ON public.session_attendance_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_timestamp ON public.session_attendance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_action ON public.session_attendance_logs(action);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_attendance_logs ENABLE ROW LEVEL SECURITY;

-- Live Sessions Policies
CREATE POLICY "Instructors can manage their course sessions" ON public.live_sessions
    FOR ALL USING (
        instructor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Students can view sessions for enrolled courses" ON public.live_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.enrollments
            WHERE enrollments.course_id = live_sessions.course_id
            AND enrollments.user_id = auth.uid()
        ) OR
        instructor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Join Requests Policies
CREATE POLICY "Students can manage their own join requests" ON public.session_join_requests
    FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Instructors can view requests for their sessions" ON public.session_join_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions
            WHERE live_sessions.id = session_join_requests.session_id
            AND live_sessions.instructor_id = auth.uid()
        ) OR
        student_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Instructors can approve/reject requests for their sessions" ON public.session_join_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions
            WHERE live_sessions.id = session_join_requests.session_id
            AND live_sessions.instructor_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Session Participants Policies
CREATE POLICY "Users can view their own participation" ON public.session_participants
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Instructors can manage participants in their sessions" ON public.session_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions
            WHERE live_sessions.id = session_participants.session_id
            AND live_sessions.instructor_id = auth.uid()
        ) OR
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Attendance Logs Policies (Read-only for users, full access for instructors/admins)
CREATE POLICY "Users can view their own attendance logs" ON public.session_attendance_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Instructors can view attendance for their sessions" ON public.session_attendance_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions
            WHERE live_sessions.id = session_attendance_logs.session_id
            AND live_sessions.instructor_id = auth.uid()
        ) OR
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "System can insert attendance logs" ON public.session_attendance_logs
    FOR INSERT WITH CHECK (TRUE);

-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to generate unique Jitsi room name
CREATE OR REPLACE FUNCTION generate_jitsi_room_name(course_title TEXT, session_title TEXT)
RETURNS TEXT AS $$
DECLARE
    base_name TEXT;
    unique_suffix TEXT;
    final_name TEXT;
BEGIN
    -- Create a base name from course and session titles
    base_name := lower(
        regexp_replace(
            regexp_replace(
                course_title || '_' || session_title, 
                '[^a-zA-Z0-9\s-]', '', 'g'
            ),
            '\s+', '_', 'g'
        )
    );
    
    -- Add timestamp for uniqueness
    unique_suffix := TO_CHAR(NOW(), 'YYYYMMDDHH24MI');
    
    -- Combine and truncate if necessary
    final_name := substring(base_name || '_' || unique_suffix, 1, 50);
    
    RETURN final_name;
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure join token
CREATE OR REPLACE FUNCTION generate_join_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to automatically add instructor as moderator
CREATE OR REPLACE FUNCTION auto_add_instructor_as_moderator()
RETURNS TRIGGER AS $$
BEGIN
    -- Add instructor as moderator participant when session is created
    INSERT INTO public.session_participants (
        session_id,
        user_id,
        role,
        join_token,
        can_speak,
        can_share_screen,
        can_use_chat
    ) VALUES (
        NEW.id,
        NEW.instructor_id,
        'moderator',
        generate_join_token(),
        TRUE,
        TRUE,
        TRUE
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update session status based on time
CREATE OR REPLACE FUNCTION update_session_status()
RETURNS void AS $$
BEGIN
    -- Mark sessions as live if they've started
    UPDATE public.live_sessions
    SET status = 'live',
        actual_start_time = COALESCE(actual_start_time, NOW())
    WHERE status = 'scheduled'
    AND scheduled_start_time <= NOW()
    AND scheduled_end_time > NOW();
    
    -- Mark sessions as ended if they've passed end time
    UPDATE public.live_sessions
    SET status = 'ended',
        actual_end_time = COALESCE(actual_end_time, NOW())
    WHERE status = 'live'
    AND scheduled_end_time <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to handle join request approval
CREATE OR REPLACE FUNCTION approve_join_request(
    request_id UUID,
    approver_id UUID,
    review_msg TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    request_record RECORD;
    session_record RECORD;
    participant_id UUID;
BEGIN
    -- Get request details
    SELECT * INTO request_record
    FROM public.session_join_requests
    WHERE id = request_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;
    
    -- Get session details
    SELECT * INTO session_record
    FROM public.live_sessions
    WHERE id = request_record.session_id;
    
    -- Verify approver is the instructor or admin
    IF session_record.instructor_id != approver_id AND 
       NOT EXISTS (SELECT 1 FROM public.users WHERE id = approver_id AND role = 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    
    -- Update request status
    UPDATE public.session_join_requests
    SET status = 'approved',
        reviewed_by = approver_id,
        reviewed_at = NOW(),
        review_message = review_msg,
        access_granted_at = NOW(),
        access_expires_at = session_record.scheduled_end_time
    WHERE id = request_id;
    
    -- Add student as participant
    INSERT INTO public.session_participants (
        session_id,
        user_id,
        role,
        join_token
    ) VALUES (
        request_record.session_id,
        request_record.student_id,
        'participant',
        generate_join_token()
    ) RETURNING id INTO participant_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'participant_id', participant_id,
        'message', 'Student approved successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to auto-add instructor as moderator
DROP TRIGGER IF EXISTS trigger_auto_add_instructor_moderator ON public.live_sessions;
CREATE TRIGGER trigger_auto_add_instructor_moderator
    AFTER INSERT ON public.live_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_instructor_as_moderator();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables
DROP TRIGGER IF EXISTS trigger_update_live_sessions_timestamp ON public.live_sessions;
CREATE TRIGGER trigger_update_live_sessions_timestamp
    BEFORE UPDATE ON public.live_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_join_requests_timestamp ON public.session_join_requests;
CREATE TRIGGER trigger_update_join_requests_timestamp
    BEFORE UPDATE ON public.session_join_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_participants_timestamp ON public.session_participants;
CREATE TRIGGER trigger_update_participants_timestamp
    BEFORE UPDATE ON public.session_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate scheduled_end_time
CREATE OR REPLACE FUNCTION calculate_scheduled_end_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.scheduled_end_time = NEW.scheduled_start_time + INTERVAL '1 minute' * NEW.duration_minutes;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate scheduled_end_time on INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_calculate_scheduled_end_time ON public.live_sessions;
CREATE TRIGGER trigger_calculate_scheduled_end_time
    BEFORE INSERT OR UPDATE ON public.live_sessions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_scheduled_end_time();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for session overview
CREATE OR REPLACE VIEW session_overview AS
SELECT 
    ls.id,
    ls.title,
    ls.description,
    ls.scheduled_start_time,
    ls.duration_minutes,
    ls.status,
    ls.jitsi_room_name,
    c.title as course_title,
    u.full_name as instructor_name,
    COUNT(DISTINCT sp.id) as participant_count,
    COUNT(DISTINCT CASE WHEN sjr.status = 'pending' THEN sjr.id END) as pending_requests
FROM public.live_sessions ls
JOIN public.courses c ON c.id = ls.course_id
JOIN public.users u ON u.id = ls.instructor_id
LEFT JOIN public.session_participants sp ON sp.session_id = ls.id
LEFT JOIN public.session_join_requests sjr ON sjr.session_id = ls.id
GROUP BY ls.id, c.title, u.full_name;

-- View for pending join requests
CREATE OR REPLACE VIEW pending_join_requests AS
SELECT 
    sjr.id,
    sjr.session_id,
    sjr.student_id,
    sjr.request_message,
    sjr.requested_at,
    ls.title as session_title,
    ls.scheduled_start_time,
    u.full_name as student_name,
    u.email as student_email,
    c.title as course_title
FROM public.session_join_requests sjr
JOIN public.live_sessions ls ON ls.id = sjr.session_id
JOIN public.users u ON u.id = sjr.student_id
JOIN public.courses c ON c.id = ls.course_id
WHERE sjr.status = 'pending'
ORDER BY sjr.requested_at ASC;

-- =====================================================
-- SAMPLE DATA AND TESTING
-- =====================================================

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION generate_jitsi_room_name(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_join_token() TO authenticated;
GRANT EXECUTE ON FUNCTION approve_join_request(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_session_status() TO authenticated;

-- Grant view access
GRANT SELECT ON session_overview TO authenticated;
GRANT SELECT ON pending_join_requests TO authenticated;

-- Success message
SELECT 
    '✅ Live Sessions System Created Successfully!' as status,
    'Teachers can now create live sessions with Jitsi integration' as message,
    'Students must request to join and get instructor approval' as feature,
    '4 tables, enums, indexes, RLS, functions, triggers, and views created' as details;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

/*
-- Example 1: Create a live session
INSERT INTO public.live_sessions (
    course_id,
    instructor_id,
    title,
    description,
    scheduled_start_time,
    duration_minutes,
    jitsi_room_name
) VALUES (
    'your-course-id',
    'your-instructor-id',
    'Introduction to React Hooks',
    'Live coding session covering useState and useEffect',
    NOW() + INTERVAL '2 hours',
    90,
    generate_jitsi_room_name('React Course', 'Introduction to React Hooks')
);

-- Example 2: Student requests to join
INSERT INTO public.session_join_requests (
    session_id,
    student_id,
    request_message
) VALUES (
    'session-id',
    'student-id',
    'I am excited to join this session!'
);

-- Example 3: Teacher approves request
SELECT approve_join_request('request-id', 'instructor-id', 'Welcome to the session!');

-- Example 4: View pending requests
SELECT * FROM pending_join_requests WHERE session_id = 'session-id';

-- Example 5: Update session statuses (run periodically)
SELECT update_session_status();
*/