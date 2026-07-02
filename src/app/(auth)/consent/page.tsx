'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle, ShieldCheck, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const POLICY_LABELS: Record<string, string> = {
  terms:       '利用規約',
  data_policy: 'データ利用ポリシー',
  privacy:     'プライバシーポリシー',
  security:    'セキュリティポリシー',
}

const POLICY_URLS: Record<string, string> = {
  terms:       '/terms',
  data_policy: '/data-policy',
  privacy:     '/privacy',
  security:    '/security',
}

type UnconsentedItem = { policy_type: string; version: string; title: string }

export default function ConsentPage() {
  const router = useRouter()
  const [unconsented, setUnconsented] = useState<UnconsentedItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [agreed, setAgreed]           = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState(false)

  useEffect(() => {
    fetch('/api/consent/check')
      .then(r => r.json())
      .then(data => {
        if (!data.needs_consent) {
          // 同意済みならダッシュボードへ
          router.replace('/')
          return
        }
        setUnconsented(data.unconsented ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  const handleConsent = async () => {
    if (!agreed || submitting || unconsented.length === 0) return
    setSubmitting(true)
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consents: unconsented.map(p => ({
            policy_type: p.policy_type,
            version: p.version,
          })),
        }),
      })
      setDone(true)
      setTimeout(() => router.replace('/'), 1200)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#FF4655] animate-spin" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
        <CheckCircle className="w-10 h-10 text-[#00D4A0] mx-auto" />
        <p className="text-sm font-semibold text-[#00D4A0]">同意しました。ダッシュボードへ移動します</p>
      </div>
    )
  }

  const isFirstConsent = unconsented.length >= 4
  const title = isFirstConsent ? '利用規約・各ポリシーへの同意' : 'ポリシー改定のお知らせ'
  const subtitle = isFirstConsent
    ? 'サービスを開始する前に以下のドキュメントをご確認ください'
    : '規程が改定されました。ご確認のうえ同意してください'

  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-[#FF4655]/10 border border-[#FF4655]/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#FF4655]" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* 同意対象ポリシー一覧 */}
      <div className="space-y-2">
        {unconsented.map(p => (
          <div key={p.policy_type}
            className="flex items-center justify-between bg-muted/20 border border-border rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">
                {POLICY_LABELS[p.policy_type] ?? p.policy_type}
              </p>
              <p className="text-xs text-muted-foreground">v{p.version}</p>
            </div>
            <Link
              href={POLICY_URLS[p.policy_type] ?? '#'}
              target="_blank"
              className="flex items-center gap-1 text-xs text-[#FF4655] hover:underline"
            >
              読む
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#FF4655] cursor-pointer"
        />
        <span className="text-sm text-muted-foreground group-hover:text-white transition-colors">
          上記すべてのドキュメントを読み、内容に同意します
        </span>
      </label>

      <button
        onClick={handleConsent}
        disabled={!agreed || submitting}
        className="w-full bg-[#FF4655] hover:bg-[#FF4655]/80 disabled:opacity-40 text-white font-semibold rounded-lg py-3 text-sm transition-colors flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? '処理中...' : '同意してはじめる'}
      </button>

      {/* 拒否時はログアウト */}
      <p className="text-center text-xs text-muted-foreground/60">
        同意しない場合は{' '}
        <button
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut().catch(() => {})
            router.replace('/login')
          }}
          className="text-muted-foreground hover:text-white underline"
        >
          ログアウト
        </button>
        してください
      </p>
    </div>
  )
}
