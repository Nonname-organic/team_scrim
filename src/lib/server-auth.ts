import { NextResponse } from 'next/server'
import { createClient } from './supabase/server'
import { queryOne } from './db'

export interface AuthContext {
  userId: string
  teamId: string
}

export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const row = await queryOne<{ team_id: string }>(
      'SELECT team_id FROM user_teams WHERE user_id = $1 LIMIT 1',
      [user.id]
    )
    if (!row?.team_id) return null

    return { userId: user.id, teamId: row.team_id }
  } catch {
    return null
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
}
