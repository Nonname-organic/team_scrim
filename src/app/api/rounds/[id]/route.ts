import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { plant_x, plant_y, plant_site } = await req.json()
    await query(
      `UPDATE rounds
         SET plant_x = $1,
             plant_y = $2,
             plant_site = COALESCE($3, plant_site)
       WHERE id = $4`,
      [
        plant_x ?? null,
        plant_y ?? null,
        plant_site ?? null,
        id,
      ]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[rounds PATCH]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
