'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  Bot, AlertTriangle, Loader2, Map, FileDown,
  CheckSquare, Square, Target, TrendingUp, BarChart2, User,
  ShieldAlert, Zap, ArrowRight, MessageSquare,
  AlertCircle, CheckCircle2, Trophy, Swords, Brain,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? ''

// ── Types ────────────────────────────────────────────────────
interface MatchSummary {
  id: string; match_date: string; opponent_name: string
  map: string; result: 'win' | 'loss' | 'draw'
  team_score: number; opponent_score: number
}
interface TeamStyle { classification: string; pro_gap: string[] }
interface MacroAnalysis { main_issues: string[]; causes: string[]; improvement_actions: string[] }
interface PatternAnalysis { loss_patterns: string[]; win_patterns: string[] }
interface PlayerFeedback { name: string; evaluation: string[]; issues: string[]; improvements: string[]; practice: string[] }
interface Report {
  team_style?: TeamStyle; macro_analysis?: MacroAnalysis; pattern_analysis?: PatternAnalysis
  player_feedback?: PlayerFeedback[]; summary?: string; raw_analysis?: string
}

// ── Main Page ─────────────────────────────────────────────────
export default function AICoachPage() {
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [mapFilter, setMapFilter] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/matches?team_id=${TEAM_ID}&limit=50`)
      .then(r => r.json()).then(j => setMatches(j.data ?? [])).catch(() => {})
  }, [])

  const allMaps = useMemo(() => [...new Set(matches.map(m => m.map).filter(Boolean))].sort(), [matches])
  const filteredMatches = useMemo(() => mapFilter ? matches.filter(m => m.map === mapFilter) : matches, [matches, mapFilter])

  function toggleMatch(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    selectedIds.size === filteredMatches.length
      ? setSelectedIds(new Set())
      : setSelectedIds(new Set(filteredMatches.map(m => m.id)))
  }

  async function runAnalysis() {
    setLoading(true); setError(null); setReport(null)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: TEAM_ID, match_ids: selectedIds.size > 0 ? [...selectedIds] : undefined, map_filter: mapFilter || undefined }),
      })
      if (!res.ok || !res.body) throw new Error(`サーバーエラー (HTTP ${res.status})`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let reportReceived = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data: Record<string, any> = JSON.parse(line.slice(6))
          if (data.error) throw new Error(data.details ? `${data.error}: ${data.details}` : data.error)
          if (data.done) {
            reportReceived = true
            setReport(data.data)
            console.log('[AI raw analysis]', data.data?.raw_analysis)
          }
        }
      }
      if (!reportReceived) throw new Error('分析がタイムアウトしました。試合数を絞って再度お試しください。')
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }

  const analysisLabel = selectedIds.size > 0 ? `${selectedIds.size}試合を分析` : mapFilter ? `${mapFilter}マップ全試合を分析` : '全データを分析'

  return (
    <div className="space-y-6">
      {/* ─ Header ─ */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#FF4655]" /> AIコーチ
          </h1>
          <p className="text-muted-foreground text-sm mt-1">試合・マップを選択してAIにコーチングレポートを生成させる</p>
        </div>
        <button onClick={runAnalysis} disabled={loading}
          className={cn('flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all whitespace-nowrap shadow-lg',
            loading ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-[#FF4655] hover:bg-[#e03e4d] text-white shadow-[#FF4655]/30')}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />分析中...</> : <><Bot className="w-4 h-4" />{analysisLabel}</>}
        </button>
      </div>

      {/* ─ Match selector ─ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-white">分析対象の選択</span>
          <span className="text-xs text-muted-foreground">未選択の場合は全データを分析</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Map className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <label className="text-xs text-muted-foreground w-16 flex-shrink-0">マップ絞込</label>
            <select value={mapFilter} onChange={e => { setMapFilter(e.target.value); setSelectedIds(new Set()) }}
              className="bg-muted border border-border rounded px-2 py-1 text-xs text-white focus:border-[#FF4655] outline-none">
              <option value="">すべてのマップ</option>
              {allMaps.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">試合選択 ({selectedIds.size}/{filteredMatches.length})</span>
              <button onClick={toggleAll} className="text-xs text-[#FF4655] hover:underline">
                {selectedIds.size === filteredMatches.length && filteredMatches.length > 0 ? '全解除' : '全選択'}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {filteredMatches.length === 0
                ? <div className="text-xs text-muted-foreground py-4 text-center">試合データがありません</div>
                : filteredMatches.map(m => {
                  const checked = selectedIds.has(m.id)
                  return (
                    <button key={m.id} onClick={() => toggleMatch(m.id)}
                      className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors',
                        checked ? 'bg-[#FF4655]/10 border border-[#FF4655]/30' : 'hover:bg-muted/30 border border-transparent')}>
                      {checked ? <CheckSquare className="w-3.5 h-3.5 text-[#FF4655] flex-shrink-0" /> : <Square className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0',
                        m.result === 'win' ? 'bg-[#00D4A0]/15 text-[#00D4A0]' : 'bg-[#FF4655]/15 text-[#FF4655]')}>
                        {m.result === 'win' ? 'W' : 'L'}
                      </span>
                      <span className="text-xs text-white flex-1 min-w-0 truncate">vs {m.opponent_name || '不明'}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{m.map}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{m.team_score}-{m.opponent_score}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {m.match_date ? new Date(m.match_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : ''}
                      </span>
                    </button>
                  )
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#FF4655]/10 border border-[#FF4655]/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#FF4655] flex-shrink-0 mt-0.5" />
          <div><p className="text-sm font-semibold text-[#FF4655]">エラー</p><p className="text-xs text-muted-foreground mt-1">{error}</p></div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <div className="relative mx-auto w-16 h-16 mb-5">
            <Loader2 className="w-16 h-16 text-[#FF4655] animate-spin absolute" />
            <Bot className="w-7 h-7 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-white font-semibold text-lg">AIが分析中...</p>
          <p className="text-muted-foreground text-xs mt-2">プロ基準でデータを解析しています（30〜60秒）</p>
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && !error && (
        <div className="bg-card rounded-xl p-16 border border-border text-center">
          <Bot className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="text-white font-semibold">分析を開始してください</h3>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">試合やマップを選択（任意）してから「分析実行」をクリック</p>
        </div>
      )}

      {/* ═══════════════ REPORT ═══════════════ */}
      {report && !loading && (
        <div className="space-y-5">

          {/* Export button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                sessionStorage.setItem('ai_export_report', JSON.stringify(report))
                window.open('/export/ai', '_blank')
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-white hover:border-white/30 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              PDFエクスポート
            </button>
          </div>

          {/* ① チームスタイル分析 */}
          {report.team_style && (
            <ReportCard num="①" title="チームスタイル分析" icon={Brain} accent="#6C63FF">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#6C63FF]/20 to-[#6C63FF]/5 border border-[#6C63FF]/25 px-5 py-4 mb-4">
                <p className="text-[10px] text-[#6C63FF] font-semibold tracking-widest uppercase mb-1">スタイル分類</p>
                <p className="text-xl font-black text-white">{report.team_style.classification}</p>
              </div>
              <div className="space-y-2">
                {report.team_style.pro_gap.map((gap, i) => (
                  <div key={i} className="flex items-start gap-3 bg-[#FF4655]/5 border border-[#FF4655]/20 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-[#FF4655] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{gap}</p>
                  </div>
                ))}
              </div>
            </ReportCard>
          )}

          {/* ② マクロ分析 */}
          {report.macro_analysis && (
            <ReportCard num="②" title="マクロ分析" icon={BarChart2} accent="#FF8C42">
              <div className="space-y-3">
                <FlowBlock label="主な問題" color="#FF4655" bg="bg-[#FF4655]/5" border="border-[#FF4655]/20">
                  {report.macro_analysis.main_issues.map((t, i) => <FlowRow key={i} text={t} dot="#FF4655" />)}
                </FlowBlock>
                <div className="flex justify-center"><ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" /></div>
                <FlowBlock label="原因" color="#FF8C42" bg="bg-[#FF8C42]/5" border="border-[#FF8C42]/20">
                  {report.macro_analysis.causes.map((t, i) => <FlowRow key={i} text={t} dot="#FF8C42" />)}
                </FlowBlock>
                <div className="flex justify-center"><ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" /></div>
                <FlowBlock label="改善アクション" color="#00D4A0" bg="bg-[#00D4A0]/5" border="border-[#00D4A0]/20">
                  {report.macro_analysis.improvement_actions.map((t, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#00D4A0]/20 text-[#00D4A0] text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      <span className="leading-relaxed pt-0.5">{t}</span>
                    </div>
                  ))}
                </FlowBlock>
              </div>
            </ReportCard>
          )}

          {/* ③ パターン分析 */}
          {report.pattern_analysis && (
            <ReportCard num="③" title="パターン分析" icon={TrendingUp} accent="#00D4A0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FF4655]/5 border border-[#FF4655]/25 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Swords className="w-3.5 h-3.5 text-[#FF4655]" />
                    <p className="text-xs font-bold text-[#FF4655]">頻出負けパターン</p>
                  </div>
                  <div className="space-y-2.5">
                    {report.pattern_analysis.loss_patterns.map((p, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 w-5 h-5 rounded bg-[#FF4655]/20 text-[#FF4655] text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#00D4A0]/5 border border-[#00D4A0]/25 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-3.5 h-3.5 text-[#00D4A0]" />
                    <p className="text-xs font-bold text-[#00D4A0]">勝ちパターン</p>
                  </div>
                  <div className="space-y-2.5">
                    {report.pattern_analysis.win_patterns.map((p, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 w-5 h-5 rounded bg-[#00D4A0]/20 text-[#00D4A0] text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ReportCard>
          )}

          {/* ④ 個人フィードバック */}
          {report.player_feedback?.length ? (
            <ReportCard num="④" title="個人フィードバック" icon={User} accent="#6C63FF">
              <div className="space-y-4">
                {report.player_feedback.map((player, i) => (
                  <div key={i} className="rounded-xl border border-border overflow-hidden">
                    <div className="bg-gradient-to-r from-[#6C63FF]/20 to-transparent px-5 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#6C63FF]/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-[#6C63FF]" />
                      </div>
                      <p className="text-sm font-bold text-white">{player.name}</p>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <PlayerBlock label="評価" items={player.evaluation} icon={<CheckCircle2 className="w-3 h-3" />} color="#00D4A0" />
                      <PlayerBlock label="問題点" items={player.issues} icon={<AlertCircle className="w-3 h-3" />} color="#FF4655" />
                      <PlayerBlock label="改善策" items={player.improvements} icon={<Target className="w-3 h-3" />} color="#6C63FF" />
                      <PlayerBlock label="練習方法" items={player.practice} icon={<Zap className="w-3 h-3" />} color="#FFD700" />
                    </div>
                  </div>
                ))}
              </div>
            </ReportCard>
          ) : null}

          {/* ⑤ 総括 */}
          {report.summary && (
            <div className="relative overflow-hidden rounded-2xl border border-[#6C63FF]/30 bg-gradient-to-br from-[#6C63FF]/10 via-card to-card">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#6C63FF15,transparent_60%)]" />
              <div className="relative px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                    <span className="text-xs font-black text-[#6C63FF]">⑤</span>
                  </div>
                  <MessageSquare className="w-4 h-4 text-[#6C63FF]" />
                  <h2 className="text-sm font-bold text-white">総括</h2>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-[#6C63FF] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{report.summary}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════

function ReportCard({ num, title, icon: Icon, accent, children }: {
  num: string; title: string; icon: React.ElementType; accent: string; children: React.ReactNode
}) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3"
        style={{ borderLeftColor: accent, borderLeftWidth: 3 }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}20` }}>
          <span className="text-[10px] font-black" style={{ color: accent }}>{num}</span>
        </div>
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
        <h2 className="font-bold text-white text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function FlowBlock({ label, color, bg, border, children }: {
  label: string; color: string; bg: string; border: string; children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-xl p-4 border space-y-2', bg, border)}>
      <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color }}>{label}</p>
      {children}
    </div>
  )
}

function FlowRow({ text, dot }: { text: string; dot: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: dot }} />
      <span className="leading-relaxed">{text}</span>
    </div>
  )
}


function PlayerBlock({ label, items, icon, color }: { label: string; items: string[]; icon: React.ReactNode; color: string }) {
  if (!items?.length) return null
  return (
    <div className="rounded-lg p-3 border border-border bg-muted/10">
      <div className="flex items-center gap-1.5 mb-2" style={{ color }}>
        {icon}
        <p className="text-[10px] font-bold tracking-wide uppercase">{label}</p>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <span className="w-1 h-1 rounded-full flex-shrink-0 mt-1.5" style={{ background: color }} />
            <span className="leading-relaxed">{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

