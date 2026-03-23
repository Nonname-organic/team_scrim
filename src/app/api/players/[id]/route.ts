import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { ign, real_name, role, active } = await req.json()

  const fields: string[] = []
  const values: unknown[] = []

  if (ign !== undefined)       { fields.push(`ign = $${values.push(ign)}`) }
  if (real_name !== undefined) { fields.push(`real_name = $${values.push(real_name)}`) }
  if (role !== undefined)      { fields.push(`role = $${values.push(role)}`) }
  if (active !== undefined)    { fields.push(`active = $${values.push(active)}`) }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  values.push(id)
  const player = await queryOne(
    `UPDATE players SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  )
  return NextResponse.json({ data: player })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await queryOne('DELETE FROM players WHERE id = $1 RETURNING id', [id])
  return NextResponse.json({ message: 'Deleted' })
}
