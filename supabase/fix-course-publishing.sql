-- =====================================================
-- FIX COURSE PUBLISHING ISSUE
-- Make courses visible to students when created
-- =====================================================

-- Option 1: Auto-publish all existing unpublished courses
-- (Use with caution - only if you want all courses public)
UPDATE public.courses 
SET is_published = true 
WHERE is_published = false;

-- Option 2: Create a function to easily publish courses
CREATE OR REPLACE FUNCTION publish_course(course_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Check if user is instructor or admin
    IF NOT EXISTS (
        SELECT 1 FROM public.courses 
        WHERE id = course_id_param 
        AND (instructor_id = auth.uid() OR 
             EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized or course not found');
    END IF;
    
    -- Publish the course
    UPDATE public.courses 
    SET is_published = true, 
        updated_at = NOW()
    WHERE id = course_id_param
    AND is_published = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count > 0 THEN
        RETURN jsonb_build_object('success', true, 'message', 'Course published successfully');
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Course already published or not found');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Option 3: Create a function to toggle course publishing status
CREATE OR REPLACE FUNCTION toggle_course_publishing(course_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    current_status BOOLEAN;
    new_status BOOLEAN;
BEGIN
    -- Check if user is instructor or admin and get current status
    SELECT is_published INTO current_status
    FROM public.courses 
    WHERE id = course_id_param 
    AND (instructor_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
    
    IF current_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized or course not found');
    END IF;
    
    -- Toggle the status
    new_status := NOT current_status;
    
    UPDATE public.courses 
    SET is_published = new_status, 
        updated_at = NOW()
    WHERE id = course_id_param;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', CASE 
            WHEN new_status THEN 'Course published successfully' 
            ELSE 'Course unpublished successfully' 
        END,
        'is_published', new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION publish_course(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_course_publishing(UUID) TO authenticated;

-- Check current course publishing status
SELECT 
    COUNT(*) as total_courses,
    COUNT(*) FILTER (WHERE is_published = true) as published_courses,
    COUNT(*) FILTER (WHERE is_published = false) as unpublished_courses
FROM public.courses;

-- Success message
SELECT 
    '✅ Course publishing issue fixed!' as status,
    'All existing courses have been published' as action_taken,
    'Use publish_course() or toggle_course_publishing() functions to manage publishing' as usage,
    'Students can now see published courses' as result;