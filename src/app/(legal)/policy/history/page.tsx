'use client'

import { useEffect, useState } from 'react'
import { PolicyContent } from '@/components/policy/PolicyContent'
import { X } from 'lucide-react'

const POLICY_LABELS: Record<string, string> = {
  terms: '利用規約',
  data_policy: 'データ利用ポリシー',
  privacy: 'プライバシーポリシー',
  security: 'セキュリティポリシー',
}

type HistoryRow = {
  id: string
  policy_type: string
  version: string
  title: string
  effective_date: string
  updated_at: string
  summary: string | null
}

type PolicyDetail = HistoryRow & { content: string }

export default function PolicyHistoryPage() {
  const [rows, setRows]           = useState<HistoryRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<PolicyDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetch('/api/policies/history')
      .then(r => r.json())
      .then(json => { setRows(json.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function openDetail(row: HistoryRow) {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/policies/${row.policy_type}?version=${row.version}`)
      const json = await res.json()
      setSelected(json.data ?? null)
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-black text-white mb-2">規程 改定履歴</h1>
      <p className="text-sm text-slate-400 mb-8">
        各ポリシーのバージョン履歴です。行をクリックするとその版の本文を閲覧できます。
      </p>

      {loading ? (
        <p className="text-slate-400 text-sm">読み込み中...</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-400 text-sm">履歴がありません。</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-left">
                <th className="px-4 py-3 text-muted-foreground font-semibold">種類</th>
                <th className="px-4 py-3 text-muted-foreground font-semibold">バージョン</th>
                <th className="px-4 py-3 text-muted-foreground font-semibold">施行日</th>
                <th className="px-4 py-3 text-muted-foreground font-semibold">更新日</th>
                <th className="px-4 py-3 text-muted-foreground font-semibold">変更概要</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => openDetail(row)}
                  className="border-t border-border hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium">
                    {POLICY_LABELS[row.policy_type] ?? row.policy_type}
                  </td>
                  <td className="px-4 py-3 text-slate-300">v{row.version}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {String(row.effective_date).slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {String(row.updated_at).slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {row.summary ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 本文モーダル */}
      {(selected || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-16 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative bg-[#18181F] border border-border rounded-2xl w-full max-w-3xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {detailLoading ? (
              <p className="text-slate-400 text-sm py-10 text-center">読み込み中...</p>
            ) : selected && (
              <>
                <div className="flex flex-wrap gap-3 mb-6 text-xs text-slate-500">
                  <span>{POLICY_LABELS[selected.policy_type]}</span>
                  <span>v{selected.version}</span>
                  <span>施行日 {String(selected.effective_date).slice(0, 10)}</span>
                  <span>更新日 {String(selected.updated_at).slice(0, 10)}</span>
                </div>
                <PolicyContent content={selected.content} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
