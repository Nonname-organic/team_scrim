'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ShieldCheck, ExternalLink } from 'lucide-react'

interface Policy { type: string; version: string }

const POLICY_META: Record<string, { label: string; href: string }> = {
  terms:      { label: '利用規約',           href: '/terms' },
  privacy:    { label: 'プライバシーポリシー', href: '/privacy' },
  data_usage: { label: 'データ利用ポリシー',   href: '/terms' },
  security:   { label: 'セキュリティポリシー',  href: '/terms' },
}

export default function ConsentPage() {
  const router = useRouter()
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading]   = useState(true)
  const [checked, setChecked]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/consent')
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        const pending: Policy[] = j?.pendingPolicies ?? []
        if (pending.length === 0) {
          // 既に全同意済み → ダッシュボードへ
          router.replace('/')
          return
        }
        setPolicies(pending)
        setLoading(false)
      })
      .catch(() => { setError('読み込みに失敗しました'); setLoading(false) })
  }, [router])

  async function handleAgree() {
    if (!checked || saving) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policies }),
    })
    const j = await res.json().catch(() => ({}))
    setSaving(false)
    if (res.ok && (j.pendingPolicies?.length ?? 0) === 0) {
      router.replace('/')
      router.refresh()
    } else {
      setError(j.error ?? '同意の記録に失敗しました')
    }
  }

  async function handleDecline() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) return (
    <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-3">
      <Loader2 className="w-6 h-6 text-[#FF4655] animate-spin" />
      <p className="text-sm text-muted-foreground">読み込み中...</p>
    </div>
  )

  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#FF4655]/10 border border-[#FF4655]/20 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-[#FF4655]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">規約への同意</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            サービス利用には以下への同意が必要です
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {policies.map(p => {
          const meta = POLICY_META[p.type] ?? { label: p.type, href: '#' }
          return (
            <Link
              key={p.type}
              href={meta.href}
              target="_blank"
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-muted/20 hover:border-white/30 transition-colors group"
            >
              <div>
                <div className="text-sm font-medium text-white">{meta.label}</div>
                <div className="text-[10px] text-muted-foreground">バージョン {p.version}</div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
            </Link>
          )
        })}
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
          className="accent-[#FF4655] w-4 h-4 mt-0.5 flex-shrink-0"
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          上記のすべての規約・ポリシーを確認し、内容に同意します。
        </span>
      </label>

      {error && (
        <div className="text-xs text-[#FF4655] bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleDecline}
          disabled={saving}
          className="flex-1 border border-border text-muted-foreground hover:text-white text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          同意しない（ログアウト）
        </button>
        <button
          onClick={handleAgree}
          disabled={!checked || saving}
          className="flex-1 bg-[#FF4655] hover:bg-[#e03e4d] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          同意して利用を開始
        </button>
      </div>
    </div>
  )
}
