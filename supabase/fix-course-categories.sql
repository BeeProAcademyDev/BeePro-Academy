-- =====================================================
-- FIX COURSE CATEGORIES CONSTRAINT
-- Expand allowed categories and make constraint flexible
-- =====================================================

-- First, drop the existing constraint
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_category_check;

-- Add expanded category constraint with more options
ALTER TABLE public.courses ADD CONSTRAINT courses_category_check 
CHECK (category IN (
    'programming',
    'graphic', 
    'it',
    'financial',
    'web-development',
    'mobile-development',
    'data-science',
    'machine-learning',
    'cybersecurity',
    'devops',
    'ui-ux',
    'marketing',
    'business',
    'design',
    'photography',
    'video-editing',
    'music',
    'language',
    'writing',
    'health',
    'fitness',
    'cooking',
    'lifestyle',
    'other'
));

-- Update any existing NULL categories to 'other'
UPDATE public.courses 
SET category = 'other' 
WHERE category IS NULL;

-- Make category NOT NULL after fixing nulls
ALTER TABLE public.courses ALTER COLUMN category SET NOT NULL;

-- Success message
SELECT 
    '✅ Course categories constraint fixed!' as status,
    'Now supports 24 different categories including flexible "other" option' as details,
    'Existing courses with invalid categories should be updated manually' as note;