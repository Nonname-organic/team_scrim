'use client'
import { useEffect, useState } from 'react'

interface StyleEvidence { rush_tendency: string; first_kill_first_death: string; trade_rate: string }
interface TeamStyle    { classification: string; evidence: StyleEvidence; pro_gap: string }
interface MacroAnalysis { main_issues: string[]; data_evidence: string; causes: string[]; improvement_actions: string[] }
interface PatternAnalysis { loss_patterns: string[]; win_patterns: string[] }
interface RoundAnalysis   { round_number: string; situation: string; reason: string; improvement: string }
interface PlayerFeedback  { name: string; role: string; evaluation: string[]; issues: string[]; causes: string[]; improvements: string[]; practice: string[] }
interface StyleScores     { aggression: number; structure: number; teamwork: number; adaptability: number; info_management: number }
interface Report {
  team_style?: TeamStyle; macro_analysis?: MacroAnalysis; pattern_analysis?: PatternAnalysis
  round_analysis?: RoundAnalysis[]; player_feedback?: PlayerFeedback[]; style_scores?: StyleScores
  improvement_priority?: string[]; ng_actions?: string[]; next_match_actions?: string[]
  summary?: string
}

const SCORE_LABELS: Record<string, string> = {
  aggression: 'アグレッション', structure: '構造力', teamwork: 'チームワーク',
  adaptability: '適応力', info_management: '情報管理',
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
      {/* Print / close buttons */}
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

      <div className="max-w-3xl mx-auto px-8 py-10 text-sm leading-relaxed">

        {/* ── Header ── */}
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
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: 'ラッシュ傾向',           value: report.team_style.evidence.rush_tendency },
                { label: 'FirstKill/FirstDeath', value: report.team_style.evidence.first_kill_first_death },
                { label: 'トレード率',             value: report.team_style.evidence.trade_rate },
              ].map((d, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-[10px] text-gray-400 mb-1">{d.label}</p>
                  <p className="text-xs">{d.value}</p>
                </div>
              ))}
            </div>
            <div className="border-l-4 border-red-400 pl-3 py-1 bg-red-50 rounded-r-lg">
              <p className="text-[10px] text-gray-400 mb-0.5">プロとのギャップ</p>
              <p className="text-xs">{report.team_style.pro_gap}</p>
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
              <SubSection title="データ根拠">
                <p className="text-xs text-gray-700">{report.macro_analysis.data_evidence}</p>
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

        {/* ④ ラウンド分析 */}
        {report.round_analysis && report.round_analysis.length > 0 && (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="④" title="重要ラウンド分析" />
            <table className="w-full text-xs border-collapse mt-2">
              <thead>
                <tr className="bg-gray-100">
                  {['R#', '状況', '要因', '改善策'].map(h => (
                    <th key={h} className="text-left px-3 py-2 border border-gray-200 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.round_analysis.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-3 py-2 border border-gray-200 font-bold whitespace-nowrap">{r.round_number}</td>
                    <td className="px-3 py-2 border border-gray-200">{r.situation}</td>
                    <td className="px-3 py-2 border border-gray-200">{r.reason}</td>
                    <td className="px-3 py-2 border border-gray-200">{r.improvement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ⑤ 選手フィードバック */}
        {report.player_feedback && report.player_feedback.length > 0 && (
          <section className="mb-8">
            <SectionTitle num="⑤" title="選手フィードバック" />
            <div className="space-y-4 mt-2">
              {report.player_feedback.map((p, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 break-inside-avoid">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                    <span className="font-black text-sm">{p.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{p.role}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-gray-500 mb-1 text-[10px] uppercase">評価</p>
                      <BulletList items={p.evaluation} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-500 mb-1 text-[10px] uppercase">課題</p>
                      <BulletList items={p.issues} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-500 mb-1 text-[10px] uppercase">改善</p>
                      <BulletList items={p.improvements} marker="→" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-500 mb-1 text-[10px] uppercase">練習メニュー</p>
                      <BulletList items={p.practice} marker="●" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ⑥ スタイルスコア */}
        {report.style_scores && (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="⑥" title="スタイルスコア" />
            <div className="grid grid-cols-5 gap-2 mt-2">
              {Object.entries(report.style_scores).map(([key, val]) => (
                <div key={key} className="border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black">{val}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{SCORE_LABELS[key] ?? key}</div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gray-700" style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ⑦ 改善優先順位 */}
        {report.improvement_priority && report.improvement_priority.length > 0 && (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="⑦" title="改善優先順位" />
            <ol className="space-y-2 mt-2">
              {report.improvement_priority.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-xs pt-1">{item}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ⑧ NGアクション */}
        {report.ng_actions && report.ng_actions.length > 0 && (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="⑧" title="NGアクション（即時停止）" />
            <ul className="space-y-1.5 mt-2">
              {report.ng_actions.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-red-500 font-bold flex-shrink-0 mt-0.5">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ⑨ 次戦アクション */}
        {report.next_match_actions && report.next_match_actions.length > 0 && (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="⑨" title="次戦アクション" />
            <ul className="space-y-1.5 mt-2">
              {report.next_match_actions.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ⑩ 総括 */}
        {report.summary && (
          <section className="mb-8 break-inside-avoid">
            <SectionTitle num="⑩" title="総括" />
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
