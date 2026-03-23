'use client'
import { useEffect, useState } from 'react'

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? 'YOUR_TEAM_UUID'

const ECO_LABELS: Record<string, string> = {
  pistol: 'ピストル', eco: 'エコ', anti_eco: 'アンチエコ', semi_eco: 'セミエコ',
  semi_buy: 'セミバイ', full_buy: 'フルバイ', oper: 'オペ', second: 'セカンド', third: 'サード',
}

interface Entry { wins: number; total: number; win_rate: number }

export default function ExportPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/analysis/dashboard?team_id=${TEAM_ID}`)
      .then(r => r.json())
      .then(j => { setData(j.data ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-500 text-sm">読み込み中...</div>
  )
  if (!data) return (
    <div className="flex items-center justify-center h-screen text-gray-500 text-sm">データなし</div>
  )

  const s   = data.summary           as Record<string, unknown>
  const eco = (data.economy          as Record<string, unknown>[]) ?? []
  const tim = (data.timing_win_rates as Record<string, unknown>[]) ?? []
  const sit = (data.site_win_rates   as Record<string, Entry>)    ?? {}
  const rec = (s.recent_matches      as Record<string, unknown>[]) ?? []

  const team = s.team as Record<string, unknown> | undefined
  const teamName = String(team?.name ?? 'チーム')
  const atkWR  = Math.round(Number(s.attack_win_rate)  * 100)
  const defWR  = Math.round(Number(s.defense_win_rate) * 100)
  const allWR  = Math.round(Number(s.overall_win_rate) * 100)
  const today  = new Date().toLocaleDateString('ja-JP')

  const timingCfg: Record<string, { label: string; sub: string }> = {
    early: { label: 'Early', sub: 'ラッシュ' },
    mid:   { label: 'Mid',   sub: 'デフォルト' },
    late:  { label: 'Late',  sub: 'スロウ' },
  }

  const timingRows = (['early', 'mid', 'late'] as const).map(t => {
    const atk = tim.find(r => r.contact_timing === t && r.side === 'attack')
    const def = tim.find(r => r.contact_timing === t && r.side === 'defense')
    return { timing: t, atk, def }
  }).filter(r => r.atk || r.def)

  const siteKeys = [
    { atk: 'a_attack', def: 'a_retake', label: 'A サイト' },
    { atk: 'b_attack', def: 'b_retake', label: 'B サイト' },
    { atk: 'c_attack', def: 'c_retake', label: 'C サイト' },
  ].filter(s => sit[s.atk] || sit[s.def])

  function pct(e: Record<string, unknown> | undefined) {
    if (!e) return '--'
    return `${Math.round(Number(e.win_rate) * 100)}% (${e.wins}W/${e.total}R)`
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Print button — hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="bg-[#FF4655] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow hover:bg-[#e03444] transition-colors"
        >
          PDF保存 / 印刷
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg shadow hover:bg-gray-300 transition-colors"
        >
          閉じる
        </button>
      </div>

      {/* Report body */}
      <div className="report-body max-w-3xl mx-auto px-8 py-10 text-gray-900 font-sans text-sm leading-relaxed">

        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-4 mb-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">{teamName}</h1>
              <p className="text-gray-500 text-xs mt-0.5">スクリムデータ分析レポート</p>
            </div>
            <div className="text-right text-xs text-gray-400">
              <div>出力日: {today}</div>
            </div>
          </div>
        </div>

        {/* Overall KPIs */}
        <section className="mb-8">
          <h2 className="section-title">総合成績</h2>
          <div className="grid grid-cols-3 gap-4 mt-3">
            {[
              { label: '総合勝率',   value: allWR },
              { label: 'ATK 勝率',  value: atkWR },
              { label: 'DEF 勝率',  value: defWR },
            ].map(c => (
              <div key={c.label} className="border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-black">{c.value}%</div>
                <div className="text-xs text-gray-500 mt-1">{c.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Economy */}
        {eco.length > 0 && (
          <section className="mb-8">
            <h2 className="section-title">購入状況別勝率</h2>
            <table className="w-full mt-3 text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 border border-gray-200">購入状況</th>
                  <th className="text-right px-3 py-2 border border-gray-200">勝率</th>
                  <th className="text-right px-3 py-2 border border-gray-200">勝/ラウンド</th>
                </tr>
              </thead>
              <tbody>
                {eco.map((row: Record<string, unknown>) => {
                  const p = Math.round(Number(row.win_rate) * 100)
                  return (
                    <tr key={String(row.economy_type)} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 border border-gray-200">
                        {ECO_LABELS[String(row.economy_type)] ?? String(row.economy_type)}
                      </td>
                      <td className="px-3 py-1.5 border border-gray-200 text-right font-bold">
                        {p}%
                      </td>
                      <td className="px-3 py-1.5 border border-gray-200 text-right text-gray-500">
                        {String(row.wins)}W / {String(row.rounds)}R
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* Timing */}
        {timingRows.length > 0 && (
          <section className="mb-8">
            <h2 className="section-title">タイミング別勝率</h2>
            <table className="w-full mt-3 text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 border border-gray-200">タイミング</th>
                  <th className="text-right px-3 py-2 border border-gray-200">ATK 勝率</th>
                  <th className="text-right px-3 py-2 border border-gray-200">DEF 勝率</th>
                </tr>
              </thead>
              <tbody>
                {timingRows.map(({ timing, atk, def }) => (
                  <tr key={timing} className="border-b border-gray-100">
                    <td className="px-3 py-1.5 border border-gray-200 font-medium">
                      {timingCfg[timing].label}
                      <span className="ml-2 text-gray-400 font-normal">{timingCfg[timing].sub}</span>
                    </td>
                    <td className="px-3 py-1.5 border border-gray-200 text-right">{pct(atk)}</td>
                    <td className="px-3 py-1.5 border border-gray-200 text-right">{pct(def)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Site */}
        {siteKeys.length > 0 && (
          <section className="mb-8">
            <h2 className="section-title">サイト別勝率</h2>
            <table className="w-full mt-3 text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 border border-gray-200">サイト</th>
                  <th className="text-right px-3 py-2 border border-gray-200">プラント後 (ATK)</th>
                  <th className="text-right px-3 py-2 border border-gray-200">リテイク (DEF)</th>
                </tr>
              </thead>
              <tbody>
                {siteKeys.map(({ atk, def, label }) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="px-3 py-1.5 border border-gray-200 font-medium">{label}</td>
                    <td className="px-3 py-1.5 border border-gray-200 text-right">{pct(sit[atk] as unknown as Record<string, unknown>)}</td>
                    <td className="px-3 py-1.5 border border-gray-200 text-right">{pct(sit[def] as unknown as Record<string, unknown>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Recent matches */}
        {rec.length > 0 && (
          <section className="mb-8">
            <h2 className="section-title">直近試合</h2>
            <table className="w-full mt-3 text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 border border-gray-200">日付</th>
                  <th className="text-left px-3 py-2 border border-gray-200">対戦相手</th>
                  <th className="text-left px-3 py-2 border border-gray-200">マップ</th>
                  <th className="text-center px-3 py-2 border border-gray-200">スコア</th>
                  <th className="text-center px-3 py-2 border border-gray-200">結果</th>
                </tr>
              </thead>
              <tbody>
                {rec.map((m: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-3 py-1.5 border border-gray-200 text-gray-500">
                      {new Date(String(m.match_date)).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-3 py-1.5 border border-gray-200">{String(m.opponent_name)}</td>
                    <td className="px-3 py-1.5 border border-gray-200">{String(m.map)}</td>
                    <td className="px-3 py-1.5 border border-gray-200 text-center">
                      {String(m.team_score)} - {String(m.opponent_score)}
                    </td>
                    <td className="px-3 py-1.5 border border-gray-200 text-center font-bold"
                      style={{ color: m.result === 'win' ? '#16a34a' : m.result === 'loss' ? '#dc2626' : '#6b7280' }}>
                      {m.result === 'win' ? '勝' : m.result === 'loss' ? '負' : '分'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <div className="text-center text-xs text-gray-300 mt-12 border-t border-gray-100 pt-4">
          Generated by スクリムデータ解析 · {today}
        </div>
      </div>

      <style>{`
        .section-title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }
        @media print {
          @page { margin: 15mm 12mm; size: A4; }
          body { background: white !important; }
          .report-body { max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  )
}
