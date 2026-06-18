-- AI article scheduling queue for admin blog automation.
CREATE TABLE IF NOT EXISTS public.article_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_hint TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  auto_publish BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'ready', 'published', 'failed', 'cancelled')),
  blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  prompt_notes TEXT,
  error_message TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_schedules_status_scheduled_at
  ON public.article_schedules(status, scheduled_at ASC);

CREATE INDEX IF NOT EXISTS idx_article_schedules_blog_post_id
  ON public.article_schedules(blog_post_id);

ALTER TABLE public.article_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read article schedules" ON public.article_schedules;
CREATE POLICY "Admins can read article schedules"
  ON public.article_schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert article schedules" ON public.article_schedules;
CREATE POLICY "Admins can insert article schedules"
  ON public.article_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update article schedules" ON public.article_schedules;
CREATE POLICY "Admins can update article schedules"
  ON public.article_schedules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete article schedules" ON public.article_schedules;
CREATE POLICY "Admins can delete article schedules"
  ON public.article_schedules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.set_article_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_article_schedules_updated_at ON public.article_schedules;
CREATE TRIGGER trg_article_schedules_updated_at
  BEFORE UPDATE ON public.article_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_article_schedules_updated_at();
