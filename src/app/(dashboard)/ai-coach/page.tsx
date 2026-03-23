'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  Bot, AlertTriangle, TrendingUp, Lightbulb, Loader2,
  ChevronDown, ChevronUp, Shield, Swords, Users, Map,
  BookOpen, Video, CheckSquare, Square, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? ''

// ── Types ────────────────────────────────────────────────────
interface MatchSummary {
  id: string
  match_date: string
  opponent_name: string
  map: string
  result: 'win' | 'loss' | 'draw'
  team_score: number
  opponent_score: number
}

interface GoodPoint { title: string; description: string; evidence: string }
interface Improvement { issue: string; action: string; priority: 'immediate' | 'this_week' | 'next_month'; drill?: string }
interface VsComposition { comp_type: string; characteristics: string; our_weakness: string; counter_strategy: string; key_agents: string[]; map_specific?: string }
interface OwnCompositionStrategy { composition: string[]; style: string; attack_strategy: string; defense_strategy: string; win_condition: string; suitable_maps: string[]; notes?: string }
interface MacroStrategy { attack_macro: string; defense_macro: string; economy_management: string; key_timings: string[]; common_mistakes: string[] }
interface ProTeam { team: string; region: string; reason: string; style: string; what_to_learn: string }
interface ReferenceContent { type: string; title: string; creator_or_channel: string; focus: string; search_query: string }

interface Report {
  good_points?: GoodPoint[]
  improvements?: Improvement[]
  vs_compositions?: VsComposition[]
  own_composition_strategy?: OwnCompositionStrategy[]
  macro_strategy?: MacroStrategy
  reference_pro_teams?: ProTeam[]
  reference_content?: ReferenceContent[]
  executive_summary?: string
  raw_analysis?: string
}

// ── Configs ───────────────────────────────────────────────────
const PRIORITY = {
  immediate:  { label: '今すぐ',   color: '#FF4655' },
  this_week:  { label: '今週中',   color: '#FF8C42' },
  next_month: { label: '来月',     color: '#9B9BA4' },
} as const

// ── Main Page ─────────────────────────────────────────────────
export default function AICoachPage() {
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [mapFilter, setMapFilter] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    fetch(`/api/matches?team_id=${TEAM_ID}&limit=50`)
      .then(r => r.json())
      .then(j => setMatches(j.data ?? []))
      .catch(() => {})
  }, [])

  const allMaps = useMemo(
    () => [...new Set(matches.map(m => m.map).filter(Boolean))].sort(),
    [matches]
  )

  const filteredMatches = useMemo(
    () => mapFilter ? matches.filter(m => m.map === mapFilter) : matches,
    [matches, mapFilter]
  )

  function toggleMatch(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === filteredMatches.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredMatches.map(m => m.id)))
    }
  }

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: TEAM_ID,
          match_ids: selectedIds.size > 0 ? [...selectedIds] : undefined,
          map_filter: mapFilter || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Analysis failed')
      setReport(json.data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const analysisLabel = selectedIds.size > 0
    ? `${selectedIds.size}試合を分析`
    : mapFilter
    ? `${mapFilter}マップ全試合を分析`
    : '全データを分析'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#FF4655]" /> AIコーチ
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            試合・マップを選択してAIにコーチングレポートを生成させる
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all whitespace-nowrap',
            loading ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-[#FF4655] hover:bg-[#e03e4d] text-white'
          )}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />分析中...</>
            : <><Bot className="w-4 h-4" />{analysisLabel}</>}
        </button>
      </div>

      {/* Filters + match list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-white">分析対象の選択</span>
          <span className="text-xs text-muted-foreground">未選択の場合は全データを分析</span>
        </div>
        <div className="p-4 space-y-4">
          {/* Map filter */}
          <div className="flex items-center gap-3">
            <Map className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <label className="text-xs text-muted-foreground w-16 flex-shrink-0">マップ絞込</label>
            <select
              value={mapFilter}
              onChange={e => { setMapFilter(e.target.value); setSelectedIds(new Set()) }}
              className="bg-muted border border-border rounded px-2 py-1 text-xs text-white focus:border-[#FF4655] outline-none"
            >
              <option value="">すべてのマップ</option>
              {allMaps.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Match list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                試合選択 ({selectedIds.size}/{filteredMatches.length})
              </span>
              <button
                onClick={toggleAll}
                className="text-xs text-[#FF4655] hover:underline"
              >
                {selectedIds.size === filteredMatches.length && filteredMatches.length > 0 ? '全解除' : '全選択'}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {filteredMatches.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center">試合データがありません</div>
              ) : filteredMatches.map(m => {
                const checked = selectedIds.has(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMatch(m.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors',
                      checked ? 'bg-[#FF4655]/10 border border-[#FF4655]/30' : 'hover:bg-muted/30 border border-transparent'
                    )}
                  >
                    {checked
                      ? <CheckSquare className="w-3.5 h-3.5 text-[#FF4655] flex-shrink-0" />
                      : <Square className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0',
                      m.result === 'win' ? 'bg-[#00D4A0]/15 text-[#00D4A0]' : 'bg-[#FF4655]/15 text-[#FF4655]'
                    )}>
                      {m.result === 'win' ? 'W' : 'L'}
                    </span>
                    <span className="text-xs text-white flex-1 min-w-0 truncate">
                      vs {m.opponent_name || '不明'}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{m.map}</span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {m.team_score}-{m.opponent_score}
                    </span>
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
          <div>
            <p className="text-sm font-semibold text-[#FF4655]">エラー</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Loader2 className="w-10 h-10 text-[#FF4655] animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold">AIが分析中...</p>
          <p className="text-muted-foreground text-xs mt-2">30〜60秒ほどかかる場合があります</p>
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && !error && (
        <div className="bg-card rounded-xl p-12 border border-border text-center">
          <Bot className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-white font-semibold">分析を開始してください</h3>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
            対象の試合やマップを選択（任意）してから「分析実行」ボタンをクリック
          </p>
        </div>
      )}

      {/* Report */}
      {report && !loading && (
        <div className="space-y-5">

          {/* Executive Summary */}
          {report.executive_summary && (
            <div className="bg-[#FF4655]/5 border border-[#FF4655]/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-[#FF4655]" />
                <span className="text-sm font-semibold text-white">コーチ総括</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{report.executive_summary}</p>
            </div>
          )}

          {/* Good Points */}
          {report.good_points?.length ? (
            <Section title="良い点" icon={TrendingUp} iconColor="#00D4A0">
              <div className="space-y-3">
                {report.good_points.map((g, i) => (
                  <div key={i} className="bg-[#00D4A0]/5 border border-[#00D4A0]/20 rounded-lg p-4">
                    <div className="text-sm font-semibold text-white mb-1">{g.title}</div>
                    <p className="text-xs text-muted-foreground mb-2">{g.description}</p>
                    <p className="text-[10px] text-[#00D4A0]/80 italic">{g.evidence}</p>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Improvements */}
          {report.improvements?.length ? (
            <Section title="改善点" icon={Lightbulb} iconColor="#FFD700">
              <div className="space-y-2">
                {report.improvements.map((imp, i) => {
                  const p = PRIORITY[imp.priority] ?? PRIORITY.this_week
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded flex-shrink-0 mt-0.5"
                        style={{ background: `${p.color}20`, color: p.color }}
                      >
                        {p.label}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-white">{imp.issue}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{imp.action}</p>
                        {imp.drill && (
                          <p className="text-[10px] text-[#6C63FF] mt-1">練習: {imp.drill}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          ) : null}

          {/* VS Compositions */}
          {report.vs_compositions?.length ? (
            <Section title="相手構成への対策" icon={Swords} iconColor="#FF8C42">
              <div className="space-y-4">
                {report.vs_compositions.map((vs, i) => (
                  <div key={i} className="border border-border rounded-xl overflow-hidden">
                    <div className="bg-[#FF8C42]/10 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{vs.comp_type}</span>
                      {vs.key_agents?.length > 0 && (
                        <div className="flex gap-1 flex-wrap justify-end">
                          {vs.key_agents.map((a, j) => (
                            <span key={j} className="text-[10px] bg-[#FF8C42]/20 text-[#FF8C42] px-1.5 py-0.5 rounded">{a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-2 text-xs">
                      <p className="text-muted-foreground"><span className="text-white font-medium">特徴: </span>{vs.characteristics}</p>
                      <p className="text-muted-foreground"><span className="text-[#FF4655] font-medium">弱点: </span>{vs.our_weakness}</p>
                      <p className="text-muted-foreground"><span className="text-[#00D4A0] font-medium">対策: </span>{vs.counter_strategy}</p>
                      {vs.map_specific && (
                        <p className="text-muted-foreground"><span className="text-[#6C63FF] font-medium">マップ補足: </span>{vs.map_specific}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Own Composition Strategy */}
          {report.own_composition_strategy?.length ? (
            <Section title="自チーム推奨構成" icon={Users} iconColor="#6C63FF">
              <div className="space-y-4">
                {report.own_composition_strategy.map((comp, i) => (
                  <div key={i} className="border border-border rounded-xl overflow-hidden">
                    <div className="bg-[#6C63FF]/10 px-4 py-2.5 flex items-center gap-3 flex-wrap">
                      {comp.composition?.map((agent, j) => (
                        <span key={j} className="text-[10px] bg-[#6C63FF]/20 text-[#6C63FF] px-2 py-1 rounded font-medium">{agent}</span>
                      ))}
                    </div>
                    <div className="p-4 space-y-2 text-xs">
                      <p className="text-muted-foreground"><span className="text-white font-medium">スタイル: </span>{comp.style}</p>
                      <p className="text-muted-foreground"><span className="text-[#FF8C42] font-medium">攻め: </span>{comp.attack_strategy}</p>
                      <p className="text-muted-foreground"><span className="text-[#00D4A0] font-medium">守り: </span>{comp.defense_strategy}</p>
                      <p className="text-muted-foreground"><span className="text-[#FFD700] font-medium">勝ち筋: </span>{comp.win_condition}</p>
                      {comp.suitable_maps?.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium">適したマップ:</span>
                          {comp.suitable_maps.map((m, j) => (
                            <span key={j} className="text-[10px] bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded">{m}</span>
                          ))}
                        </div>
                      )}
                      {comp.notes && <p className="text-muted-foreground/70 italic">{comp.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Macro Strategy */}
          {report.macro_strategy && (
            <Section title="マクロ戦略" icon={Map} iconColor="#00D4A0">
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#FF8C42]/5 border border-[#FF8C42]/20 rounded-lg p-3">
                    <div className="text-[#FF8C42] font-semibold mb-1.5">攻め時</div>
                    <p className="text-muted-foreground">{report.macro_strategy.attack_macro}</p>
                  </div>
                  <div className="bg-[#00D4A0]/5 border border-[#00D4A0]/20 rounded-lg p-3">
                    <div className="text-[#00D4A0] font-semibold mb-1.5">守り時</div>
                    <p className="text-muted-foreground">{report.macro_strategy.defense_macro}</p>
                  </div>
                </div>
                <div className="bg-muted/20 rounded-lg p-3">
                  <div className="text-[#FFD700] font-semibold mb-1.5">エコノミー管理</div>
                  <p className="text-muted-foreground">{report.macro_strategy.economy_management}</p>
                </div>
                {report.macro_strategy.key_timings?.length > 0 && (
                  <div>
                    <div className="text-white font-semibold mb-2">重要なタイミング</div>
                    <ul className="space-y-1">
                      {report.macro_strategy.key_timings.map((t, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                          <span className="text-[#6C63FF] mt-0.5 flex-shrink-0">→</span>{t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.macro_strategy.common_mistakes?.length > 0 && (
                  <div>
                    <div className="text-white font-semibold mb-2">よくあるマクロミス</div>
                    <ul className="space-y-1">
                      {report.macro_strategy.common_mistakes.map((m, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                          <span className="text-[#FF4655] mt-0.5 flex-shrink-0">!</span>{m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Reference Pro Teams */}
          {report.reference_pro_teams?.length ? (
            <Section title="参考プロチーム" icon={Star} iconColor="#FFD700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.reference_pro_teams.map((t, i) => (
                  <div key={i} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">{t.team}</span>
                      <span className="text-[10px] bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded">{t.region}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1"><span className="text-[#FFD700]">推薦理由: </span>{t.reason}</p>
                    <p className="text-xs text-muted-foreground mb-1"><span className="text-white">スタイル: </span>{t.style}</p>
                    <p className="text-xs text-[#00D4A0]">学ぶべき点: {t.what_to_learn}</p>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Reference Content */}
          {report.reference_content?.length ? (
            <Section title="参考動画・コンテンツ" icon={Video} iconColor="#6C63FF">
              <div className="space-y-2">
                {report.reference_content.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                    <div className="flex-shrink-0 mt-0.5">
                      {c.type === 'youtube' || c.type === 'video'
                        ? <Video className="w-3.5 h-3.5 text-[#FF4655]" />
                        : <BookOpen className="w-3.5 h-3.5 text-[#6C63FF]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white">{c.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{c.creator_or_channel}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{c.focus}</div>
                      {c.search_query && (
                        <div className="text-[10px] text-[#6C63FF] mt-1">
                          検索: 「{c.search_query}」
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Raw Analysis toggle */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setShowRaw(v => !v)}
              className="w-full flex items-center justify-between p-4 text-sm text-muted-foreground hover:text-white transition-colors"
            >
              <span>生の分析テキスト</span>
              {showRaw ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showRaw && (
              <pre className="p-4 text-xs text-muted-foreground whitespace-pre-wrap border-t border-border overflow-auto max-h-96">
                {report.raw_analysis}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({
  title, icon: Icon, iconColor, children,
}: {
  title: string
  icon: React.ElementType
  iconColor: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
        <h2 className="font-semibold text-white text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
