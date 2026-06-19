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

