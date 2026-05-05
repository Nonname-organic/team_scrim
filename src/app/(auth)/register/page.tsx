'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [teamName, setTeamName] = useState('')
  const [teamTag, setTeamTag]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const router = useRouter()

  const inputCls = 'w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-[#FF4655] outline-none transition-colors'

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // 1. Supabase Auth でユーザー作成
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'アカウントの作成に失敗しました')
      setLoading(false)
      return
    }

    // 2. チームを作成してユーザーに紐付け
    // signUp直後はCookieが未送信のため、access_tokenをヘッダーで渡す
    const accessToken = data.session?.access_token ?? ''
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ team_name: teamName, team_tag: teamTag }),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'チームの作成に失敗しました')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">チームを登録</h1>
        <p className="text-sm text-muted-foreground mt-1">新しいチームアカウントを作成</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="border border-border/50 rounded-xl p-4 space-y-3">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            アカウント情報
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">メールアドレス</label>
            <input
              type="email" required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="team@example.com"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">パスワード（8文字以上）</label>
            <input
              type="password" required minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>
        </div>

        <div className="border border-border/50 rounded-xl p-4 space-y-3">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            チーム情報
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">チーム名</label>
            <input
              type="text" required
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="Team Example"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">タグ（略称）</label>
            <input
              type="text" required maxLength={10}
              value={teamTag}
              onChange={e => setTeamTag(e.target.value)}
              placeholder="EX"
              className={inputCls}
            />
          </div>
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
          {loading ? '作成中...' : 'チームを作成してはじめる'}
        </button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        すでにアカウントをお持ちの方は{' '}
        <Link href="/login" className="text-[#FF4655] hover:underline font-medium">
          ログイン
        </Link>
      </div>
    </div>
  )
}
