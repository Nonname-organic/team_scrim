import { NextRequest, NextResponse } from 'next/server'
import { withTransaction } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { match_id, rounds } = await req.json()
    if (!match_id || !rounds?.length) {
      return NextResponse.json({ error: 'match_id and rounds required' }, { status: 400 })
    }

    await withTransaction(async (client) => {
      // Delete existing rounds for this match first
      await client.query('DELETE FROM rounds WHERE match_id = $1', [match_id])

      for (const r of rounds) {
        await client.query(
          `INSERT INTO rounds
             (match_id, round_number, side, result, economy_type,
              planted, plant_site, plant_x, plant_y, first_blood_team)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
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
          ]
        )
      }
    })

    return NextResponse.json({ message: 'Rounds saved', count: rounds.length })
  } catch (err) {
    console.error('[rounds POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
