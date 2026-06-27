'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle } from 'lucide-react'

function LoginInner() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  // /auth/callback からのエラーパラメータ表示
  const callbackError = searchParams.get('error')

  const inputCls = 'w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-[#FF4655] outline-none transition-colors'

  const handleLogin = async (e: React.FormEvent) => {
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

      <form onSubmit={handleLogin} className="space-y-4">
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
            <Link href="/forgot-password" className="text-[10px] text-muted-foreground hover:text-white transition-colors">
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
