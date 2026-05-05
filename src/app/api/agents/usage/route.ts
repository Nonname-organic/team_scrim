import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const rows = await query(
    `SELECT ps.agent, COUNT(*)::int AS count
     FROM player_stats ps
     JOIN players p ON p.id = ps.player_id
     WHERE p.team_id = $1 AND ps.agent IS NOT NULL AND ps.agent != ''
     GROUP BY ps.agent
     ORDER BY count DESC`,
    [auth.teamId]
  )

  return NextResponse.json({ data: rows })
}
