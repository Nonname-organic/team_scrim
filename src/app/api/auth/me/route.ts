import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queryOne } from '@/lib/db'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await queryOne<{ team_id: string; tos_agreed_at: string | null }>(
    'SELECT team_id, tos_agreed_at FROM user_teams WHERE user_id = $1 LIMIT 1',
    [user.id]
  ).catch(() => null)

  if (!row?.team_id) {
    // ログイン済みだがチーム未所属 → リカバリーが必要
    return NextResponse.json({ error: 'NoTeam', userId: user.id }, { status: 403 })
  }

  if (!row.tos_agreed_at) {
    // チームはあるが利用規約未同意
    return NextResponse.json({ error: 'NeedsConsent', userId: user.id, teamId: row.team_id }, { status: 403 })
  }

  return NextResponse.json({ userId: user.id, teamId: row.team_id })
}
