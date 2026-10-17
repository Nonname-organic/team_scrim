import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, withTransaction } from '@/lib/db'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { serverError, notFoundError } from '@/lib/api-error'
import { upsertRounds } from '@/lib/rounds-save'

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  try {
    const { match_id, rounds } = await req.json()
    if (!match_id || !rounds?.length) {
      return NextResponse.json({ error: 'match_id and rounds required' }, { status: 400 })
    }

    // Verify match belongs to team
    const matchCheck = await queryOne('SELECT id FROM matches WHERE id = $1 AND team_id = $2', [match_id, auth.teamId])
    if (!matchCheck) return notFoundError('試合が見つかりません')

    const tagRows = await query<{ id: string }>('SELECT id FROM loss_tags WHERE team_id = $1', [auth.teamId])
    await withTransaction(client => upsertRounds(client, match_id, rounds, new Set(tagRows.map(t => t.id))))

    return NextResponse.json({ message: 'Rounds saved', count: rounds.length })
  } catch (err) {
    return serverError('rounds POST', err)
  }
}
