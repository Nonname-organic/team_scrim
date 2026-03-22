import { query, queryOne } from './db'
import type {
  DashboardSummary,
  PlayerCareerStats,
  TeamWinRates,
  WinRateTrend,
  Round,
  TeamStats,
} from '@/types'

// ============================================================
// Dashboard
// ============================================================

export async function getDashboardSummary(teamId: string, mapFilter?: string): Promise<DashboardSummary> {
  const mapClause = mapFilter ? `AND map = $2` : ''
  const matchParams: unknown[] = [teamId]
  if (mapFilter) matchParams.push(mapFilter)

  const [team, recentMatches, mapStats, topPerformers, lastReport] = await Promise.all([
    queryOne('SELECT * FROM teams WHERE id = $1', [teamId]),
    query(
      `SELECT * FROM matches WHERE team_id = $1 ${mapClause} ORDER BY match_date DESC LIMIT 20`,
      matchParams
    ),
    query<TeamWinRates>(
      `SELECT * FROM v_team_win_rates WHERE team_id = $1${mapFilter ? ` AND map = $2` : ''}`,
      mapFilter ? [teamId, mapFilter] : [teamId]
    ),
    query<PlayerCareerStats>(
      `SELECT * FROM v_player_career_stats WHERE team_id = $1 ORDER BY avg_acs DESC LIMIT 5`,
      [teamId]
    ),
    queryOne(
      `SELECT * FROM ai_reports WHERE team_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [teamId]
    ),
  ])

  const totalMatches = recentMatches.length
  const wins = recentMatches.filter((m: Record<string, unknown>) => m.result === 'win').length
  const overallWinRate = totalMatches > 0 ? wins / totalMatches : 0

  const attackWR = mapStats.reduce((sum, s) => sum + (s.attack_win_rate ?? 0), 0) / (mapStats.length || 1)
  const defenseWR = mapStats.reduce((sum, s) => sum + (s.defense_win_rate ?? 0), 0) / (mapStats.length || 1)

  return {
    team: team as DashboardSummary['team'],
    recent_matches: recentMatches as DashboardSummary['recent_matches'],
    overall_win_rate: overallWinRate,
    attack_win_rate: attackWR,
    defense_win_rate: defenseWR,
    map_stats: mapStats,
    top_performers: topPerformers,
    last_ai_report: lastReport as DashboardSummary['last_ai_report'],
  }
}

// ============================================================
// Win Rate Trend (last N matches)
// ============================================================

export async function getWinRateTrend(teamId: string, n = 20, mapFilter?: string): Promise<WinRateTrend[]> {
  const mapClause = mapFilter ? `AND map = $3` : ''
  const params: unknown[] = [teamId, n]
  if (mapFilter) params.push(mapFilter)

  const matches = await query<{
    match_date: string
    result: string
    attack_rounds_won: number
    attack_rounds_played: number
    defense_rounds_won: number
    defense_rounds_played: number
  }>(
    `SELECT match_date, result, attack_rounds_won, attack_rounds_played,
            defense_rounds_won, defense_rounds_played
     FROM matches WHERE team_id = $1 ${mapClause} ORDER BY match_date DESC LIMIT $2`,
    params
  )

  // Rolling 5-match window
  return matches.reverse().map((m, i, arr) => {
    const window = arr.slice(Math.max(0, i - 4), i + 1)
    const winRate = window.filter(w => w.result === 'win').length / window.length
    const attackWr = window.reduce(
      (s, w) => s + (w.attack_rounds_played > 0 ? w.attack_rounds_won / w.attack_rounds_played : 0),
      0
    ) / window.length
    const defenseWr = window.reduce(
      (s, w) => s + (w.defense_rounds_played > 0 ? w.defense_rounds_won / w.defense_rounds_played : 0),
      0
    ) / window.length

    return {
      date: new Date(m.match_date).toISOString().slice(0, 10),
      win_rate: Math.round(winRate * 1000) / 10,
      attack_wr: Math.round(attackWr * 1000) / 10,
      defense_wr: Math.round(defenseWr * 1000) / 10,
      matches: window.length,
    }
  })
}

// ============================================================
// Economy Analysis
// ============================================================

export async function getEconomyWinRates(teamId: string, mapFilter?: string) {
  const mapClause = mapFilter ? `AND m.map = $2` : ''
  const params: unknown[] = [teamId]
  if (mapFilter) params.push(mapFilter)

  const rows = await query<{
    economy_type: string
    rounds: number
    wins: number
    win_rate: number
  }>(
    `SELECT r.economy_type, COUNT(*) AS rounds,
            SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END) AS wins,
            ROUND(SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*), 3) AS win_rate
     FROM rounds r
     JOIN matches m ON m.id = r.match_id
     WHERE m.team_id = $1 AND r.economy_type IS NOT NULL ${mapClause}
     GROUP BY r.economy_type
     ORDER BY win_rate DESC`,
    params
  )
  return rows
}

// ============================================================
// First Blood Impact
// ============================================================

export async function getFirstBloodImpact(teamId: string, mapFilter?: string) {
  const mapClause = mapFilter ? `AND m.map = $2` : ''
  const params: unknown[] = [teamId]
  if (mapFilter) params.push(mapFilter)

  const rows = await query<{
    fb_team: boolean
    rounds: number
    wins: number
    win_rate: number
  }>(
    `SELECT r.first_blood_team AS fb_team,
            COUNT(*) AS rounds,
            SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END) AS wins,
            ROUND(SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*), 3) AS win_rate
     FROM rounds r
     JOIN matches m ON m.id = r.match_id
     WHERE m.team_id = $1 AND r.first_blood_team IS NOT NULL ${mapClause}
     GROUP BY r.first_blood_team`,
    params
  )
  return rows
}

// ============================================================
// Site Win Rates (aggregate)
// ============================================================

export async function getSiteWinRates(teamId: string) {
  const rows = await query<TeamStats>(
    `SELECT ts.* FROM team_stats ts
     JOIN matches m ON m.id = ts.match_id
     WHERE ts.team_id = $1`,
    [teamId]
  )

  const agg = rows.reduce(
    (acc, r) => ({
      a_attack: { wins: acc.a_attack.wins + r.a_site_attack_wins, total: acc.a_attack.total + r.a_site_attack_total },
      b_attack: { wins: acc.b_attack.wins + r.b_site_attack_wins, total: acc.b_attack.total + r.b_site_attack_total },
      a_retake: { wins: acc.a_retake.wins + r.a_site_retake_wins, total: acc.a_retake.total + r.a_site_retake_total },
      b_retake: { wins: acc.b_retake.wins + r.b_site_retake_wins, total: acc.b_retake.total + r.b_site_retake_total },
      post_plant: { wins: acc.post_plant.wins + r.post_plant_wins, total: acc.post_plant.total + r.post_plant_total },
    }),
    {
      a_attack:  { wins: 0, total: 0 },
      b_attack:  { wins: 0, total: 0 },
      a_retake:  { wins: 0, total: 0 },
      b_retake:  { wins: 0, total: 0 },
      post_plant:{ wins: 0, total: 0 },
    }
  )

  return Object.fromEntries(
    Object.entries(agg).map(([k, v]) => [
      k,
      { ...v, win_rate: v.total > 0 ? Math.round((v.wins / v.total) * 1000) / 10 : null },
    ])
  )
}

// ============================================================
// Site & Post-plant analysis (from rounds table)
// ============================================================

export async function getRoundSiteStats(teamId: string, mapFilter?: string) {
  const mapClause = mapFilter ? `AND m.map = $2` : ''
  const params: unknown[] = [teamId]
  if (mapFilter) params.push(mapFilter)

  // Post-plant overall
  const [postPlant, bySite, byMap] = await Promise.all([
    query<{ total: number; wins: number; win_rate: number }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END) AS wins,
              ROUND(SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*),0), 3) AS win_rate
       FROM rounds r JOIN matches m ON m.id = r.match_id
       WHERE m.team_id = $1 AND r.planted = true ${mapClause}`,
      params
    ),
    // ATK execute & DEF retake by site (A/B), map-agnostic
    query<{
      plant_site: string; side: string
      total: number; wins: number; win_rate: number
    }>(
      `SELECT r.plant_site, r.side,
              COUNT(*) AS total,
              SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END) AS wins,
              ROUND(SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*),0), 3) AS win_rate
       FROM rounds r JOIN matches m ON m.id = r.match_id
       WHERE m.team_id = $1 AND r.planted = true AND r.plant_site IS NOT NULL ${mapClause}
       GROUP BY r.plant_site, r.side
       ORDER BY r.plant_site, r.side`,
      params
    ),
    // Per-map breakdown
    query<{
      map: string; plant_site: string; side: string
      total: number; wins: number; win_rate: number
    }>(
      `SELECT m.map, r.plant_site, r.side,
              COUNT(*) AS total,
              SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END) AS wins,
              ROUND(SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*),0), 3) AS win_rate
       FROM rounds r JOIN matches m ON m.id = r.match_id
       WHERE m.team_id = $1 AND r.planted = true AND r.plant_site IS NOT NULL ${mapClause}
       GROUP BY m.map, r.plant_site, r.side
       ORDER BY m.map, r.plant_site, r.side`,
      params
    ),
  ])

  return { post_plant: postPlant[0] ?? null, by_site: bySite, by_map: byMap }
}

// ============================================================
// Round-by-round analysis (round 1, 2, 3...)
// ============================================================

export async function getRoundNumberWinRates(teamId: string, mapFilter?: string) {
  const mapClause = mapFilter ? `AND m.map = $2` : ''
  const params: unknown[] = [teamId]
  if (mapFilter) params.push(mapFilter)

  return query<{ round_number: number; rounds: number; wins: number; win_rate: number }>(
    `SELECT r.round_number,
            COUNT(*) AS rounds,
            SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END) AS wins,
            ROUND(SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*), 3) AS win_rate
     FROM rounds r
     JOIN matches m ON m.id = r.match_id
     WHERE m.team_id = $1 ${mapClause}
     GROUP BY r.round_number
     ORDER BY r.round_number`,
    params
  )
}

// ============================================================
// Player radar stats (normalized 0-100)
// ============================================================

export async function getPlayerRadarStats(playerId: string) {
  const stats = await queryOne<PlayerCareerStats>(
    'SELECT * FROM v_player_career_stats WHERE player_id = $1',
    [playerId]
  )
  if (!stats) return null

  // Normalize against rough competitive benchmarks
  return [
    { subject: 'ACS',    value: Math.min(100, Math.round((stats.avg_acs  / 300)  * 100)), fullMark: 100 },
    { subject: 'KD',     value: Math.min(100, Math.round((stats.avg_kd   / 1.8)  * 100)), fullMark: 100 },
    { subject: 'ADR',    value: Math.min(100, Math.round((stats.avg_adr  / 180)  * 100)), fullMark: 100 },
    { subject: 'FBSR',   value: Math.min(100, Math.round((stats.career_fbsr / 0.7) * 100)), fullMark: 100 },
    { subject: 'KPR',    value: Math.min(100, Math.round((stats.avg_kpr  / 1.0)  * 100)), fullMark: 100 },
  ]
}

// ============================================================
// Build AI analysis context payload
// ============================================================

export async function buildAIContext(teamId: string, matchId?: string) {
  const [
    teamWinRates,
    economyWinRates,
    fbImpact,
    siteWinRates,
    roundWinRates,
    playerStats,
  ] = await Promise.all([
    query<TeamWinRates>('SELECT * FROM v_team_win_rates WHERE team_id = $1', [teamId]),
    getEconomyWinRates(teamId),
    getFirstBloodImpact(teamId),
    getSiteWinRates(teamId),
    getRoundNumberWinRates(teamId),
    query<PlayerCareerStats>(
      'SELECT * FROM v_player_career_stats WHERE team_id = $1',
      [teamId]
    ),
  ])

  let matchData = null
  if (matchId) {
    const [match, rounds, events] = await Promise.all([
      queryOne('SELECT * FROM matches WHERE id = $1', [matchId]),
      query<Round>('SELECT * FROM rounds WHERE match_id = $1 ORDER BY round_number', [matchId]),
      query('SELECT e.*, p.ign AS killer_ign, v.ign AS victim_ign FROM events e LEFT JOIN players p ON p.id = e.killer_player_id LEFT JOIN players v ON v.id = e.victim_player_id WHERE e.match_id = $1 ORDER BY e.round_number, e.timestamp_sec', [matchId]),
    ])
    matchData = { match, rounds, events }
  }

  return {
    team_win_rates: teamWinRates,
    economy_win_rates: economyWinRates,
    first_blood_impact: fbImpact,
    site_win_rates: siteWinRates,
    round_win_rates: roundWinRates,
    player_stats: playerStats,
    match_data: matchData,
  }
}
