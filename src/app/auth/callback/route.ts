/**
 * /auth/callback — Supabase Auth コールバックハンドラー
 *
 * 以下のすべての認証方式で共通使用:
 *   - メール確認リンク（新規登録）
 *   - Magic Link（OTP ログイン）
 *   - パスワードリセット
 *   - OAuth（Google/GitHub 等）
 *
 * フロー:
 *   1. Supabase がメール/OAuth リダイレクト先として /auth/callback?code=xxx を呼ぶ
 *   2. exchangeCodeForSession(code) でセッション確立
 *   3. 新規登録の場合: user_metadata からチーム情報を取得してチームを作成
 *   4. 指定先（next パラメータ or /）にリダイレクト
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const errorParam = searchParams.get('error')

  // Supabase がエラーをクエリパラメータで返す場合（例: リンク期限切れ）
  if (errorParam) {
    const desc = searchParams.get('error_description') ?? errorParam
    console.error('[auth/callback] Supabase error:', desc)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(desc)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const cookieStore = await cookies()

  // PKCE フロー: code_verifier はブラウザが Cookie に保存済み
  // createServerClient が Cookie を読み取り exchangeCodeForSession で使用する
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // ── セッション確立 ────────────────────────────────────────────────
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.error('[auth/callback] exchangeCodeForSession:', error?.message)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('認証リンクが無効または期限切れです')}`
    )
  }

  const user = data.session.user

  // ── チーム作成（新規登録時のみ）────────────────────────────────────
  // signUp 時に options.data で渡したメタデータをここで取得
  const { team_name, team_tag } = (user.user_metadata ?? {}) as {
    team_name?: string
    team_tag?: string
  }

  if (team_name && team_tag) {
    try {
      // 冪等性: すでにチームが存在する場合はスキップ（メールリンクの二重クリック対策）
      const existing = await queryOne<{ team_id: string }>(
        'SELECT team_id FROM user_teams WHERE user_id = $1 LIMIT 1',
        [user.id]
      )

      if (!existing) {
        const team = await queryOne<{ id: string }>(
          `INSERT INTO teams (name, tag) VALUES ($1, $2) RETURNING id`,
          [team_name, team_tag]
        )
        if (team) {
          await query(
            `INSERT INTO user_teams (user_id, team_id, role) VALUES ($1, $2, 'admin')`,
            [user.id, team.id]
          )
        }
      }
    } catch (e) {
      // チーム作成失敗はログに記録するが、セッションは確立済みなので続行
      console.error('[auth/callback] team creation failed:', e)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
