'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  Bot, AlertTriangle, Loader2, Map, FileDown,
  CheckSquare, Square, Target, TrendingUp, BarChart2, User,
  ShieldAlert, Zap, List, XCircle, ArrowRight, MessageSquare,
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
interface StyleEvidence { rush_tendency: string; first_kill_first_death: string; trade_rate: string }
interface TeamStyle { classification: string; evidence: StyleEvidence; pro_gap: string }
interface MacroAnalysis { main_issues: string[]; data_evidence: string; causes: string[]; improvement_actions: string[] }
interface PatternAnalysis { loss_patterns: string[]; win_patterns: string[] }
interface RoundAnalysis { round_number: string; situation: string; reason: string; improvement: string }
interface PlayerFeedback { name: string; role: string; evaluation: string[]; issues: string[]; causes: string[]; improvements: string[]; practice: string[] }
interface StyleScores { aggression: number; structure: number; teamwork: number; adaptability: number; info_management: number }
interface Report {
  team_style?: TeamStyle; macro_analysis?: MacroAnalysis; pattern_analysis?: PatternAnalysis
  round_analysis?: RoundAnalysis[]; player_feedback?: PlayerFeedback[]; style_scores?: StyleScores
  improvement_priority?: string[]; ng_actions?: string[]; next_match_actions?: string[]
  summary?: string; raw_analysis?: string
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
      let json: Record<string, string>
      try { json = await res.json() } catch { throw new Error(`サーバーエラー (HTTP ${res.status})`) }
      if (!res.ok) throw new Error(json.details ? `${json.error ?? 'Analysis failed'}: ${json.details}` : (json.error ?? 'Analysis failed'))
      setReport(json.data)
      console.log('[AI raw analysis]', json.data.raw_analysis)
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
              {/* Classification Hero */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#6C63FF]/20 to-[#6C63FF]/5 border border-[#6C63FF]/25 px-5 py-4 mb-4">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,#6C63FF20,transparent_70%)]" />
                <p className="text-[10px] text-[#6C63FF] font-semibold tracking-widest uppercase mb-1">スタイル分類</p>
                <p className="text-xl font-black text-white">{report.team_style.classification}</p>
              </div>
              {/* Evidence 3-col */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'ラッシュ傾向', value: report.team_style.evidence.rush_tendency },
                  { label: 'FirstKill / FirstDeath', value: report.team_style.evidence.first_kill_first_death },
                  { label: 'トレード率', value: report.team_style.evidence.trade_rate },
                ].map((d, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">{d.label}</p>
                    <p className="text-xs text-white leading-relaxed">{d.value}</p>
                  </div>
                ))}
              </div>
              {/* Pro gap */}
              <div className="flex items-start gap-3 bg-[#FF4655]/5 border border-[#FF4655]/20 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 text-[#FF4655] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-[#FF4655] mb-0.5">プロ基準との差</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{report.team_style.pro_gap}</p>
                </div>
              </div>
            </ReportCard>
          )}

          {/* ② マクロ分析 */}
          {report.macro_analysis && (
            <ReportCard num="②" title="マクロ分析（戦術課題）" icon={BarChart2} accent="#FF8C42">
              {/* Flow: 問題 → 原因 → 改善 */}
              <div className="space-y-3">
                {/* 問題 */}
                <FlowBlock label="主な問題" color="#FF4655" bg="bg-[#FF4655]/5" border="border-[#FF4655]/20">
                  {report.macro_analysis.main_issues.map((t, i) => <FlowRow key={i} text={t} dot="#FF4655" />)}
                  {report.macro_analysis.data_evidence && (
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-[#FF4655]/10 rounded px-2 py-1">
                      <span className="text-[10px] text-[#FF4655] font-medium">根拠データ：</span>
                      <span className="text-[10px] text-white">{report.macro_analysis.data_evidence}</span>
                    </div>
                  )}
                </FlowBlock>
                {/* Arrow */}
                <div className="flex justify-center"><ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" /></div>
                {/* 原因 */}
                <FlowBlock label="原因" color="#FF8C42" bg="bg-[#FF8C42]/5" border="border-[#FF8C42]/20">
                  {report.macro_analysis.causes.map((t, i) => <FlowRow key={i} text={t} dot="#FF8C42" />)}
                </FlowBlock>
                {/* Arrow */}
                <div className="flex justify-center"><ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" /></div>
                {/* 改善アクション */}
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
            <ReportCard num="③" title="パターン分析（複数試合ベース）" icon={TrendingUp} accent="#00D4A0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 負けパターン */}
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
                {/* 勝ちパターン */}
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

          {/* ④ ラウンド分析 */}
          {report.round_analysis?.length ? (
            <ReportCard num="④" title="ラウンド分析（重要ラウンド抽出）" icon={List} accent="#FFD700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.round_analysis.map((r, i) => (
                  <div key={i} className="border border-border rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-[#FFD700]/15 to-transparent px-4 py-2.5 flex items-center gap-2 border-b border-border">
                      <span className="text-sm font-black text-[#FFD700]">{r.round_number}</span>
                    </div>
                    <div className="p-4 space-y-2">
                      <RoundRow icon="📍" label="状況" text={r.situation} color="text-white" />
                      <RoundRow icon="⚠️" label="敗因 / 勝因" text={r.reason} color="text-[#FF4655]" />
                      <RoundRow icon="✅" label="改善" text={r.improvement} color="text-[#00D4A0]" />
                    </div>
                  </div>
                ))}
              </div>
            </ReportCard>
          ) : null}

          {/* ⑤ 個人フィードバック */}
          {report.player_feedback?.length ? (
            <ReportCard num="⑤" title="個人フィードバック" icon={User} accent="#6C63FF">
              <div className="space-y-4">
                {report.player_feedback.map((player, i) => (
                  <div key={i} className="rounded-xl border border-border overflow-hidden">
                    {/* Player header */}
                    <div className="bg-gradient-to-r from-[#6C63FF]/20 to-transparent px-5 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#6C63FF]/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-[#6C63FF]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{player.name}</p>
                        <p className="text-[10px] text-[#6C63FF]">{player.role}</p>
                      </div>
                    </div>
                    {/* Columns */}
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <PlayerBlock label="評価" items={player.evaluation} icon={<CheckCircle2 className="w-3 h-3" />} color="#00D4A0" />
                      <PlayerBlock label="問題点" items={player.issues} icon={<AlertCircle className="w-3 h-3" />} color="#FF4655" />
                      <PlayerBlock label="原因" items={player.causes} icon={<AlertTriangle className="w-3 h-3" />} color="#FF8C42" />
                      <PlayerBlock label="改善策" items={player.improvements} icon={<Target className="w-3 h-3" />} color="#6C63FF" />
                      <PlayerBlock label="練習方法" items={player.practice} icon={<Zap className="w-3 h-3" />} color="#FFD700" />
                    </div>
                  </div>
                ))}
              </div>
            </ReportCard>
          ) : null}

          {/* ⑥ スタイルスコア */}
          {report.style_scores && (
            <ReportCard num="⑥" title="スタイルスコア" icon={BarChart2} accent="#FF8C42">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {([
                  { label: '攻撃性', key: 'aggression' },
                  { label: '構造性', key: 'structure' },
                  { label: '連携', key: 'teamwork' },
                  { label: '適応力', key: 'adaptability' },
                  { label: '情報管理', key: 'info_management' },
                ] as const).map(({ label, key }) => (
                  <ScoreCard key={key} label={label} value={report.style_scores![key]} />
                ))}
              </div>
            </ReportCard>
          )}

          {/* ⑦ 改善優先度 */}
          {report.improvement_priority?.length ? (
            <ReportCard num="⑦" title="改善優先度" icon={Target} accent="#FF4655">
              <div className="space-y-2.5">
                {report.improvement_priority.map((item, i) => {
                  const cfg = [
                    { medal: '🥇', bg: 'bg-[#FF4655]/10', border: 'border-[#FF4655]/30', num: 'bg-[#FF4655] text-white' },
                    { medal: '🥈', bg: 'bg-[#FF8C42]/10', border: 'border-[#FF8C42]/30', num: 'bg-[#FF8C42] text-white' },
                    { medal: '🥉', bg: 'bg-muted/20', border: 'border-border', num: 'bg-muted text-muted-foreground' },
                  ][i] ?? { medal: '', bg: 'bg-muted/10', border: 'border-border', num: 'bg-muted text-muted-foreground' }
                  return (
                    <div key={i} className={cn('flex items-center gap-3 p-4 rounded-xl border', cfg.bg, cfg.border)}>
                      <span className="text-xl flex-shrink-0">{cfg.medal}</span>
                      <p className="text-sm text-white font-medium leading-relaxed">{item}</p>
                    </div>
                  )
                })}
              </div>
            </ReportCard>
          ) : null}

          {/* ⑧ NG行動 */}
          {report.ng_actions?.length ? (
            <ReportCard num="⑧" title="NG行動" icon={XCircle} accent="#FF4655">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {report.ng_actions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 bg-[#FF4655]/5 border border-[#FF4655]/20 rounded-xl">
                    <XCircle className="w-4 h-4 text-[#FF4655] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{action}</p>
                  </div>
                ))}
              </div>
            </ReportCard>
          ) : null}

          {/* ⑨ 次の試合でやること */}
          {report.next_match_actions?.length ? (
            <ReportCard num="⑨" title="次の試合でやること" icon={Zap} accent="#00D4A0">
              <div className="space-y-2.5">
                {report.next_match_actions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-[#00D4A0]/5 border border-[#00D4A0]/20 rounded-xl">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#00D4A0]/20 flex items-center justify-center mt-0.5">
                      <span className="text-[10px] font-bold text-[#00D4A0]">{i + 1}</span>
                    </div>
                    <p className="text-sm text-white leading-relaxed">{action}</p>
                  </div>
                ))}
              </div>
            </ReportCard>
          ) : null}

          {/* ⑩ 総括 */}
          {report.summary && (
            <div className="relative overflow-hidden rounded-2xl border border-[#6C63FF]/30 bg-gradient-to-br from-[#6C63FF]/10 via-card to-card">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#6C63FF15,transparent_60%)]" />
              <div className="relative px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                    <span className="text-xs font-black text-[#6C63FF]">⑩</span>
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

function RoundRow({ icon, label, text, color }: { icon: string; label: string; text: string; color: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="flex-shrink-0 text-sm leading-none mt-0.5">{icon}</span>
      <span className={cn('font-semibold flex-shrink-0', color)}>{label}：</span>
      <span className="text-muted-foreground leading-relaxed">{text}</span>
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

function ScoreCard({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(10, value))
  const pct = v * 10
  const color = pct >= 70 ? '#00D4A0' : pct >= 50 ? '#FFD700' : '#FF4655'
  const ring = pct >= 70 ? 'border-[#00D4A0]/40' : pct >= 50 ? 'border-[#FFD700]/40' : 'border-[#FF4655]/40'
  return (
    <div className={cn('rounded-xl border bg-card p-4 text-center', ring)}>
      <p className="text-[10px] text-muted-foreground font-medium mb-3">{label}</p>
      <p className="text-3xl font-black leading-none" style={{ color }}>{v}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">/10</p>
      <div className="mt-3 h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
