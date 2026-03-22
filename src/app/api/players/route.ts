import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id')
  const activeOnly = searchParams.get('active') !== 'false'

  if (!teamId) {
    return NextResponse.json({ error: 'team_id required' }, { status: 400 })
  }

  const players = await query(
    `SELECT p.*, vcs.*
     FROM players p
     LEFT JOIN v_player_career_stats vcs ON vcs.player_id = p.id
     WHERE p.team_id = $1 ${activeOnly ? 'AND p.active = TRUE' : ''}
     ORDER BY vcs.avg_acs DESC NULLS LAST`,
    [teamId]
  )

  return NextResponse.json({ data: players })
}

export async function POST(req: NextRequest) {
  const { team_id, ign, real_name, role, agent_pool } = await req.json()

  if (!team_id || !ign || !role) {
    return NextResponse.json({ error: 'team_id, ign, role required' }, { status: 400 })
  }

  const player = await queryOne(
    `INSERT INTO players (team_id, ign, real_name, role, agent_pool)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [team_id, ign, real_name ?? null, role, agent_pool ?? []]
  )

  return NextResponse.json({ data: player }, { status: 201 })
}
