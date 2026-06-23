import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { serverError, notFoundError } from '@/lib/api-error'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const { id: matchId } = await params

  const [match, rounds, playerStats, events, teamStats] = await Promise.all([
    queryOne('SELECT * FROM matches WHERE id = $1 AND team_id = $2', [matchId, auth.teamId]),
    query('SELECT * FROM rounds WHERE match_id = $1 ORDER BY round_number', [matchId]),
    query(
      `SELECT ps.*, p.ign, p.role FROM player_stats ps
       JOIN players p ON p.id = ps.player_id
       WHERE ps.match_id = $1 ORDER BY ps.acs DESC`,
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
    queryOne('SELECT * FROM team_stats WHERE match_id = $1', [matchId]),
  ])

  if (!match) return notFoundError('試合が見つかりません')

  return NextResponse.json({ data: { match, rounds, player_stats: playerStats, events, team_stats: teamStats } })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  try {
    const { id: matchId } = await params
    const body = await req.json()
    const fields: string[] = []
    const values: unknown[] = []

    if ('video_url'  in body) { fields.push(`video_url = $${values.push(body.video_url)}`) }
    if ('notes'      in body) { fields.push(`notes = $${values.push(body.notes)}`) }
    if ('match_date' in body) { fields.push(`match_date = $${values.push(body.match_date)}`) }

    if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

    values.push(matchId)
    values.push(auth.teamId)
    const match = await queryOne(
      `UPDATE matches SET ${fields.join(', ')} WHERE id = $${values.length - 1} AND team_id = $${values.length} RETURNING *`,
      values
    )
    if (!match) return notFoundError('試合が見つかりません')
    return NextResponse.json({ data: match })
  } catch (err) {
    return serverError('matches/[id] PATCH', err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  try {
    const { id: matchId } = await params
    const deleted = await queryOne(
      'DELETE FROM matches WHERE id = $1 AND team_id = $2 RETURNING id',
      [matchId, auth.teamId]
    )
    if (!deleted) return notFoundError('試合が見つかりません')
    return NextResponse.json({ message: 'Deleted' })
  } catch (err) {
    return serverError('matches/[id] DELETE', err)
  }
}
