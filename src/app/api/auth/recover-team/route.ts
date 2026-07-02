import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { query, queryOne } from '@/lib/db'
import { isRateLimited, rateLimitedResponse, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  // レート制限（同一ユーザーの多重試行抑止）
  if (await isRateLimited(RATE_LIMITS.apiHourly(user.id))) {
    return rateLimitedResponse()
  }

  // すでにチームがある場合はそのまま返す
  const existing = await queryOne<{ team_id: string }>(
    'SELECT team_id FROM user_teams WHERE user_id = $1 LIMIT 1',
    [user.id]
  )
  if (existing) {
    return NextResponse.json({ teamId: existing.team_id, recovered: false })
  }

  // user_metadata から登録時のチーム情報を読む
  const { team_name, team_tag } = (user.user_metadata ?? {}) as {
    team_name?: string
    team_tag?: string
  }

  // メタデータがない場合はリクエストボディにフォールバック
  let resolvedName = team_name
  let resolvedTag  = team_tag
  try {
    const body = await req.json().catch(() => ({}))
    if (!resolvedName) resolvedName = body.team_name
    if (!resolvedTag)  resolvedTag  = body.team_tag
  } catch {}

  if (!resolvedName || !resolvedTag) {
    return NextResponse.json(
      { error: 'チーム名とタグが見つかりません。再入力してください。', needsInput: true },
      { status: 422 }
    )
  }

  try {
    const team = await queryOne<{ id: string }>(
      `INSERT INTO teams (name, tag) VALUES ($1, $2) RETURNING id`,
      [resolvedName, resolvedTag]
    )
    if (!team) throw new Error('チーム作成失敗')

    await query(
      `INSERT INTO user_teams (user_id, team_id, role) VALUES ($1, $2, 'admin')`,
      [user.id, team.id]
    )

    return NextResponse.json({ teamId: team.id, recovered: true })
  } catch (e) {
    console.error('[recover-team]', e)
    return NextResponse.json({ error: 'チームの復元に失敗しました' }, { status: 500 })
  }
}
