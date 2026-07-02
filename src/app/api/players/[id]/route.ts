import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { guardWrite } from '@/lib/api-guard'
import { serverError, notFoundError } from '@/lib/api-error'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const limited = await guardWrite(auth, req, '/api/players/[id]')
  if (limited) return limited

  try {
    const { id } = await params
    const { ign, real_name, role, active } = await req.json()

    const fields: string[] = []
    const values: unknown[] = []

    if (ign !== undefined)       { fields.push(`ign = $${values.push(ign)}`) }
    if (real_name !== undefined) { fields.push(`real_name = $${values.push(real_name)}`) }
    if (role !== undefined)      { fields.push(`role = $${values.push(role)}`) }
    if (active !== undefined)    { fields.push(`active = $${values.push(active)}`) }

    if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

    values.push(id)
    values.push(auth.teamId)
    const player = await queryOne(
      `UPDATE players SET ${fields.join(', ')} WHERE id = $${values.length - 1} AND team_id = $${values.length} RETURNING *`,
      values
    )
    if (!player) return notFoundError('選手が見つかりません')
    return NextResponse.json({ data: player })
  } catch (err) {
    return serverError('players/[id] PATCH', err)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const limited = await guardWrite(auth, req, '/api/players/[id]')
  if (limited) return limited

  try {
    const { id } = await params
    const deleted = await queryOne(
      'DELETE FROM players WHERE id = $1 AND team_id = $2 RETURNING id',
      [id, auth.teamId]
    )
    if (!deleted) return notFoundError('選手が見つかりません')
    return NextResponse.json({ message: 'Deleted' })
  } catch (err) {
    return serverError('players/[id] DELETE', err)
  }
}
