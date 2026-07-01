'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCallbackUrl } from '@/lib/auth'
import { Loader2, Mail, RefreshCcw } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [teamName, setTeamName] = useState('')
  const [teamTag, setTeamTag]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent]     = useState(false)

  const inputCls = 'w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-[#FF4655] outline-none transition-colors'

  // ── 新規登録 ────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { team_name: teamName, team_tag: teamTag },
        emailRedirectTo: getCallbackUrl(),
      },
    })

    if (signUpError) {
      if (signUpError.message === 'User already registered') {
        // メール確認済みのアカウントが存在 → ログイン or パスワードリセットへ誘導
        setError('このメールアドレスは既に登録済みです。ログインするか、パスワードリセットをお試しください。')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    // identities が空配列 → メール未確認のアカウントが既に存在するケース
    // signUp でメタデータ（team_name/team_tag）は更新されるが、
    // 確認メールが届かない場合があるため明示的に resend する
    if ((signUpData.user?.identities?.length ?? 1) === 0) {
      await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: getCallbackUrl() },
      })
    }

    setEmailSent(true)
    setLoading(false)
  }

  // ── 確認メール再送 ───────────────────────────────────────────────
  const handleResend = async () => {
    if (!email || resending) return
    setResending(true)
    setResent(false)
    const supabase = createClient()
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: getCallbackUrl() },
    })
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 5000)
  }

  // ── メール送信済み画面 ───────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[#FF4655]/10 border border-[#FF4655]/20 flex items-center justify-center">
            <Mail className="w-8 h-8 text-[#FF4655]" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">確認メールを送信しました</h2>
          <p className="text-sm text-muted-foreground">
            <span className="text-white font-medium">{email}</span>{' '}
            に確認メールを送りました。
          </p>
          <p className="text-sm text-muted-foreground">
            メール内のリンクをクリックして登録を完了してください。
          </p>
        </div>

        <div className="bg-muted/20 border border-border rounded-xl px-4 py-3 text-left space-y-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">確認できない場合</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>迷惑メールフォルダを確認してください</li>
            <li>数分待ってから再送信してください</li>
            <li>メールアドレスが正しいか確認してください</li>
          </ul>
        </div>

        <div className="space-y-3">
          {resent && (
            <p className="text-xs text-[#00D4A0]">メールを再送信しました</p>
          )}
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-2 mx-auto text-xs text-muted-foreground hover:text-white transition-colors disabled:opacity-50"
          >
            {resending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <RefreshCcw className="w-3 h-3" />}
            確認メールを再送信
          </button>
        </div>

        <Link href="/login" className="block text-sm text-muted-foreground hover:text-white transition-colors">
          ← ログインに戻る
        </Link>
      </div>
    )
  }

  // ── 登録フォーム ────────────────────────────────────────────────
  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">チームを登録</h1>
        <p className="text-sm text-muted-foreground mt-1">新しいチームアカウントを作成</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {/* アカウント情報 */}
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
              autoComplete="email"
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
              autoComplete="new-password"
              className={inputCls}
            />
          </div>
        </div>

        {/* チーム情報 */}
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
              autoComplete="organization"
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
          <div className="bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg px-3 py-2.5 space-y-1.5">
            <p className="text-xs text-[#FF4655]">{error}</p>
            {error.includes('登録済み') && (
              <div className="flex gap-3 text-xs">
                <Link href="/login" className="text-[#FF4655] underline font-medium">
                  ログインする →
                </Link>
                <Link href="/forgot-password" className="text-muted-foreground hover:text-white underline">
                  パスワードをリセット
                </Link>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#FF4655] hover:bg-[#FF4655]/80 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? '送信中...' : 'チームを作成してはじめる'}
        </button>

        <p className="text-center text-[10px] text-muted-foreground/60 leading-relaxed">
          登録後、確認メールを送信します。メール内のリンクをクリックすると登録が完了します。
        </p>
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
