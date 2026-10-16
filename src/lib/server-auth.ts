import { NextResponse } from 'next/server'
import { createClient } from './supabase/server'
import { queryOne } from './db'

export interface AuthContext {
  userId: string
  teamId: string
}

// user_teams はほぼ不変のため lambda 内で短期キャッシュし、毎リクエストのDB往復を削減
// shortcut: チーム変更（recover-team 等）は最大60秒反映が遅れる。問題になったら書き込み時に無効化を追加
const teamCache = new Map<string, { teamId: string; at: number }>()
const TEAM_CACHE_TTL = 60_000

export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const cached = teamCache.get(user.id)
    if (cached && Date.now() - cached.at < TEAM_CACHE_TTL) {
      return { userId: user.id, teamId: cached.teamId }
    }

    const row = await queryOne<{ team_id: string }>(
      'SELECT team_id FROM user_teams WHERE user_id = $1 LIMIT 1',
      [user.id]
    )
    if (!row?.team_id) return null

    teamCache.set(user.id, { teamId: row.team_id, at: Date.now() })
    return { userId: user.id, teamId: row.team_id }
  } catch {
    return null
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
}
