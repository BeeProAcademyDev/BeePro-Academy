-- =====================================================
-- BePro Academy — Auth Migration
-- Adds authentication columns to existing users table
-- and creates the refresh_tokens table.
--
-- Run this in your Supabase SQL Editor BEFORE starting the server.
-- =====================================================

-- 1. Add auth columns to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_exp TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- 4. Index on users.email (likely already exists, IF NOT EXISTS is safe)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 5. RLS for refresh_tokens (optional — since this table is only accessed server-side)
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Allow the service role full access (server-side only)
CREATE POLICY "Service role full access on refresh_tokens"
  ON refresh_tokens FOR ALL
  USING (true)
  WITH CHECK (true);

-- Success
DO $$
BEGIN
    RAISE NOTICE 'Auth migration completed successfully!';
END $$;
