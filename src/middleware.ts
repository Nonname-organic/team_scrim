import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // ── メンテナンスモード ──────────────────────────────────────
  // MAINTENANCE_MODE=true の場合、/maintenance と /api/health 以外をブロック
  if (MAINTENANCE_MODE && path !== '/maintenance' && !path.startsWith('/api/health')) {
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'メンテナンス中です。しばらくしてからお試しください。' },
        { status: 503, headers: { 'Retry-After': '300' } }
      )
    }
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // 壊れたリフレッシュトークンの検知:
  // auth クッキーが存在する状態で 400 が返る = 無効なトークン → クリアしてログインへ
  // auth クッキーがない場合は通常の未ログイン状態として扱う（エラーページ不要）
  if (authError?.status === 400) {
    const hasBrokenCookie = request.cookies.getAll().some(
      c => c.name.startsWith('sb-') && c.name.includes('auth-token')
    )
    if (hasBrokenCookie) {
      const redirect = NextResponse.redirect(new URL('/login', request.url))
      request.cookies.getAll().forEach(cookie => {
        if (cookie.name.startsWith('sb-')) redirect.cookies.delete(cookie.name)
      })
      return redirect
    }
  }

  const isAuthPage = path.startsWith('/login') ||
                     path.startsWith('/register') ||
                     path.startsWith('/reset-password') ||
                     path.startsWith('/forgot-password') ||
                     path.startsWith('/auth/') ||
                     path.startsWith('/terms') ||
                     path.startsWith('/privacy') ||
                     path === '/maintenance'

  // /setup（チーム未所属リカバリー）と /consent（規約同意）は
  // ログイン必須だが「認証ページ」ではない特別扱いページ。
  // isAuthPage に含めない → ログイン済みでも訪問できる（/へ強制遷移しない）。
  // 未ログインの場合は後段のチェックで /login へ飛ばす。
  const isSetupPage = path.startsWith('/setup') || path.startsWith('/consent')

  // 未ログイン → /login へリダイレクト（/setup も未ログインなら /login へ）
  if (!user && !isAuthPage && !isSetupPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (!user && isSetupPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ログイン済みで認証ページ → / へリダイレクト
  // ※ パスワードリセット中はセッションが存在するため除外
  // ※ /setup はログイン済みでもアクセス可（チーム未所属リカバリー用）
  const isPasswordFlow = path.startsWith('/reset-password') || path.startsWith('/forgot-password')
  if (user && isAuthPage && !isPasswordFlow && path !== '/maintenance') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ── セッション/端末セキュリティ（PR-8） ──
  // 認証済みユーザーに返す保護ページは機微データ（チーム分析）を含むため、
  // ブラウザ / プロキシ / BFCache にキャッシュさせない。
  // 共有端末で「戻る」ボタン後にデータが残留するのを防ぐ。
  if (user) {
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
