-- ============================================================
-- Migration 004: Add feedback tables
-- Run on Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS feedbacks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id      UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id       UUID REFERENCES teams(id) ON DELETE CASCADE,
  type          VARCHAR(10) NOT NULL CHECK (type IN ('ai', 'coach')),
  summary       TEXT,
  strengths     JSONB DEFAULT '[]',
  weaknesses    JSONB DEFAULT '[]',
  action_items  JSONB DEFAULT '[]',
  style_tag     VARCHAR(20) CHECK (style_tag IN ('aggressive', 'control', 'default', 'mixed')),
  raw_response  TEXT,
  model_used    VARCHAR(50),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feedback_id   UUID REFERENCES feedbacks(id) ON DELETE CASCADE,
  round_id      UUID REFERENCES rounds(id) ON DELETE SET NULL,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_match   ON feedbacks(match_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_team    ON feedbacks(team_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comments ON feedback_comments(feedback_id);
