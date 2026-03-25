'use client'
import { useEffect, useState } from 'react'

interface TeamStyle    { type: string; win_path: string; weakness: string }
interface MainIssue   { issue: string; data_evidence: string; cause: string }
interface PlayerFeedback { name: string; problem: string; improvement: string }
interface Report {
  team_style?: TeamStyle
  main_issue?: MainIssue
  loss_patterns?: string[]
  macro_improvements?: string[]
  player_feedback?: PlayerFeedback[]
  next_actions?: string[]
  summary?: string
}

export default function AIExportPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError]   = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('ai_export_report')
      if (!raw) { setError(true); return }
      setReport(JSON.parse(raw))
    } catch {
      setError(true)
    }
  }, [])

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-white text-gray-500 text-sm">
      データが見つかりません。AIコーチ画面からエクスポートしてください。
    </div>
  )
  if (!report) return (
    <div className="flex items-center justify-center h-screen bg-white text-gray-500 text-sm">読み込み中...</div>
  )

  const today = new Date().toLocaleDateString('ja-JP')

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button onClick={() => window.print()}
          className="bg-[#FF4655] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow hover:bg-[#e03444] transition-colors">
          PDF保存 / 印刷
        </button>
        <button onClick={() => window.close()}
          className="bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg shadow hover:bg-gray-300 transition-colors">
          閉じる
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 text-sm leading-relaxed">

        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-4 mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">AIコーチング レポート</h1>
            <p className="text-gray-400 text-xs mt-0.5">VALORANT スクリム分析</p>
          </div>
          <div className="text-right text-xs text-gray-400">出力日: {today}</div>
        </div>

        {/* ① チームスタイル */}
        {report.team_style && (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="①" title="チームスタイル" />
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'タイプ',  value: report.team_style.type,     border: '#6C63FF' },
                { label: '勝ち筋',  value: report.team_style.win_path,  border: '#00B894' },
                { label: '弱点',    value: report.team_style.weakness,  border: '#FF4655' },
              ].map((d, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-3" style={{ borderLeftColor: d.border, borderLeftWidth: 3 }}>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">{d.label}</p>
                  <p className="text-xs leading-relaxed">{d.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ② 最重要課題 */}
        {report.main_issue && (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="②" title="最重要課題" />
            <div className="border-l-4 border-red-400 pl-4 mb-3 bg-red-50 rounded-r-xl py-3">
              <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-1">課題</p>
              <p className="font-black text-sm">{report.main_issue.issue}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SubSection title="根拠データ">
                <p className="text-xs leading-relaxed">{report.main_issue.data_evidence}</p>
              </SubSection>
              <SubSection title="原因">
                <p className="text-xs leading-relaxed">{report.main_issue.cause}</p>
              </SubSection>
            </div>
          </section>
        )}

        {/* ③ 負けパターン */}
        {report.loss_patterns?.length ? (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="③" title="負けパターン（再現性）" />
            <div className="space-y-2">
              {report.loss_patterns.map((p, i) => (
                <div key={i} className="flex items-start gap-3 border border-orange-200 bg-orange-50 rounded-xl px-4 py-2.5">
                  <span className="w-5 h-5 rounded bg-orange-200 text-orange-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-xs leading-relaxed">{p}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ④ マクロ改善 */}
        {report.macro_improvements?.length ? (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="④" title="マクロ改善（即実行）" />
            <div className="space-y-2">
              {report.macro_improvements.map((item, i) => (
                <div key={i} className="flex items-start gap-3 border border-green-200 bg-green-50 rounded-xl px-4 py-2.5">
                  <span className="w-5 h-5 rounded-full bg-green-200 text-green-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-xs leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ⑤ 個人フィードバック */}
        {report.player_feedback?.length ? (
          <section className="mb-8">
            <SectionTitle num="⑤" title="個人フィードバック" />
            <div className="space-y-3 mt-2">
              {report.player_feedback.map((p, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 break-inside-avoid">
                  <p className="font-black text-sm mb-3 pb-2 border-b border-gray-100">{p.name}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <SubSection title="問題点">
                      <p className="text-xs leading-relaxed">{p.problem}</p>
                    </SubSection>
                    <SubSection title="改善策">
                      <p className="text-xs leading-relaxed">{p.improvement}</p>
                    </SubSection>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ⑥ 次の試合でやること */}
        {report.next_actions?.length ? (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="⑥" title="次の試合でやること" />
            <div className="space-y-2">
              {report.next_actions.map((action, i) => (
                <div key={i} className="flex items-center gap-3 border border-yellow-200 bg-yellow-50 rounded-xl px-4 py-2.5">
                  <span className="w-6 h-6 rounded-full bg-yellow-200 text-yellow-700 text-xs font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <p className="text-sm font-medium">{action}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ⑦ 総評 */}
        {report.summary && (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="⑦" title="総評（コーチ視点）" />
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 mt-2">
              <p className="text-xs leading-relaxed text-gray-700">{report.summary}</p>
            </div>
          </section>
        )}

        <div className="text-center text-xs text-gray-300 mt-12 border-t border-gray-100 pt-4">
          Generated by スクリムデータ解析 AIコーチ · {today}
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 15mm 12mm; size: A4; }
          body  { background: white !important; }
          .break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}

function SectionTitle({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-gray-900">
      <span className="text-xs font-black bg-gray-900 text-white px-2 py-0.5 rounded">{num}</span>
      <h2 className="font-black text-sm tracking-tight">{title}</h2>
    </div>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  )
}
