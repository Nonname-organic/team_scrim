import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('matchId')
  if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 })

  try {
    const feedbacks = await query<Record<string, unknown>>(
      `SELECT * FROM feedbacks WHERE match_id = $1 ORDER BY created_at DESC`,
      [matchId]
    )
    return NextResponse.json({ data: feedbacks })
  } catch (err) {
    console.error('[feedback GET]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
