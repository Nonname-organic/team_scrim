'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCallbackUrl } from '@/lib/auth'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const inputCls = 'w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-[#FF4655] outline-none transition-colors'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // パスワードリセット後は /reset-password に遷移させる
    const redirectTo = `${getCallbackUrl()}?next=/reset-password`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[#FF4655]/10 border border-[#FF4655]/20 flex items-center justify-center">
            <Mail className="w-8 h-8 text-[#FF4655]" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">メールを送信しました</h2>
          <p className="text-sm text-muted-foreground">
            <span className="text-white font-medium">{email}</span> にパスワード再設定用のリンクを送りました。
          </p>
          <p className="text-sm text-muted-foreground">
            メール内のリンクをクリックして新しいパスワードを設定してください。
          </p>
        </div>
        <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> ログインに戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">パスワードを再設定</h1>
        <p className="text-sm text-muted-foreground mt-1">登録済みのメールアドレスを入力してください</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          {loading ? '送信中...' : '再設定メールを送信'}
        </button>
      </form>

      <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> ログインに戻る
      </Link>
    </div>
  )
}
