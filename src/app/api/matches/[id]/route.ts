import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const matchId = params.id

  const [match, rounds, playerStats, events, teamStats] = await Promise.all([
    queryOne('SELECT * FROM matches WHERE id = $1', [matchId]),
    query(
      'SELECT * FROM rounds WHERE match_id = $1 ORDER BY round_number',
      [matchId]
    ),
    query(
      `SELECT ps.*, p.ign, p.role FROM player_stats ps
       JOIN players p ON p.id = ps.player_id
       WHERE ps.match_id = $1
       ORDER BY ps.acs DESC`,
      [matchId]
    ),
    query(
      `SELECT e.*,
              pk.ign AS killer_ign,
              pv.ign AS victim_ign,
              pa.ign AS assister_ign
       FROM events e
       LEFT JOIN players pk ON pk.id = e.killer_player_id
       LEFT JOIN players pv ON pv.id = e.victim_player_id
       LEFT JOIN players pa ON pa.id = e.assister_player_id
       WHERE e.match_id = $1
       ORDER BY e.round_number, e.timestamp_sec`,
      [matchId]
    ),
    queryOne(
      'SELECT * FROM team_stats WHERE match_id = $1',
      [matchId]
    ),
  ])

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  return NextResponse.json({
    data: {
      match,
      rounds,
      player_stats: playerStats,
      events,
      team_stats: teamStats,
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const matchId = params.id
  const body = await req.json()
  const fields: string[] = []
  const values: unknown[] = []

  if ('video_url' in body) { fields.push(`video_url = $${values.push(body.video_url)}`) }
  if ('notes' in body)     { fields.push(`notes = $${values.push(body.notes)}`) }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  values.push(matchId)
  const match = await queryOne(
    `UPDATE matches SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  )
  return NextResponse.json({ data: match })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const matchId = params.id
  await queryOne('DELETE FROM matches WHERE id = $1 RETURNING id', [matchId])
  return NextResponse.json({ message: 'Deleted' })
}
