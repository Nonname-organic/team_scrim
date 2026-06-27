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

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = path.startsWith('/login') ||
                     path.startsWith('/register') ||
                     path.startsWith('/reset-password') ||
                     path.startsWith('/forgot-password') ||
                     path.startsWith('/auth/') ||
                     path.startsWith('/terms') ||
                     path.startsWith('/privacy') ||
                     path === '/maintenance'

  // 未ログイン → /login へリダイレクト
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ログイン済みで認証ページ → / へリダイレクト
  if (user && isAuthPage && path !== '/maintenance') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
