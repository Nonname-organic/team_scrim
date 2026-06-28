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
// Filter clause helper — appends map/matchType conditions and returns $N references
// ============================================================

function applyFilters(
  params: unknown[],
  map?: string,
  matchType?: string,
  alias = ''
): string {
  const pre = alias ? `${alias}.` : ''
  let clause = ''
  if (map)       clause += ` AND ${pre}map = $${params.push(map)}`
  if (matchType) clause += ` AND ${pre}match_type = $${params.push(matchType)}`
  return clause
}

// ============================================================
// Dashboard
// ============================================================

export async function getDashboardSummary(
  teamId: string, mapFilter?: string, matchTypeFilter?: string
): Promise<DashboardSummary> {
  const matchParams: unknown[] = [teamId]
  const filterClause = applyFilters(matchParams, mapFilter, matchTypeFilter)

  // v_team_win_rates には match_type 列がないため mapFilter のみ適用
  const mapStatsParams: unknown[] = [teamId]
  const mapStatsClause = mapFilter ? ` AND map = $${mapStatsParams.push(mapFilter)}` : ''

  const [team, recentMatches, mapStats, topPerformers, lastReport, sideRates] = await Promise.all([
    queryOne('SELECT * FROM teams WHERE id = $1', [teamId]),
    query(
      `SELECT * FROM matches WHERE team_id = $1${filterClause} ORDER BY match_date DESC LIMIT 20`,
      matchParams
    ),
    query<TeamWinRates>(
      `SELECT * FROM v_team_win_rates WHERE team_id = $1${mapStatsClause}`,
      mapStatsParams
    ),
    query<PlayerCareerStats>(
      `SELECT * FROM v_player_career_stats WHERE team_id = $1 ORDER BY avg_acs DESC LIMIT 5`,
      [teamId]
    ),
    queryOne(
      `SELECT * FROM ai_reports WHERE team_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [teamId]
    ),
    // Compute ATK/DEF win rates directly from rounds (reliable regardless of match-level fields)
    query<{ side: string; wins: number; total: number }>(
      `SELECT r.side,
              SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END)::int AS wins,
              COUNT(*)::int AS total
       FROM rounds r
       JOIN matches m ON m.id = r.match_id
       WHERE m.team_id = $1${filterClause}
       GROUP BY r.side`,
      matchParams
    ),
  ])

  const totalMatches = recentMatches.length
  const wins = recentMatches.filter((m: Record<string, unknown>) => m.result === 'win').length
  const overallWinRate = totalMatches > 0 ? wins / totalMatches : 0

  const atkData = sideRates.find(r => r.side === 'attack')
  const defData = sideRates.find(r => r.side === 'defense')
  const attackWR  = atkData && atkData.total  > 0 ? atkData.wins  / atkData.total  : 0
  const defenseWR = defData && defData.total > 0 ? defData.wins / defData.total : 0

  return {
    team: team as unknown as DashboardSummary['team'],
    recent_matches: recentMatches as unknown as DashboardSummary['recent_matches'],
    overall_win_rate: overallWinRate,
    attack_win_rate: attackWR,
    defense_win_rate: defenseWR,
    map_stats: mapStats,
    top_performers: topPerformers,
    last_ai_report: lastReport as unknown as DashboardSummary['last_ai_report'],
  }
}

// ============================================================
// Win Rate Trend (last N matches)
// ============================================================

export async function getWinRateTrend(
  teamId: string, n = 20, mapFilter?: string, matchTypeFilter?: string
): Promise<WinRateTrend[]> {
  const params: unknown[] = [teamId, n]
  const filterClause = applyFilters(params, mapFilter, matchTypeFilter)

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
     FROM matches WHERE team_id = $1${filterClause} ORDER BY match_date DESC LIMIT $2`,
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

export async function getEconomyWinRates(teamId: string, mapFilter?: string, matchTypeFilter?: string) {
  const params: unknown[] = [teamId]
  const filterClause = applyFilters(params, mapFilter, matchTypeFilter, 'm')

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
     WHERE m.team_id = $1 AND r.economy_type IS NOT NULL${filterClause}
     GROUP BY r.economy_type
     ORDER BY win_rate DESC`,
    params
  )
  return rows
}

// ============================================================
// First Blood Impact
// ============================================================

export async function getFirstBloodImpact(teamId: string, mapFilter?: string, matchTypeFilter?: string) {
  const params: unknown[] = [teamId]
  const filterClause = applyFilters(params, mapFilter, matchTypeFilter, 'm')

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
     WHERE m.team_id = $1 AND r.first_blood_team IS NOT NULL${filterClause}
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

export async function getRoundSiteStats(teamId: string, mapFilter?: string, matchTypeFilter?: string) {
  const params: unknown[] = [teamId]
  const filterClause = applyFilters(params, mapFilter, matchTypeFilter, 'm')

  // Post-plant overall
  const [postPlant, bySite, byMap] = await Promise.all([
    query<{ total: number; wins: number; win_rate: number }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END) AS wins,
              ROUND(SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*),0), 3) AS win_rate
       FROM rounds r JOIN matches m ON m.id = r.match_id
       WHERE m.team_id = $1 AND r.planted = true${filterClause}`,
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
       WHERE m.team_id = $1 AND r.planted = true AND r.plant_site IS NOT NULL${filterClause}
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
       WHERE m.team_id = $1 AND r.planted = true AND r.plant_site IS NOT NULL${filterClause}
       GROUP BY m.map, r.plant_site, r.side
       ORDER BY m.map, r.plant_site, r.side`,
      params
    ),
  ])

  return { post_plant: postPlant[0] ?? null, by_site: bySite, by_map: byMap }
}

// ============================================================
// Timing Win Rates (early=ラッシュ / mid=デフォルト / late=スロウ)
// ============================================================

export async function getTimingWinRates(teamId: string, mapFilter?: string, matchTypeFilter?: string) {
  const params: unknown[] = [teamId]
  const filterClause = applyFilters(params, mapFilter, matchTypeFilter, 'm')

  return query<{
    contact_timing: string
    side: string
    total: number
    wins: number
    win_rate: number
  }>(
    `SELECT r.contact_timing, r.side,
            COUNT(*) AS total,
            SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END) AS wins,
            ROUND(SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*),0), 3) AS win_rate
     FROM rounds r
     JOIN matches m ON m.id = r.match_id
     WHERE m.team_id = $1 AND r.contact_timing IS NOT NULL${filterClause}
     GROUP BY r.contact_timing, r.side
     ORDER BY r.contact_timing, r.side`,
    params
  )
}

// ============================================================
// Round-by-round analysis (round 1, 2, 3...)
// ============================================================

export async function getRoundNumberWinRates(teamId: string, mapFilter?: string, matchTypeFilter?: string) {
  const params: unknown[] = [teamId]
  const filterClause = applyFilters(params, mapFilter, matchTypeFilter, 'm')

  return query<{ round_number: number; rounds: number; wins: number; win_rate: number }>(
    `SELECT r.round_number,
            COUNT(*) AS rounds,
            SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END) AS wins,
            ROUND(SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*), 3) AS win_rate
     FROM rounds r
     JOIN matches m ON m.id = r.match_id
     WHERE m.team_id = $1${filterClause}
     GROUP BY r.round_number
     ORDER BY r.round_number`,
    params
  )
}

// ============================================================
// Player radar stats (normalized 0-100)
// ============================================================

// ── Radar scoring helpers ──────────────────────────────────────────────────────

function piecewise(v: number, pts: [number, number][]): number {
  if (v <= pts[0][0]) return pts[0][1]
  if (v >= pts[pts.length - 1][0]) return pts[pts.length - 1][1]
  for (let i = 1; i < pts.length; i++) {
    if (v <= pts[i][0]) {
      const [x0, y0] = pts[i - 1]
      const [x1, y1] = pts[i]
      return Math.round(y0 + ((v - x0) / (x1 - x0)) * (y1 - y0))
    }
  }
  return pts[pts.length - 1][1]
}
function clamp100(v: number) { return Math.max(0, Math.min(100, Math.round(v))) }
function scoreACS(v: number)  { return clamp100((v - 120) / 160 * 100) }
function scoreKPR(v: number)  { return piecewise(v, [[0.40,0],[0.55,40],[0.70,70],[0.85,90],[0.95,100]]) }
function scoreKD(v: number)   { return clamp100((v - 0.70) / 0.80 * 100) }
function scoreFB(v: number)   { return piecewise(v, [[5,0],[10,50],[15,80],[20,100]]) }
function scoreKAST(v: number) { return piecewise(v, [[55,0],[65,40],[72,70],[78,90],[82,100]]) }
function scoreAPR(v: number)  { return clamp100((v - 0.10) / 0.40 * 100) }
function scoreDPR(v: number)  { return clamp100(100 - ((v - 0.55) / 0.40 * 100)) }
// Estimate KAST% from KPR+APR (KAST not stored in DB)
function estimateKAST(kpr: number, apr: number) {
  return Math.max(55, Math.min(82, 55 + ((kpr + apr) / 0.90) * 27))
}

export async function getPlayerRadarStats(playerId: string) {
  const s = await queryOne<PlayerCareerStats>(
    'SELECT * FROM v_player_career_stats WHERE player_id = $1',
    [playerId]
  )
  if (!s) return null

  const acs  = Number(s.avg_acs  ?? 0)
  const kd   = Number(s.avg_kd   ?? 0)
  const kpr  = Number(s.avg_kpr  ?? 0)
  const apr  = Number(s.avg_apr  ?? 0)
  const dpr  = Number(s.avg_dpr  ?? 0)
  const mp   = Math.max(1, Number(s.matches_played ?? 1))
  const fbPM = Number(s.total_first_bloods ?? 0) / mp
  const kast = estimateKAST(kpr, apr)

  return [
    {
      subject: '戦闘力',
      value: clamp100(0.6 * scoreACS(acs) + 0.4 * scoreKPR(kpr)),
      fullMark: 100 as const,
      components: { ACS: acs.toFixed(0), KPR: kpr.toFixed(2) },
    },
    {
      subject: '効率',
      value: scoreKD(kd),
      fullMark: 100 as const,
      components: { 'K/D': kd.toFixed(2) },
    },
    {
      subject: '影響力',
      value: clamp100(0.5 * scoreFB(fbPM) + 0.5 * scoreKAST(kast)),
      fullMark: 100 as const,
      components: { 'FB/試合': fbPM.toFixed(1), 'KAST※': `${kast.toFixed(0)}%` },
    },
    {
      subject: '支援力',
      value: scoreAPR(apr),
      fullMark: 100 as const,
      components: { APR: apr.toFixed(2) },
    },
    {
      subject: '生存力',
      value: scoreDPR(dpr),
      fullMark: 100 as const,
      components: { DPR: dpr.toFixed(2) },
    },
    {
      subject: '安定感',
      value: scoreKAST(kast),
      fullMark: 100 as const,
      components: { 'KAST※': `${kast.toFixed(0)}%` },
    },
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

// ============================================================
// AI Context V2 — match/map filtered
// ============================================================

export async function buildAIContextV2(
  teamId: string,
  options: { matchIds?: string[]; mapFilter?: string } = {}
) {
  const { matchIds, mapFilter } = options
  const hasMatchFilter = !!matchIds?.length

  // Build parameterised WHERE clauses
  const matchWhere = (alias: string, startIdx: number): { clause: string; params: unknown[] } => {
    const params: unknown[] = []
    let clause = ''
    if (hasMatchFilter) {
      clause += ` AND ${alias}.id = ANY($${startIdx + params.length}::uuid[])`
      params.push(matchIds)
    }
    if (mapFilter) {
      clause += ` AND ${alias}.map = $${startIdx + params.length}`
      params.push(mapFilter)
    }
    return { clause, params }
  }

  // Matches with agent compositions
  const mf = matchWhere('m', 2)
  const matchDetails = await query<Record<string, unknown>>(`
    SELECT
      m.id, m.match_date, m.opponent_name, m.map, m.result,
      m.team_score, m.opponent_score,
      m.attack_rounds_won, m.attack_rounds_played,
      m.defense_rounds_won, m.defense_rounds_played,
      COALESCE(
        json_agg(DISTINCT ps.agent ORDER BY ps.agent) FILTER (WHERE ps.agent IS NOT NULL),
        '[]'::json
      ) AS agents_used
    FROM matches m
    LEFT JOIN player_stats ps ON ps.match_id = m.id
    WHERE m.team_id = $1 ${mf.clause}
    GROUP BY m.id
    ORDER BY m.match_date DESC
  `, [teamId, ...mf.params])

  // Rounds for selected matches
  const rf = matchWhere('m', 2)
  const rounds = await query<Record<string, unknown>>(`
    SELECT r.round_number, r.side, r.result, r.economy_type,
           r.planted, r.plant_site, r.first_blood_team,
           m.map, m.opponent_name
    FROM rounds r
    JOIN matches m ON m.id = r.match_id
    WHERE m.team_id = $1 ${rf.clause}
    ORDER BY m.match_date DESC, r.round_number
    LIMIT 50
  `, [teamId, ...rf.params])

  // Aggregate win rates (filtered)
  const af = matchWhere('m', 2)
  const winRates = await query<Record<string, unknown>>(`
    SELECT m.map,
      COUNT(m.id) AS total_matches,
      SUM(CASE WHEN m.result = 'win' THEN 1 ELSE 0 END) AS wins,
      ROUND(
        SUM(CASE WHEN m.result = 'win' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(m.id), 0),
        3
      ) AS win_rate,
      ROUND(AVG(m.attack_rounds_won::numeric / NULLIF(m.attack_rounds_played, 0)), 3) AS attack_win_rate,
      ROUND(AVG(m.defense_rounds_won::numeric / NULLIF(m.defense_rounds_played, 0)), 3) AS defense_win_rate
    FROM matches m
    WHERE m.team_id = $1 ${af.clause}
    GROUP BY m.map
    ORDER BY total_matches DESC
  `, [teamId, ...af.params])

  // Player stats (filtered)
  const pf = matchWhere('m', 2)
  const playerStats = await query<Record<string, unknown>>(`
    SELECT p.ign, ps.agent,
      ROUND(AVG(ps.kills), 2) AS avg_kills,
      ROUND(AVG(ps.deaths), 2) AS avg_deaths,
      ROUND(AVG(ps.assists), 2) AS avg_assists,
      ROUND(AVG(ps.acs), 0) AS avg_acs,
      ROUND(AVG(ps.hs_pct), 1) AS avg_hs_pct,
      SUM(ps.first_bloods) AS total_fb,
      SUM(ps.first_deaths) AS total_fd,
      COUNT(DISTINCT ps.match_id) AS matches_played
    FROM player_stats ps
    JOIN matches m ON m.id = ps.match_id
    JOIN players p ON p.id = ps.player_id
    WHERE m.team_id = $1 ${pf.clause}
    GROUP BY p.ign, ps.agent
    ORDER BY avg_acs DESC
  `, [teamId, ...pf.params])

  // Economy win rates (filtered)
  const ef = matchWhere('m', 2)
  const economyStats = await query<Record<string, unknown>>(`
    SELECT r.economy_type,
      COUNT(*) AS total,
      SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END) AS wins,
      ROUND(SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0), 3) AS win_rate
    FROM rounds r
    JOIN matches m ON m.id = r.match_id
    WHERE m.team_id = $1 AND r.economy_type IS NOT NULL ${ef.clause}
    GROUP BY r.economy_type
    ORDER BY total DESC
  `, [teamId, ...ef.params])

  return {
    match_details: matchDetails,
    rounds_sample: rounds,
    win_rates: winRates,
    player_stats: playerStats,
    economy_stats: economyStats,
    filter_info: {
      match_count: matchDetails.length,
      map_filter: mapFilter ?? null,
      match_ids_provided: hasMatchFilter,
    },
  }
}
