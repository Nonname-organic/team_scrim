import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { guardWrite } from '@/lib/api-guard'

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const team = await queryOne(
    'SELECT id, name, tag, region FROM teams WHERE id = $1',
    [auth.teamId]
  )

  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  return NextResponse.json({ data: team })
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const limited = await guardWrite(auth, req, '/api/teams')
  if (limited) return limited

  const { name, tag, region } = await req.json()

  // 入力長検証（DB VARCHAR 制約: name(100)/tag(10)/region(20)）
  if (
    (name   !== undefined && String(name).length > 100) ||
    (tag    !== undefined && String(tag).length > 10) ||
    (region !== undefined && String(region).length > 20)
  ) {
    return NextResponse.json({ error: '入力値が長すぎます' }, { status: 400 })
  }

  const fields: string[] = []
  const values: unknown[] = []

  if (name !== undefined)   { fields.push(`name = $${values.push(name)}`) }
  if (tag !== undefined)    { fields.push(`tag = $${values.push(tag)}`) }
  if (region !== undefined) { fields.push(`region = $${values.push(region)}`) }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  values.push(auth.teamId)
  const team = await queryOne(
    `UPDATE teams SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  )
  return NextResponse.json({ data: team })
}
