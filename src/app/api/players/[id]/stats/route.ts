import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getPlayerRadarStats } from '@/lib/analysis'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playerId } = await params
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') ?? 20)

  const [career, recentStats, radarStats, mapStats, agentStats] = await Promise.all([
    queryOne(
      'SELECT * FROM v_player_career_stats WHERE player_id = $1',
      [playerId]
    ),
    query(
      `SELECT ps.*, m.match_date, m.map, m.opponent_name, m.result
       FROM player_stats ps
       JOIN matches m ON m.id = ps.match_id
       WHERE ps.player_id = $1
       ORDER BY m.match_date DESC
       LIMIT $2`,
      [playerId, limit]
    ),
    getPlayerRadarStats(playerId),
    query(
      `SELECT m.map,
              COUNT(*) AS matches_played,
              SUM(CASE WHEN m.result = 'win' THEN 1 ELSE 0 END) AS wins,
              ROUND(AVG(ps.acs), 1) AS avg_acs,
              ROUND(AVG(ps.kills), 1) AS avg_kills,
              ROUND(AVG(ps.deaths), 1) AS avg_deaths,
              ROUND(AVG(ps.assists), 1) AS avg_assists,
              ROUND(AVG(ps.kpr), 3) AS avg_kpr,
              ROUND(AVG(ps.hs_pct), 1) AS avg_hs_pct,
              ROUND(SUM(ps.first_bloods)::NUMERIC /
                NULLIF(SUM(ps.first_bloods) + SUM(ps.first_deaths), 0), 3) AS fbsr
       FROM player_stats ps
       JOIN matches m ON m.id = ps.match_id
       WHERE ps.player_id = $1
       GROUP BY m.map
       ORDER BY matches_played DESC`,
      [playerId]
    ),
    query(
      `SELECT ps.agent,
              COUNT(*) AS matches_played,
              SUM(CASE WHEN m.result = 'win' THEN 1 ELSE 0 END) AS wins,
              ROUND(AVG(ps.acs), 1) AS avg_acs,
              ROUND(AVG(ps.kills), 1) AS avg_kills,
              ROUND(AVG(ps.deaths), 1) AS avg_deaths,
              ROUND(AVG(ps.assists), 1) AS avg_assists,
              ROUND(AVG(ps.kpr), 3) AS avg_kpr,
              ROUND(AVG(ps.hs_pct), 1) AS avg_hs_pct,
              ROUND(SUM(ps.first_bloods)::NUMERIC /
                NULLIF(SUM(ps.first_bloods) + SUM(ps.first_deaths), 0), 3) AS fbsr
       FROM player_stats ps
       JOIN matches m ON m.id = ps.match_id
       WHERE ps.player_id = $1
       GROUP BY ps.agent
       ORDER BY matches_played DESC`,
      [playerId]
    ),
  ])

  return NextResponse.json({
    data: {
      career,
      recent: recentStats,
      radar: radarStats,
      map_stats: mapStats,
      agent_stats: agentStats,
    },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playerId } = await params
  const body = await req.json()

  const {
    match_id, agent, kills, deaths, assists, acs, adr = 0,
    hs_pct = 0, first_bloods = 0, first_deaths = 0,
    clutch_attempts = 0, clutch_wins = 0, rounds_played,
  } = body

  const kpr = rounds_played > 0 ? kills / rounds_played : 0
  const dpr = rounds_played > 0 ? deaths / rounds_played : 0
  const apr = rounds_played > 0 ? assists / rounds_played : 0
  const fbsr = (first_bloods + first_deaths) > 0
    ? first_bloods / (first_bloods + first_deaths) : 0

  const stat = await queryOne(
    `INSERT INTO player_stats
       (match_id, player_id, agent, kills, deaths, assists, acs, kpr, dpr, apr,
        first_bloods, first_deaths, fbsr, adr, hs_pct,
        clutch_attempts, clutch_wins, rounds_played)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (match_id, player_id) DO UPDATE SET
       agent=$3, kills=$4, deaths=$5, assists=$6, acs=$7, kpr=$8, dpr=$9, apr=$10,
       first_bloods=$11, first_deaths=$12, fbsr=$13, adr=$14, hs_pct=$15,
       clutch_attempts=$16, clutch_wins=$17, rounds_played=$18
     RETURNING *`,
    [
      match_id, playerId, agent, kills, deaths, assists, acs,
      kpr, dpr, apr, first_bloods, first_deaths, fbsr,
      adr, hs_pct, clutch_attempts, clutch_wins, rounds_played,
    ]
  )

  return NextResponse.json({ data: stat }, { status: 201 })
}
