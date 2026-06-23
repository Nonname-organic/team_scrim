import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { serverError } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const matchId = req.nextUrl.searchParams.get('matchId')
  if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 })

  try {
    // Verify match belongs to team
    const matchCheck = await queryOne('SELECT id FROM matches WHERE id = $1 AND team_id = $2', [matchId, auth.teamId])
    if (!matchCheck) return NextResponse.json({ data: [] })

    const feedbacks = await query<Record<string, unknown>>(
      `SELECT * FROM feedbacks WHERE match_id = $1 ORDER BY created_at DESC`,
      [matchId]
    )
    return NextResponse.json({ data: feedbacks })
  } catch (err) {
    return serverError('feedback GET', err)
  }
}
