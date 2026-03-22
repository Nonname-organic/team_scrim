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
  role          VARCHAR(20)  CHECK (role IN ('duelist','initiator','controller','sentinel','igl')),
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
  economy_type  VARCHAR(20)  CHECK (economy_type IN ('pistol','eco','semi_eco','semi_buy','full_buy','force')),
  team_credits_avg    INTEGER,
  opp_credits_avg     INTEGER,

  -- Plant
  planted       BOOLEAN      DEFAULT FALSE,
  plant_site    VARCHAR(1)   CHECK (plant_site IN ('A','B','C','M')),
  plant_time_sec SMALLINT,

  -- Kill counts
  team_kills    SMALLINT     DEFAULT 0,
  opp_kills     SMALLINT     DEFAULT 0,
  first_blood_team BOOLEAN,

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
