import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id')

  if (!teamId) {
    return NextResponse.json({ error: 'team_id required' }, { status: 400 })
  }

  const team = await queryOne(
    'SELECT id, name, tag, region FROM teams WHERE id = $1',
    [teamId]
  )

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  return NextResponse.json({ data: team })
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id')

  if (!teamId) {
    return NextResponse.json({ error: 'team_id required' }, { status: 400 })
  }

  const { name, tag, region } = await req.json()

  const fields: string[] = []
  const values: unknown[] = []

  if (name !== undefined)   { fields.push(`name = $${values.push(name)}`) }
  if (tag !== undefined)    { fields.push(`tag = $${values.push(tag)}`) }
  if (region !== undefined) { fields.push(`region = $${values.push(region)}`) }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  values.push(teamId)
  const team = await queryOne(
    `UPDATE teams SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  )
  return NextResponse.json({ data: team })
}
