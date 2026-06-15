-- Lock public course categories to the three platform tracks and allow admins
-- to delete any course through database-enforced RLS.

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_category_check;

UPDATE public.courses
SET category = CASE
  WHEN lower(coalesce(category, '')) IN ('financial_markets', 'financial', 'finance') THEN 'financial_markets'
  WHEN lower(coalesce(category, '')) IN ('data_analysis', 'data', 'analytics', 'analysis') THEN 'data_analysis'
  WHEN lower(coalesce(category, '')) IN ('it', 'programming', 'graphic', 'graphics', 'design') THEN 'it'
  ELSE 'financial_markets'
END
WHERE category IS NULL
   OR category NOT IN ('financial_markets', 'data_analysis', 'it');

ALTER TABLE public.courses
  ALTER COLUMN category SET NOT NULL;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_category_check
  CHECK (category IN ('financial_markets', 'data_analysis', 'it'));

DROP POLICY IF EXISTS "Admins can delete any course" ON public.courses;
CREATE POLICY "Admins can delete any course"
  ON public.courses
  FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update any course" ON public.courses;
CREATE POLICY "Admins can update any course"
  ON public.courses
  FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can create courses" ON public.courses;
CREATE POLICY "Admins can create courses"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());
