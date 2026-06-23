import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { serverError, notFoundError } from '@/lib/api-error'

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  try {
    const { match_id, summary, strengths, weaknesses, action_items, style_tag } = await req.json()
    if (!match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 })

    // Verify match belongs to team
    const match = await queryOne<{ team_id: string }>(
      'SELECT team_id FROM matches WHERE id = $1 AND team_id = $2',
      [match_id, auth.teamId]
    )
    if (!match) return notFoundError('試合が見つかりません')

    const saved = await query<Record<string, unknown>>(
      `INSERT INTO feedbacks
         (match_id, team_id, type, summary, strengths, weaknesses, action_items, style_tag)
       VALUES ($1, $2, 'coach', $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        match_id,
        auth.teamId,
        summary || null,
        JSON.stringify(Array.isArray(strengths) ? strengths : []),
        JSON.stringify(Array.isArray(weaknesses) ? weaknesses : []),
        JSON.stringify(Array.isArray(action_items) ? action_items : []),
        style_tag || null,
      ]
    )

    return NextResponse.json({ data: saved[0] })
  } catch (err) {
    return serverError('feedback/coach POST', err)
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    // Verify feedback belongs to team
    const check = await queryOne(
      `SELECT f.id FROM feedbacks f
       JOIN matches m ON m.id = f.match_id
       WHERE f.id = $1 AND f.type = 'coach' AND m.team_id = $2`,
      [id, auth.teamId]
    )
    if (!check) return notFoundError('フィードバックが見つかりません')

    await query('DELETE FROM feedbacks WHERE id = $1', [id])
    return NextResponse.json({ message: 'deleted' })
  } catch (err) {
    return serverError('feedback/coach DELETE', err)
  }
}
