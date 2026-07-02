'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle, ShieldCheck } from 'lucide-react'

export default function ConsentPage() {
  const router = useRouter()
  const [agreed, setAgreed]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  // 同意済みなら即ダッシュボードへ
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.teamId && !data.error) router.replace('/')
      })
      .catch(() => {})
  }, [router])

  const handleConsent = async () => {
    if (!agreed || loading) return
    setLoading(true)
    await fetch('/api/auth/consent', { method: 'POST' })
    setDone(true)
    setTimeout(() => router.replace('/'), 1200)
  }

  if (done) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
        <CheckCircle className="w-10 h-10 text-[#00D4A0] mx-auto" />
        <p className="text-sm font-semibold text-[#00D4A0]">同意しました。ダッシュボードへ移動します</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
      <div className="text-center space-y-1">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-[#FF4655]/10 border border-[#FF4655]/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#FF4655]" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-white">利用規約への同意</h1>
        <p className="text-sm text-muted-foreground">
          サービスを開始する前に利用規約とプライバシーポリシーをご確認ください
        </p>
      </div>

      <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-2 text-sm text-muted-foreground leading-relaxed">
        <p>AXELIA Analytics は VALORANT チームの戦績データを管理・分析するサービスです。</p>
        <p>ご利用にあたり、以下のドキュメントをご確認ください。</p>
        <ul className="space-y-1 mt-2">
          <li>
            <Link href="/terms" target="_blank" className="text-[#FF4655] hover:underline font-medium">
              利用規約 →
            </Link>
          </li>
          <li>
            <Link href="/privacy" target="_blank" className="text-[#FF4655] hover:underline font-medium">
              プライバシーポリシー →
            </Link>
          </li>
        </ul>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#FF4655] cursor-pointer"
        />
        <span className="text-sm text-muted-foreground group-hover:text-white transition-colors">
          利用規約とプライバシーポリシーを読み、内容に同意します
        </span>
      </label>

      <button
        onClick={handleConsent}
        disabled={!agreed || loading}
        className="w-full bg-[#FF4655] hover:bg-[#FF4655]/80 disabled:opacity-40 text-white font-semibold rounded-lg py-3 text-sm transition-colors flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? '処理中...' : '同意してはじめる'}
      </button>
    </div>
  )
}
