'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, KeyRound, Check, Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)
  const [hasSession, setHasSession] = useState(false)

  const inputCls = 'w-full bg-muted border border-border rounded-lg px-4 py-3 text-sm text-white focus:border-[#FF4655] outline-none'

  // /auth/callback でセッション確立済みか確認
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setHasSession(true)
      } else {
        // セッションなし = メールリンクを経由していない
        router.replace('/forgot-password')
      }
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('パスワードが一致しません'); return }
    if (password.length < 8)  { setError('パスワードは8文字以上にしてください'); return }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) { setError(error.message); setLoading(false); return }

    setDone(true)
    setTimeout(() => router.push('/'), 2000)
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#FF4655] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0F0F17]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FF4655]/10 border border-[#FF4655]/20 mb-4">
            <KeyRound className="w-6 h-6 text-[#FF4655]" />
          </div>
          <h1 className="text-2xl font-black text-white">パスワードを変更</h1>
          <p className="text-muted-foreground text-sm mt-1">新しいパスワードを入力してください</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          {done ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#00D4A0]/10 border border-[#00D4A0]/30 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-[#00D4A0]" />
              </div>
              <p className="text-white font-semibold">パスワードを変更しました</p>
              <p className="text-muted-foreground text-sm">ダッシュボードへ移動中...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-xs text-[#FF4655] bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">新しいパスワード</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required minLength={8}
                    placeholder="8文字以上"
                    autoComplete="new-password"
                    className={inputCls}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">パスワード（確認）</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="もう一度入力"
                  autoComplete="new-password"
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#FF4655] hover:bg-[#e03d4a] text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? '変更中...' : 'パスワードを変更する'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
