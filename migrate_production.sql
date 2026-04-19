-- ── Migration: add all columns/tables missing from the base schema ──

-- 1. Users: add is_admin and is_verified_org
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified_org BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Problems: add status and tags
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'problem_status') THEN
    CREATE TYPE problem_status AS ENUM ('open', 'in_progress', 'resolved');
  END IF;
END $$;
ALTER TABLE problems ADD COLUMN IF NOT EXISTS status problem_status NOT NULL DEFAULT 'open';
ALTER TABLE problems ADD COLUMN IF NOT EXISTS tags   TEXT[] NOT NULL DEFAULT '{}';

-- 3. Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, problem_id)
);

-- 4. Comments table
CREATE TABLE IF NOT EXISTS comments (
  id          SERIAL PRIMARY KEY,
  solution_id INTEGER NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_removed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_solution ON comments(solution_id);

-- 5. Reports table
CREATE TABLE IF NOT EXISTS reports (
  id          SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL,
  reference_id INTEGER NOT NULL,
  reason      VARCHAR(50) NOT NULL,
  notes       TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
