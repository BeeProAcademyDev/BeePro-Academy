-- =====================================================
-- Fix Lessons Content Type Column for BePro Academy
-- Add missing content_type column to lessons table
-- =====================================================

-- Add content_type column to lessons table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='content_type') THEN
        ALTER TABLE public.lessons ADD COLUMN content_type VARCHAR(50) DEFAULT 'video';
    END IF;
END $$;

-- Add other potentially missing columns that might be needed
DO $$ 
BEGIN
    -- Add content column for text/article content
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='content') THEN
        ALTER TABLE public.lessons ADD COLUMN content TEXT;
    END IF;
    
    -- Add free_preview column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='free_preview') THEN
        ALTER TABLE public.lessons ADD COLUMN free_preview BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add sort_order column (might be used instead of order_index)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='sort_order') THEN
        ALTER TABLE public.lessons ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
    
    -- Add thumbnail_url for lesson thumbnails
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='thumbnail_url') THEN
        ALTER TABLE public.lessons ADD COLUMN thumbnail_url TEXT;
    END IF;
END $$;

-- Update existing lessons to have a default content_type
UPDATE public.lessons 
SET content_type = CASE 
    WHEN video_url IS NOT NULL AND video_url != '' THEN 'video'
    WHEN content IS NOT NULL AND content != '' THEN 'article'
    ELSE 'video'
END
WHERE content_type IS NULL;

-- Add check constraint for content_type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'lessons_content_type_check'
    ) THEN
        ALTER TABLE public.lessons 
        ADD CONSTRAINT lessons_content_type_check 
        CHECK (content_type IN ('video', 'article', 'quiz', 'assignment', 'document', 'live_session'));
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lessons_content_type ON public.lessons(content_type);
CREATE INDEX IF NOT EXISTS idx_lessons_free_preview ON public.lessons(free_preview);
CREATE INDEX IF NOT EXISTS idx_lessons_sort_order ON public.lessons(course_id, sort_order);

-- Also check if courses table needs similar fixes
DO $$ 
BEGIN
    -- Add status column to courses if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='status') THEN
        ALTER TABLE public.courses ADD COLUMN status VARCHAR(20) DEFAULT 'draft' 
        CHECK (status IN ('draft', 'published', 'archived'));
    END IF;
    
    -- Add featured column to courses if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='featured') THEN
        ALTER TABLE public.courses ADD COLUMN featured BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add duration_hours column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='duration_hours') THEN
        ALTER TABLE public.courses ADD COLUMN duration_hours DECIMAL(5,2) DEFAULT 0;
    END IF;
END $$;

-- Update existing courses to have proper status
UPDATE public.courses 
SET status = CASE 
    WHEN is_published = true THEN 'published'
    ELSE 'draft'
END
WHERE status IS NULL;

-- Success message
SELECT 
    '✅ Lessons content_type column added!' as status,
    'Courses can now be published successfully' as message,
    'All missing columns have been added to lessons and courses tables' as note;