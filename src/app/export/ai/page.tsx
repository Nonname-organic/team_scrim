'use client'
import { useEffect, useState } from 'react'

interface TeamStyle     { classification: string; pro_gap: string[] }
interface MacroAnalysis { main_issues: string[]; causes: string[]; improvement_actions: string[] }
interface PatternAnalysis { loss_patterns: string[]; win_patterns: string[] }
interface PlayerFeedback  { name: string; evaluation: string[]; issues: string[]; improvements: string[]; practice: string[] }
interface Report {
  team_style?: TeamStyle; macro_analysis?: MacroAnalysis; pattern_analysis?: PatternAnalysis
  player_feedback?: PlayerFeedback[]; summary?: string
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
            <SectionTitle num="①" title="チームスタイル分析" />
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 mb-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">スタイル分類</p>
              <p className="text-xl font-black">{report.team_style.classification}</p>
            </div>
            <div className="space-y-2">
              {report.team_style.pro_gap.map((gap, i) => (
                <div key={i} className="border-l-4 border-red-400 pl-3 py-1 bg-red-50 rounded-r-lg">
                  <p className="text-xs">{gap}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ② マクロ分析 */}
        {report.macro_analysis && (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="②" title="マクロ分析" />
            <div className="space-y-3">
              <SubSection title="主要課題">
                <BulletList items={report.macro_analysis.main_issues} />
              </SubSection>
              <div className="grid grid-cols-2 gap-3">
                <SubSection title="原因">
                  <BulletList items={report.macro_analysis.causes} />
                </SubSection>
                <SubSection title="改善アクション">
                  <BulletList items={report.macro_analysis.improvement_actions} marker="→" />
                </SubSection>
              </div>
            </div>
          </section>
        )}

        {/* ③ パターン分析 */}
        {report.pattern_analysis && (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="③" title="パターン分析" />
            <div className="grid grid-cols-2 gap-3">
              <SubSection title="負けパターン">
                <BulletList items={report.pattern_analysis.loss_patterns} />
              </SubSection>
              <SubSection title="勝ちパターン">
                <BulletList items={report.pattern_analysis.win_patterns} />
              </SubSection>
            </div>
          </section>
        )}

        {/* ④ 選手フィードバック */}
        {report.player_feedback && report.player_feedback.length > 0 && (
          <section className="mb-8">
            <SectionTitle num="④" title="選手フィードバック" />
            <div className="space-y-4 mt-2">
              {report.player_feedback.map((p, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 break-inside-avoid">
                  <p className="font-black text-sm mb-3 pb-2 border-b border-gray-100">{p.name}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <SubSection title="評価"><BulletList items={p.evaluation} /></SubSection>
                    <SubSection title="課題"><BulletList items={p.issues} /></SubSection>
                    <SubSection title="改善"><BulletList items={p.improvements} marker="→" /></SubSection>
                    <SubSection title="練習メニュー"><BulletList items={p.practice} marker="●" /></SubSection>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ⑤ 総括 */}
        {report.summary && (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="⑤" title="総括" />
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

function BulletList({ items, marker = '•' }: { items: string[]; marker?: string }) {
  if (!items?.length) return <p className="text-xs text-gray-400">--</p>
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-1.5 text-xs">
          <span className="flex-shrink-0 text-gray-400 mt-0.5">{marker}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
