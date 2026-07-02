import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { guardWrite } from '@/lib/api-guard'
import { serverError, notFoundError } from '@/lib/api-error'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const limited = await guardWrite(auth, req, '/api/rounds/[id]')
  if (limited) return limited

  try {
    const { id } = await params

    // Verify round belongs to team via match
    const roundCheck = await queryOne(
      `SELECT r.id FROM rounds r
       JOIN matches m ON m.id = r.match_id
       WHERE r.id = $1 AND m.team_id = $2`,
      [id, auth.teamId]
    )
    if (!roundCheck) return notFoundError('ラウンドが見つかりません')

    const body = await req.json()
    const { plant_x, plant_y, plant_site, contact_timing, memo, vod_start_sec } = body

    const setClauses: string[] = []
    const vals: unknown[] = []

    if ('plant_x'        in body) { vals.push(plant_x ?? null);        setClauses.push(`plant_x = $${vals.length}`) }
    if ('plant_y'        in body) { vals.push(plant_y ?? null);        setClauses.push(`plant_y = $${vals.length}`) }
    if ('plant_site'     in body) { vals.push(plant_site ?? null);     setClauses.push(`plant_site = $${vals.length}`) }
    if ('contact_timing' in body) { vals.push(contact_timing ?? null); setClauses.push(`contact_timing = $${vals.length}`) }
    if ('memo'           in body) { vals.push(memo ?? null);           setClauses.push(`memo = $${vals.length}`) }
    if ('vod_start_sec'  in body) { vals.push(vod_start_sec ?? null);  setClauses.push(`vod_start_sec = $${vals.length}`) }

    if (setClauses.length === 0) return NextResponse.json({ ok: true })

    vals.push(id)
    await query(`UPDATE rounds SET ${setClauses.join(', ')} WHERE id = $${vals.length}`, vals)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError('rounds/[id] PATCH', err)
  }
}
