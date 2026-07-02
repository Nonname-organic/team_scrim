import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queryOne } from '@/lib/db'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await queryOne<{ team_id: string }>(
    'SELECT team_id FROM user_teams WHERE user_id = $1 LIMIT 1',
    [user.id]
  ).catch(() => null)

  if (!row?.team_id) {
    return NextResponse.json({ error: 'NoTeam', userId: user.id }, { status: 403 })
  }

  // 最新バージョンへの未同意ポリシーをチェック
  try {
    const unconsented = await queryOne<{ policy_type: string }>(
      `SELECT pv.policy_type
       FROM (
         SELECT DISTINCT ON (policy_type)
           policy_type, version, effective_date
         FROM policy_versions
         WHERE published = true
         ORDER BY policy_type, effective_date DESC, created_at DESC
       ) pv
       WHERE NOT EXISTS (
         SELECT 1 FROM user_consents uc
         WHERE uc.user_id = $1
           AND uc.policy_type = pv.policy_type
           AND uc.version = pv.version
       )
       LIMIT 1`,
      [user.id]
    )

    if (unconsented) {
      return NextResponse.json({ error: 'NeedsConsent', userId: user.id, teamId: row.team_id }, { status: 403 })
    }
  } catch {
    // policy_versions テーブルが未作成等のDB障害は同意済みとして扱う
  }

  return NextResponse.json({ userId: user.id, teamId: row.team_id })
}
