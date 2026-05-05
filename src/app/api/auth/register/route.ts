import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { query, queryOne } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    // signUp直後はCookieが未送信のため、Authorizationヘッダーのトークンを優先して検証
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    let userId: string | null = null

    if (token) {
      // トークンを使ってユーザー情報を取得
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: { getAll: () => [], setAll: () => {} },
          global: { headers: { Authorization: `Bearer ${token}` } },
        }
      )
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    }

    if (!userId) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    // すでにチームがある場合はスキップ
    const existing = await queryOne<{ team_id: string }>(
      'SELECT team_id FROM user_teams WHERE user_id = $1 LIMIT 1',
      [userId]
    )
    if (existing) return NextResponse.json({ teamId: existing.team_id })

    const { team_name, team_tag } = await req.json()
    if (!team_name || !team_tag) {
      return NextResponse.json({ error: 'チーム名とタグは必須です' }, { status: 400 })
    }

    const team = await queryOne<{ id: string }>(
      `INSERT INTO teams (name, tag) VALUES ($1, $2) RETURNING id`,
      [team_name, team_tag]
    )
    if (!team) throw new Error('チーム作成失敗')

    await query(
      `INSERT INTO user_teams (user_id, team_id, role) VALUES ($1, $2, 'admin')`,
      [userId, team.id]
    )

    return NextResponse.json({ teamId: team.id }, { status: 201 })
  } catch (err) {
    console.error('[auth/register]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
