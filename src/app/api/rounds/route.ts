import { NextRequest, NextResponse } from 'next/server'
import { queryOne, withTransaction } from '@/lib/db'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { guardWrite } from '@/lib/api-guard'
import { serverError, notFoundError } from '@/lib/api-error'

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const limited = await guardWrite(auth, req, '/api/rounds')
  if (limited) return limited

  try {
    const { match_id, rounds } = await req.json()
    if (!match_id || !rounds?.length) {
      return NextResponse.json({ error: 'match_id and rounds required' }, { status: 400 })
    }

    // Verify match belongs to team
    const matchCheck = await queryOne('SELECT id FROM matches WHERE id = $1 AND team_id = $2', [match_id, auth.teamId])
    if (!matchCheck) return notFoundError('試合が見つかりません')

    await withTransaction(async (client) => {
      await client.query('DELETE FROM rounds WHERE match_id = $1', [match_id])

      for (const r of rounds) {
        await client.query(
          `INSERT INTO rounds
             (match_id, round_number, side, result, economy_type,
              planted, plant_site, plant_x, plant_y, first_blood_team, contact_timing, notable, memo)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            match_id,
            r.round_number,
            r.side || null,
            r.result || null,
            r.economy || null,
            r.plant ?? false,
            r.site || null,
            r.plant_x ?? null,
            r.plant_y ?? null,
            r.fb_team === '' ? null : r.fb_team,
            r.contact_timing || null,
            r.notable ?? false,
            r.memo || null,
          ]
        )
      }
    })

    return NextResponse.json({ message: 'Rounds saved', count: rounds.length })
  } catch (err) {
    return serverError('rounds POST', err)
  }
}
