-- ============================================================
-- Migration 005: User authentication & team isolation
-- Run on Supabase SQL Editor
-- ============================================================

-- ユーザーとチームの紐付けテーブル
CREATE TABLE IF NOT EXISTS user_teams (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL DEFAULT 'member'
             CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_user_teams_user ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_team ON user_teams(team_id);

-- ============================================================
-- Row Level Security (RLS)
-- ※ API routes use direct pg connection (bypasses RLS)
--   These policies apply to Supabase dashboard access and
--   any future direct client-side queries.
-- ============================================================

ALTER TABLE teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks    ENABLE ROW LEVEL SECURITY;

-- 自分のチームのデータのみ参照・操作可能

CREATE POLICY "own_team_teams" ON teams
  FOR ALL USING (
    id IN (SELECT team_id FROM user_teams WHERE user_id = auth.uid())
  );

CREATE POLICY "own_team_players" ON players
  FOR ALL USING (
    team_id IN (SELECT team_id FROM user_teams WHERE user_id = auth.uid())
  );

CREATE POLICY "own_team_matches" ON matches
  FOR ALL USING (
    team_id IN (SELECT team_id FROM user_teams WHERE user_id = auth.uid())
  );

CREATE POLICY "own_team_rounds" ON rounds
  FOR ALL USING (
    match_id IN (
      SELECT id FROM matches
      WHERE team_id IN (SELECT team_id FROM user_teams WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "own_team_player_stats" ON player_stats
  FOR ALL USING (
    match_id IN (
      SELECT id FROM matches
      WHERE team_id IN (SELECT team_id FROM user_teams WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "own_team_team_stats" ON team_stats
  FOR ALL USING (
    team_id IN (SELECT team_id FROM user_teams WHERE user_id = auth.uid())
  );

CREATE POLICY "own_team_events" ON events
  FOR ALL USING (
    match_id IN (
      SELECT id FROM matches
      WHERE team_id IN (SELECT team_id FROM user_teams WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "own_team_ai_reports" ON ai_reports
  FOR ALL USING (
    team_id IN (SELECT team_id FROM user_teams WHERE user_id = auth.uid())
  );

CREATE POLICY "own_team_feedbacks" ON feedbacks
  FOR ALL USING (
    team_id IN (SELECT team_id FROM user_teams WHERE user_id = auth.uid())
  );
