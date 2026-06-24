'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCallbackUrl } from '@/lib/auth'
import { Loader2, Mail, KeyRound, AlertCircle } from 'lucide-react'

type LoginMode = 'password' | 'magic'

function LoginInner() {
  const [mode, setMode]         = useState<LoginMode>('password')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  // /auth/callback からのエラーパラメータ表示
  const callbackError = searchParams.get('error')

  const inputCls = 'w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-[#FF4655] outline-none transition-colors'

  // ── パスワードログイン ───────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    const meRes = await fetch('/api/auth/me')
    if (!meRes.ok) {
      await supabase.auth.signOut()
      setError('このアカウントにはチームが登録されていません')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  // ── Magic Link（OTP）ログイン ────────────────────────────────────
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // 同じ /auth/callback を共用
        emailRedirectTo: getCallbackUrl(),
        // 新規ユーザーの作成を禁止（既存ユーザーのみ Magic Link を許可）
        shouldCreateUser: false,
      },
    })

    if (otpError) {
      setError(otpError.message)
      setLoading(false)
      return
    }

    setMagicSent(true)
    setLoading(false)
  }

  // ── OAuth ログイン（拡張用スタブ）──────────────────────────────
  // const handleOAuth = async (provider: OAuthProvider) => {
  //   const supabase = createClient()
  //   await supabase.auth.signInWithOAuth({
  //     provider,
  //     options: { redirectTo: getCallbackUrl() },
  //   })
  // }

  // Magic Link 送信済み画面
  if (magicSent) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[#FF4655]/10 border border-[#FF4655]/20 flex items-center justify-center">
            <Mail className="w-8 h-8 text-[#FF4655]" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">ログインリンクを送信しました</h2>
          <p className="text-sm text-muted-foreground">
            <span className="text-white font-medium">{email}</span> にログインリンクを送りました。
          </p>
          <p className="text-sm text-muted-foreground">
            メール内のリンクをクリックしてログインを完了してください。
          </p>
        </div>
        <button
          onClick={() => { setMagicSent(false); setMode('password') }}
          className="text-sm text-muted-foreground hover:text-white transition-colors"
        >
          ← パスワードでログインに戻る
        </button>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">ログイン</h1>
        <p className="text-sm text-muted-foreground mt-1">チームアカウントでサインイン</p>
      </div>

      {/* callback エラー表示 */}
      {callbackError && (
        <div className="flex items-start gap-2 bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 text-[#FF4655] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#FF4655]">{callbackError}</p>
        </div>
      )}

      {/* モード切替タブ */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => { setMode('password'); setError(null) }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
            mode === 'password'
              ? 'bg-[#FF4655]/10 text-[#FF4655]'
              : 'text-muted-foreground hover:text-white'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          パスワード
        </button>
        <button
          type="button"
          onClick={() => { setMode('magic'); setError(null) }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors border-l border-border ${
            mode === 'magic'
              ? 'bg-[#FF4655]/10 text-[#FF4655]'
              : 'text-muted-foreground hover:text-white'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          メールリンク
        </button>
      </div>

      {/* パスワードログインフォーム */}
      {mode === 'password' && (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">メールアドレス</label>
            <input
              type="email" required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="team@example.com"
              autoComplete="email"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">パスワード</label>
              <Link href="/reset-password" className="text-[10px] text-muted-foreground hover:text-white transition-colors">
                パスワードを忘れた場合
              </Link>
            </div>
            <input
              type="password" required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className={inputCls}
            />
          </div>

          {error && (
            <div className="text-xs text-[#FF4655] bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF4655] hover:bg-[#FF4655]/80 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      )}

      {/* Magic Link フォーム */}
      {mode === 'magic' && (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">メールアドレス</label>
            <input
              type="email" required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="team@example.com"
              autoComplete="email"
              className={inputCls}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            入力したメールアドレスにログインリンクを送信します。パスワード不要でログインできます。
          </p>

          {error && (
            <div className="text-xs text-[#FF4655] bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF4655] hover:bg-[#FF4655]/80 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? '送信中...' : 'ログインリンクを送信'}
          </button>
        </form>
      )}

      <div className="text-center text-sm text-muted-foreground">
        アカウントをお持ちでない方は{' '}
        <Link href="/register" className="text-[#FF4655] hover:underline font-medium">
          チームを登録
        </Link>
      </div>

      <div className="text-center text-[10px] text-muted-foreground/50 space-x-3">
        <Link href="/terms"   className="hover:text-muted-foreground transition-colors">利用規約</Link>
        <Link href="/privacy" className="hover:text-muted-foreground transition-colors">プライバシーポリシー</Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}
