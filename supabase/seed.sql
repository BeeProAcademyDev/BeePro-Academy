-- =====================================================
-- BePro Academy - Minimal Safe Seed Data
-- Runs automatically on `supabase db reset` (see `supabase/config.toml`)
-- =====================================================

-- -----------------------------------------------------
-- Categories (used for course discovery/navigation)
-- -----------------------------------------------------
INSERT INTO public.categories (name, slug, description, sort_order, is_active)
VALUES
  ('Programming', 'programming', 'Software development courses', 10, TRUE),
  ('IT', 'it', 'IT & infrastructure courses', 20, TRUE),
  ('Financial Markets', 'financial', 'Trading and financial markets', 30, TRUE),
  ('Graphic Design', 'graphic', 'Design and creative tools', 40, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------
-- Optional demo profiles + course (for local UI smoke tests)
-- NOTE: These are NOT linked to Supabase Auth users. They are
-- safe for development, but should not be treated as real accounts.
-- -----------------------------------------------------
INSERT INTO public.users (id, full_name, email, role, avatar_url)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Demo Instructor', 'instructor@example.com', 'instructor', NULL),
  ('22222222-2222-2222-2222-222222222222', 'Demo Student', 'student@example.com', 'student', NULL),
  ('33333333-3333-3333-3333-333333333333', 'Demo Admin', 'admin@example.com', 'admin', NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.courses (id, title, category, description, instructor_id, thumbnail_url, price, level)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Demo Course: Getting Started',
    'programming',
    'A small demo course seeded for local development.',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    0,
    'beginner'
  )
ON CONFLICT (id) DO NOTHING;

