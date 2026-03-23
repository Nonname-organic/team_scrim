import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { plant_x, plant_y, plant_site, contact_timing } = body

    const setClauses: string[] = []
    const vals: unknown[] = []

    if ('plant_x' in body)       { vals.push(plant_x ?? null);    setClauses.push(`plant_x = $${vals.length}`) }
    if ('plant_y' in body)       { vals.push(plant_y ?? null);    setClauses.push(`plant_y = $${vals.length}`) }
    if ('plant_site' in body)    { vals.push(plant_site ?? null); setClauses.push(`plant_site = COALESCE($${vals.length}, plant_site)`) }
    if ('contact_timing' in body){ vals.push(contact_timing ?? null); setClauses.push(`contact_timing = $${vals.length}`) }

    if (setClauses.length === 0) return NextResponse.json({ ok: true })

    vals.push(id)
    await query(`UPDATE rounds SET ${setClauses.join(', ')} WHERE id = $${vals.length}`, vals)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[rounds PATCH]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
