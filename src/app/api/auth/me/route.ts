import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/server-auth'

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ userId: auth.userId, teamId: auth.teamId })
}
