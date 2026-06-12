-- =====================================================
-- Fix Course Slug Issue for BePro Academy
-- Add missing slug column and auto-generation
-- =====================================================

-- Add slug column to courses table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='slug') THEN
        ALTER TABLE public.courses ADD COLUMN slug VARCHAR(255);
    END IF;
END $$;

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(
        regexp_replace(
            regexp_replace(
                regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'),
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to ensure unique slug
CREATE OR REPLACE FUNCTION ensure_unique_slug(base_slug TEXT, course_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    unique_slug TEXT := base_slug;
    counter INTEGER := 1;
BEGIN
    WHILE EXISTS (
        SELECT 1 FROM public.courses 
        WHERE slug = unique_slug 
        AND (course_id IS NULL OR id != course_id)
    ) LOOP
        unique_slug := base_slug || '-' || counter;
        counter := counter + 1;
    END LOOP;
    
    RETURN unique_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate slug
CREATE OR REPLACE FUNCTION auto_generate_course_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
BEGIN
    -- Generate slug from title if not provided
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        base_slug := generate_slug(NEW.title);
        NEW.slug := ensure_unique_slug(base_slug, NEW.id);
    END IF;
    
    -- Ensure slug is unique if manually provided
    IF TG_OP = 'UPDATE' AND OLD.slug IS DISTINCT FROM NEW.slug THEN
        NEW.slug := ensure_unique_slug(NEW.slug, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_generate_course_slug ON public.courses;

-- Create trigger to auto-generate slug
CREATE TRIGGER trigger_auto_generate_course_slug
    BEFORE INSERT OR UPDATE ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_course_slug();

-- Update existing courses that don't have slugs
UPDATE public.courses 
SET slug = ensure_unique_slug(generate_slug(title), id)
WHERE slug IS NULL OR slug = '';

-- Add NOT NULL constraint to slug column
DO $$ 
BEGIN
    -- First ensure all courses have slugs
    UPDATE public.courses 
    SET slug = ensure_unique_slug(generate_slug(title), id)
    WHERE slug IS NULL OR slug = '';
    
    -- Then add NOT NULL constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='courses' AND column_name='slug' AND is_nullable='NO'
    ) THEN
        ALTER TABLE public.courses ALTER COLUMN slug SET NOT NULL;
    END IF;
END $$;

-- Add unique constraint to slug if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'courses_slug_unique' AND table_name = 'courses'
    ) THEN
        ALTER TABLE public.courses ADD CONSTRAINT courses_slug_unique UNIQUE (slug);
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);

-- Success message
SELECT 
    '✅ Course slug issue fixed!' as status,
    'Courses now auto-generate slugs from titles' as message,
    'You can now create courses successfully' as note;