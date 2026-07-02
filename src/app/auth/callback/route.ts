import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { query, queryOne } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const errorParam = searchParams.get('error')

  if (errorParam) {
    const desc = searchParams.get('error_description') ?? errorParam
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(desc)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  // リダイレクトレスポンスを先に作成し、Cookieをそこに直接セットする
  // next/headers の cookies() ではなく response.cookies を使うことで
  // リダイレクト後もセッションCookieが確実にブラウザに届く
  const redirectTo = `${origin}${next}`
  const response = NextResponse.redirect(redirectTo)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.error('[auth/callback] exchangeCodeForSession:', error?.message)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('認証リンクが無効または期限切れです')}`
    )
  }

  const user = data.session.user

  // チーム作成（新規登録時のみ）
  const { team_name, team_tag } = (user.user_metadata ?? {}) as {
    team_name?: string
    team_tag?: string
  }

  let redirectOverride: string | null = null

  if (team_name && team_tag) {
    try {
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
        // 新規ユーザー → 利用規約同意画面へ
        redirectOverride = `${origin}/consent`
      }
    } catch (e) {
      // チーム作成に失敗した場合は /setup に誘導。
      // response を使うことでセッションCookieを保持したままリダイレクト。
      console.error('[auth/callback] team creation failed, redirecting to /setup:', e)
      response.headers.set('Location', `${origin}/setup`)
      return response
    }
  } else if (!team_name || !team_tag) {
    // user_metadata にチーム情報がない場合も /setup で補完させる
    const existingTeam = await queryOne<{ team_id: string }>(
      'SELECT team_id FROM user_teams WHERE user_id = $1 LIMIT 1',
      [user.id]
    ).catch(() => null)
    if (!existingTeam) {
      response.headers.set('Location', `${origin}/setup`)
      return response
    }
  }

  // 新規ユーザーは /consent へ。
  // response には Supabase がセッションCookieを書き込み済みなので、
  // Location ヘッダーだけ差し替えることで Cookie options を完全保持する。
  if (redirectOverride) {
    response.headers.set('Location', redirectOverride)
    return response
  }

  return response
}
