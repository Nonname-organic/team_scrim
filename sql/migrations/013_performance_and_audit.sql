-- ============================================================
-- Migration 013: Performance indexes + Audit log
-- ============================================================

-- ── Performance indexes ──────────────────────────────────────

-- matches: よく使うフィルタの複合インデックス
CREATE INDEX IF NOT EXISTS idx_matches_team_date
  ON matches(team_id, match_date DESC);

CREATE INDEX IF NOT EXISTS idx_matches_team_map
  ON matches(team_id, map);

CREATE INDEX IF NOT EXISTS idx_matches_team_type
  ON matches(team_id, match_type);

-- rounds: match_id + round_number の複合（ソートが速くなる）
CREATE INDEX IF NOT EXISTS idx_rounds_match_round
  ON rounds(match_id, round_number);

-- player_stats: 選手別の成績集計
CREATE INDEX IF NOT EXISTS idx_player_stats_player_match
  ON player_stats(player_id, match_id);

-- feedbacks: match単位の取得
CREATE INDEX IF NOT EXISTS idx_feedbacks_match_type
  ON feedbacks(match_id, type);

-- ── Audit Log ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID,
  team_id     UUID,
  action      VARCHAR(50)  NOT NULL,
  resource    VARCHAR(50),
  resource_id UUID,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_team    ON audit_logs(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user    ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action  ON audit_logs(action, created_at DESC);

-- ── Rate limit tracking ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         VARCHAR(200) NOT NULL,          -- e.g. "user:{uuid}:ai_daily"
  count       INTEGER      NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON api_rate_limits(key, window_start);
