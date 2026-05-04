import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { match_id, summary, strengths, weaknesses, action_items, style_tag } = await req.json()
    if (!match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 })

    const match = await queryOne<{ team_id: string }>(
      'SELECT team_id FROM matches WHERE id = $1',
      [match_id]
    )
    if (!match) return NextResponse.json({ error: '試合が見つかりません' }, { status: 404 })

    const saved = await query<Record<string, unknown>>(
      `INSERT INTO feedbacks
         (match_id, team_id, type, summary, strengths, weaknesses, action_items, style_tag)
       VALUES ($1, $2, 'coach', $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        match_id,
        match.team_id,
        summary || null,
        JSON.stringify(Array.isArray(strengths) ? strengths : []),
        JSON.stringify(Array.isArray(weaknesses) ? weaknesses : []),
        JSON.stringify(Array.isArray(action_items) ? action_items : []),
        style_tag || null,
      ]
    )

    return NextResponse.json({ data: saved[0] })
  } catch (err) {
    console.error('[feedback/coach POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    await query('DELETE FROM feedbacks WHERE id = $1 AND type = $2', [id, 'coach'])
    return NextResponse.json({ message: 'deleted' })
  } catch (err) {
    console.error('[feedback/coach DELETE]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
