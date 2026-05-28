-- Docker local DB initialization (schema + all migrations)

-- ===== Mock Supabase auth schema for local Docker =====
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Mock auth.uid() — always returns a fixed UUID (RLS bypassed by direct pg connection anyway)
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT '00000000-0000-0000-0000-000000000000'::UUID;
$$ LANGUAGE sql STABLE;

-- ===== schema.sql =====
-- ============================================================
-- VALORANT Scrim Analyzer - Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  tag           VARCHAR(10)  NOT NULL,
  logo_url      TEXT,
  region        VARCHAR(20)  DEFAULT 'JP',
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- PLAYERS
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id       UUID REFERENCES teams(id) ON DELETE CASCADE,
  ign           VARCHAR(50)  NOT NULL,
  real_name     VARCHAR(100),
  role          VARCHAR(20)  CHECK (role IN ('duelist','sub_duelist','initiator','controller','sentinel','flex','igl')),
  agent_pool    TEXT[],
  active        BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id       UUID REFERENCES teams(id) ON DELETE CASCADE,
  opponent_name VARCHAR(100) NOT NULL,
  match_date    TIMESTAMPTZ  NOT NULL,
  map           VARCHAR(30)  NOT NULL,
  match_type    VARCHAR(20)  DEFAULT 'scrim'
                CHECK (match_type IN ('scrim','official','practice')),

  -- Final score
  team_score    SMALLINT     NOT NULL,
  opponent_score SMALLINT    NOT NULL,
  result        VARCHAR(4)   GENERATED ALWAYS AS (
                  CASE WHEN team_score > opponent_score THEN 'win'
                       WHEN team_score < opponent_score THEN 'loss'
                       ELSE 'draw' END
                ) STORED,

  -- Side scores
  attack_rounds_won   SMALLINT DEFAULT 0,
  attack_rounds_played SMALLINT DEFAULT 0,
  defense_rounds_won  SMALLINT DEFAULT 0,
  defense_rounds_played SMALLINT DEFAULT 0,

  -- Metadata
  video_url     TEXT,
  scoreboard_image_url TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- ROUNDS
-- ============================================================
CREATE TABLE IF NOT EXISTS rounds (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id      UUID REFERENCES matches(id) ON DELETE CASCADE,
  round_number  SMALLINT     NOT NULL,
  side          VARCHAR(10)  NOT NULL CHECK (side IN ('attack','defense')),
  result        VARCHAR(10)  NOT NULL CHECK (result IN ('win','loss')),
  win_condition VARCHAR(20)  CHECK (win_condition IN ('elimination','defuse','detonate','time')),

  -- Economy
  economy_type  VARCHAR(20)  CHECK (economy_type IN ('pistol','eco','anti_eco','semi_eco','semi_buy','full_buy','oper','second','third')),
  team_credits_avg    INTEGER,
  opp_credits_avg     INTEGER,

  -- Plant
  planted       BOOLEAN      DEFAULT FALSE,
  plant_site    VARCHAR(1)   CHECK (plant_site IN ('A','B','C','M')),
  plant_time_sec SMALLINT,
  plant_x       FLOAT,
  plant_y       FLOAT,

  -- Kill counts
  team_kills    SMALLINT     DEFAULT 0,
  opp_kills     SMALLINT     DEFAULT 0,
  first_blood_team BOOLEAN,

  -- Timing / retake
  contact_timing VARCHAR(10) CHECK (contact_timing IN ('early','mid','late')),
  retake        BOOLEAN      DEFAULT FALSE,
  notable       BOOLEAN      DEFAULT FALSE,

  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id      UUID REFERENCES matches(id) ON DELETE CASCADE,
  round_id      UUID REFERENCES rounds(id) ON DELETE CASCADE,
  round_number  SMALLINT     NOT NULL,
  event_type    VARCHAR(20)  NOT NULL
                CHECK (event_type IN ('kill','death','assist','plant','defuse','ultimate','ability')),
  timestamp_sec SMALLINT,

  killer_player_id   UUID REFERENCES players(id),
  victim_player_id   UUID REFERENCES players(id),
  assister_player_id UUID REFERENCES players(id),
  weapon             VARCHAR(30),
  headshot           BOOLEAN DEFAULT FALSE,
  wall_bang          BOOLEAN DEFAULT FALSE,

  location_x   NUMERIC(5,2),
  location_y   NUMERIC(5,2),

  site         VARCHAR(1),
  is_firstblood BOOLEAN DEFAULT FALSE,
  is_clutch     BOOLEAN DEFAULT FALSE,

  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- PLAYER STATS (per match)
-- ============================================================
CREATE TABLE IF NOT EXISTS player_stats (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id      UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id     UUID REFERENCES players(id) ON DELETE CASCADE,
  agent         VARCHAR(30)  NOT NULL,

  kills         SMALLINT     DEFAULT 0,
  deaths        SMALLINT     DEFAULT 0,
  assists       SMALLINT     DEFAULT 0,
  acs           SMALLINT     DEFAULT 0,

  kpr           NUMERIC(4,3) DEFAULT 0,
  dpr           NUMERIC(4,3) DEFAULT 0,
  apr           NUMERIC(4,3) DEFAULT 0,

  first_bloods  SMALLINT     DEFAULT 0,
  first_deaths  SMALLINT     DEFAULT 0,
  fbsr          NUMERIC(4,3) DEFAULT 0,

  adr           NUMERIC(6,2) DEFAULT 0,
  hs_pct        NUMERIC(4,1) DEFAULT 0,

  clutch_attempts SMALLINT   DEFAULT 0,
  clutch_wins     SMALLINT   DEFAULT 0,

  econ_rating   NUMERIC(6,2) DEFAULT 0,

  kd_ratio      NUMERIC(4,3) GENERATED ALWAYS AS (
                  CASE WHEN deaths = 0 THEN kills::NUMERIC
                       ELSE kills::NUMERIC / deaths END
                ) STORED,

  rounds_played SMALLINT     DEFAULT 0,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),

  UNIQUE (match_id, player_id)
);

-- ============================================================
-- TEAM STATS (per match)
-- ============================================================
CREATE TABLE IF NOT EXISTS team_stats (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id      UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id       UUID REFERENCES teams(id) ON DELETE CASCADE,

  a_site_attack_wins   SMALLINT DEFAULT 0,
  a_site_attack_total  SMALLINT DEFAULT 0,
  b_site_attack_wins   SMALLINT DEFAULT 0,
  b_site_attack_total  SMALLINT DEFAULT 0,
  a_site_retake_wins   SMALLINT DEFAULT 0,
  a_site_retake_total  SMALLINT DEFAULT 0,
  b_site_retake_wins   SMALLINT DEFAULT 0,
  b_site_retake_total  SMALLINT DEFAULT 0,

  post_plant_wins      SMALLINT DEFAULT 0,
  post_plant_total     SMALLINT DEFAULT 0,

  pistol_wins          SMALLINT DEFAULT 0,
  pistol_total         SMALLINT DEFAULT 2,
  eco_wins             SMALLINT DEFAULT 0,
  eco_total            SMALLINT DEFAULT 0,
  full_buy_wins        SMALLINT DEFAULT 0,
  full_buy_total       SMALLINT DEFAULT 0,
  anti_eco_wins        SMALLINT DEFAULT 0,
  anti_eco_total       SMALLINT DEFAULT 0,

  fb_round_wins        SMALLINT DEFAULT 0,
  fb_round_total       SMALLINT DEFAULT 0,
  fd_round_wins        SMALLINT DEFAULT 0,
  fd_round_total       SMALLINT DEFAULT 0,

  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (match_id, team_id)
);

-- ============================================================
-- AI ANALYSIS REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id       UUID REFERENCES teams(id) ON DELETE CASCADE,
  match_id      UUID REFERENCES matches(id),
  report_type   VARCHAR(20)  DEFAULT 'post_match'
                CHECK (report_type IN ('post_match','weekly','player','tactical')),

  loss_reasons  JSONB,
  win_patterns  JSONB,
  improvements  JSONB,
  player_feedback JSONB,

  raw_analysis  TEXT,
  model_used    VARCHAR(50) DEFAULT 'claude-sonnet-4-6',
  tokens_used   INTEGER,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_matches_team_id      ON matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_date         ON matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_match_id      ON rounds(match_id);
CREATE INDEX IF NOT EXISTS idx_events_match_id      ON events(match_id);
CREATE INDEX IF NOT EXISTS idx_events_round_id      ON events(round_id);
CREATE INDEX IF NOT EXISTS idx_events_killer        ON events(killer_player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player  ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_match   ON player_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_match     ON team_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_team      ON ai_reports(team_id);

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_player_career_stats AS
SELECT
  p.id AS player_id,
  p.ign,
  p.role,
  p.team_id,
  COUNT(ps.match_id)              AS matches_played,
  ROUND(AVG(ps.kills), 2)         AS avg_kills,
  ROUND(AVG(ps.deaths), 2)        AS avg_deaths,
  ROUND(AVG(ps.assists), 2)       AS avg_assists,
  ROUND(AVG(ps.acs), 1)           AS avg_acs,
  ROUND(AVG(ps.kd_ratio), 3)      AS avg_kd,
  ROUND(AVG(ps.kpr), 3)           AS avg_kpr,
  ROUND(AVG(ps.dpr), 3)           AS avg_dpr,
  ROUND(AVG(ps.adr), 1)           AS avg_adr,
  ROUND(AVG(ps.hs_pct), 1)        AS avg_hs_pct,
  SUM(ps.first_bloods)            AS total_first_bloods,
  SUM(ps.first_deaths)            AS total_first_deaths,
  ROUND(
    CASE WHEN SUM(ps.first_bloods + ps.first_deaths) = 0 THEN 0
         ELSE SUM(ps.first_bloods)::NUMERIC /
              SUM(ps.first_bloods + ps.first_deaths)
    END, 3
  )                               AS career_fbsr
FROM players p
LEFT JOIN player_stats ps ON ps.player_id = p.id
GROUP BY p.id, p.ign, p.role, p.team_id;

CREATE OR REPLACE VIEW v_team_win_rates AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  m.map,
  COUNT(*)                                          AS total_matches,
  SUM(CASE WHEN m.result = 'win' THEN 1 ELSE 0 END) AS wins,
  ROUND(
    SUM(CASE WHEN m.result = 'win' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*),
    3
  )                                                 AS win_rate,
  ROUND(AVG(
    CASE WHEN m.attack_rounds_played > 0
         THEN m.attack_rounds_won::NUMERIC / m.attack_rounds_played
         ELSE NULL END
  ), 3)                                             AS attack_win_rate,
  ROUND(AVG(
    CASE WHEN m.defense_rounds_played > 0
         THEN m.defense_rounds_won::NUMERIC / m.defense_rounds_played
         ELSE NULL END
  ), 3)                                             AS defense_win_rate
FROM teams t
JOIN matches m ON m.team_id = t.id
GROUP BY t.id, t.name, m.map;

CREATE OR REPLACE VIEW v_round_conditions AS
SELECT
  r.match_id,
  m.team_id,
  m.map,
  r.economy_type,
  r.planted,
  r.plant_site,
  r.first_blood_team,
  COUNT(*)                                            AS rounds,
  SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END)  AS wins,
  ROUND(
    SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*),
    3
  )                                                   AS win_rate
FROM rounds r
JOIN matches m ON m.id = r.match_id
GROUP BY r.match_id, m.team_id, m.map, r.economy_type,
         r.planted, r.plant_site, r.first_blood_team;

-- ===== 004_add_feedbacks.sql =====
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

-- ===== 005_auth_and_rls.sql =====
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

-- ===== 006_add_flex_role.sql =====
-- Migration 006: Add 'flex' to players role constraint
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_role_check;
ALTER TABLE players ADD CONSTRAINT players_role_check
  CHECK (role IN ('duelist','initiator','controller','sentinel','igl','flex'));

-- ===== 007_add_sub_duelist_role.sql =====
-- Migration 007: Add 'sub_duelist' role
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_role_check;
ALTER TABLE players ADD CONSTRAINT players_role_check
  CHECK (role IN ('duelist','sub_duelist','initiator','controller','sentinel','flex','igl'));

-- ===== 008_add_plans.sql =====
-- Migration 008: Add plan management to user_teams
-- Run on Supabase SQL Editor

ALTER TABLE user_teams
  ADD COLUMN IF NOT EXISTS plan              VARCHAR(20)  DEFAULT 'free'
    CHECK (plan IN ('free','pro','team')),
  ADD COLUMN IF NOT EXISTS ai_usage_count    INTEGER      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_usage_reset_at TIMESTAMPTZ  DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS stripe_customer_id     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS plan_expires_at         TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_teams_stripe
  ON user_teams(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ===== 009_fix_role_constraint.sql =====
-- Migration 009: Fix role constraint to include sub_duelist and flex
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_role_check;
ALTER TABLE players ADD CONSTRAINT players_role_check
  CHECK (role IN ('duelist','sub_duelist','initiator','controller','sentinel','igl','flex'));

-- ===== 010_add_round_memo.sql =====
-- Add memo column to rounds for per-round coach notes
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS memo TEXT;

-- ===== 011_add_round_vod_start_sec.sql =====
-- Add per-round VOD start timestamp for video seek in round analysis
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS vod_start_sec INTEGER;

-- ===== 012_add_payment_orders.sql =====
-- Migration 012: Add payment_orders table for non-subscription payments
CREATE TABLE IF NOT EXISTS payment_orders (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           UUID         REFERENCES teams(id) ON DELETE CASCADE,
  user_id           UUID         NOT NULL,
  plan              VARCHAR(20)  NOT NULL CHECK (plan IN ('pro','team')),
  months            SMALLINT     NOT NULL DEFAULT 1,
  amount            INTEGER      NOT NULL,
  payment_method    VARCHAR(30)  NOT NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','expired','cancelled')),
  reference         VARCHAR(20),
  stripe_session_id VARCHAR(255),
  notes             TEXT,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_team
  ON payment_orders(team_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_stripe
  ON payment_orders(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_orders_reference
  ON payment_orders(reference)
  WHERE reference IS NOT NULL;
