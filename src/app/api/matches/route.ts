import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import type { CreateMatchInput } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id')
  const map = searchParams.get('map')
  const matchType = searchParams.get('match_type')
  const limit = Number(searchParams.get('limit') ?? 50)

  if (!teamId) {
    return NextResponse.json({ error: 'team_id required' }, { status: 400 })
  }

  const conditions = ['m.team_id = $1']
  const params: unknown[] = [teamId]

  if (map) {
    params.push(map)
    conditions.push(`m.map = $${params.length}`)
  }
  if (matchType) {
    params.push(matchType)
    conditions.push(`m.match_type = $${params.length}`)
  }

  params.push(limit)

  const matches = await query(
    `SELECT m.*,
            COUNT(r.id) AS round_count,
            COUNT(ps.id) AS player_stat_count
     FROM matches m
     LEFT JOIN rounds r ON r.match_id = m.id
     LEFT JOIN player_stats ps ON ps.match_id = m.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY m.id
     ORDER BY m.match_date DESC
     LIMIT $${params.length}`,
    params
  )

  return NextResponse.json({ data: matches })
}

export async function POST(req: NextRequest) {
  const body: CreateMatchInput & { team_id: string } = await req.json()

  const {
    team_id,
    opponent_name,
    match_date,
    map,
    match_type = 'scrim',
    team_score,
    opponent_score,
    attack_rounds_won = 0,
    attack_rounds_played = 0,
    defense_rounds_won = 0,
    defense_rounds_played = 0,
    video_url,
    notes,
  } = body

  if (!team_id || !opponent_name || !map || team_score == null || opponent_score == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const match = await queryOne(
    `INSERT INTO matches
       (team_id, opponent_name, match_date, map, match_type, team_score, opponent_score,
        attack_rounds_won, attack_rounds_played, defense_rounds_won, defense_rounds_played,
        video_url, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      team_id, opponent_name, match_date, map, match_type,
      team_score, opponent_score,
      attack_rounds_won, attack_rounds_played,
      defense_rounds_won, defense_rounds_played,
      video_url ?? null, notes ?? null,
    ]
  )

  return NextResponse.json({ data: match }, { status: 201 })
}
