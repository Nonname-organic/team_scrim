import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/agents/usage?team_id=xxx
// チームの選手が使用したエージェントの回数を返す
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id')
  if (!teamId) return NextResponse.json({ error: 'team_id required' }, { status: 400 })

  const rows = await query(
    `SELECT ps.agent, COUNT(*)::int AS count
     FROM player_stats ps
     JOIN players p ON p.id = ps.player_id
     WHERE p.team_id = $1 AND ps.agent IS NOT NULL AND ps.agent != ''
     GROUP BY ps.agent
     ORDER BY count DESC`,
    [teamId]
  )

  return NextResponse.json({ data: rows })
}
