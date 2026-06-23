-- Migration 014: Fix kpr/dpr/apr column precision
-- NUMERIC(4,3) allows max 9.999 — overflows on short matches
-- Widen to NUMERIC(6,3) (max 999.999)
-- v_player_career_stats depends on kpr/dpr, so drop and recreate it

DROP VIEW IF EXISTS v_player_career_stats;

ALTER TABLE player_stats
  ALTER COLUMN kpr TYPE NUMERIC(6,3),
  ALTER COLUMN dpr TYPE NUMERIC(6,3),
  ALTER COLUMN apr TYPE NUMERIC(6,3);

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
