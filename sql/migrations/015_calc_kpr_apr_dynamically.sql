-- ============================================================
-- Migration 015: compute KPR/APR dynamically in view + fix stored values
-- ============================================================

-- 1. Update view to calculate KPR/DPR/APR from raw kills/assists/rounds_played
--    (avoids relying on stored kpr/apr which may be 0 for legacy rows)
--    DROP + CREATE required because column order changes (avg_apr added)
DROP VIEW IF EXISTS v_player_career_stats;
CREATE VIEW v_player_career_stats AS
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
  ROUND(
    CASE WHEN SUM(ps.rounds_played) = 0 THEN 0
         ELSE SUM(ps.kills)::NUMERIC / SUM(ps.rounds_played)
    END, 3
  )                               AS avg_kpr,
  ROUND(
    CASE WHEN SUM(ps.rounds_played) = 0 THEN 0
         ELSE SUM(ps.assists)::NUMERIC / SUM(ps.rounds_played)
    END, 3
  )                               AS avg_apr,
  ROUND(
    CASE WHEN SUM(ps.rounds_played) = 0 THEN 0
         ELSE SUM(ps.deaths)::NUMERIC / SUM(ps.rounds_played)
    END, 3
  )                               AS avg_dpr,
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

-- 2. Backfill existing rows where kpr/apr are 0 but rounds_played > 0
UPDATE player_stats
SET
  kpr = LEAST(ROUND(kills::NUMERIC   / rounds_played, 3), 9.999),
  dpr = LEAST(ROUND(deaths::NUMERIC  / rounds_played, 3), 9.999),
  apr = LEAST(ROUND(assists::NUMERIC / rounds_played, 3), 9.999)
WHERE rounds_played > 0;
