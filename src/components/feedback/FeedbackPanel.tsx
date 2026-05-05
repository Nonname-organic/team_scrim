'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bot, User, AlertCircle, Zap, Loader2, Plus, X, Trash2, Lock,
  Target, Shield, Users, TrendingUp, Flag, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlan } from '@/contexts/PlanContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TacticalIssue {
  issue: string
  impact: string
  priority: 'high' | 'mid' | 'low'
}

interface TacticalAnalysis {
  round_evaluation: string
  win_factor: string
  good_points: string[]
  issues: TacticalIssue[]
  root_causes: string[]
  improvements: { team: string[]; individual: string[] }
  rules: string[]
  pattern_flags: string[]
  score: { macro: number; micro: number; teamplay: number; overall: number }
}

interface FeedbackData {
  id: string
  type: 'ai' | 'coach'
  summary: string | null
  strengths: string[]
  weaknesses: string[]
  action_items: string[]
  style_tag: 'aggressive' | 'control' | 'default' | 'mixed' | null
  model_used: string | null
  created_at: string
  raw_response?: string | null
  // parsed from raw_response if new format
  tactical?: TacticalAnalysis
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTactical(raw: string | null | undefined): TacticalAnalysis | null {
  if (!raw) return null
  try {
    const fenced = raw.match(/```json\r?\n([\s\S]*?)\r?\n```/)
    const json = fenced ? JSON.parse(fenced[1]) : JSON.parse(raw)
    if (json.round_evaluation) return json as TacticalAnalysis
  } catch {}
  return null
}

const PRIORITY_CFG = {
  high: { label: 'HIGH', color: '#FF4655' },
  mid:  { label: 'MID',  color: '#FF8C42' },
  low:  { label: 'LOW',  color: '#9B9BA4' },
}

const STYLE_CFG: Record<string, { label: string; color: string }> = {
  aggressive: { label: '積極型',       color: '#FF4655' },
  control:    { label: '安定型',       color: '#00D4A0' },
  mixed:      { label: 'バランス型',   color: '#6C63FF' },
  default:    { label: 'スタンダード', color: '#9B9BA4' },
}

const STYLE_OPTS = [
  { value: 'aggressive', label: '積極型',       color: '#FF4655' },
  { value: 'control',    label: '安定型',       color: '#00D4A0' },
  { value: 'mixed',      label: 'バランス型',   color: '#6C63FF' },
  { value: 'default',    label: 'スタンダード', color: '#9B9BA4' },
]

// ── Score Bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? '#00D4A0' : value >= 45 ? '#FF8C42' : '#FF4655'
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[11px] font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ── New Tactical Card ─────────────────────────────────────────────────────────

function TacticalCard({
  feedback,
  tactical,
}: {
  feedback: FeedbackData
  tactical: TacticalAnalysis
}) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(feedback.created_at).toLocaleDateString('ja-JP', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="border border-[#6C63FF]/30 bg-[#6C63FF]/5 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#6C63FF]/20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#6C63FF]/20 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-[#6C63FF]" />
          </div>
          <span className="text-xs font-semibold text-white">AI 戦術分析</span>
          <span className="text-[10px] text-muted-foreground">{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black" style={{
            color: tactical.score.overall >= 70 ? '#00D4A0' : tactical.score.overall >= 45 ? '#FF8C42' : '#FF4655'
          }}>
            {tactical.score.overall}
          </span>
          <span className="text-[10px] text-muted-foreground">/ 100</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Evaluation + Win Factor */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-[#6C63FF]/40 pl-3">
            {tactical.round_evaluation}
          </p>
          <div className="flex items-start gap-2 bg-muted/20 rounded-lg px-3 py-2">
            <Target className="w-3.5 h-3.5 text-[#FFD700] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#FFD700] font-medium leading-relaxed">
              {tactical.win_factor}
            </p>
          </div>
        </div>

        {/* Score bars */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 bg-muted/10 rounded-xl p-3">
          <ScoreBar label="マクロ"     value={tactical.score.macro} />
          <ScoreBar label="ミクロ"     value={tactical.score.micro} />
          <ScoreBar label="チームプレイ" value={tactical.score.teamplay} />
          <ScoreBar label="総合"       value={tactical.score.overall} />
        </div>

        {/* Good points + Issues side by side */}
        <div className="grid grid-cols-2 gap-3">
          {/* Good points */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-[#00D4A0] uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3" /> 良かった点
            </div>
            <ul className="space-y-1.5">
              {tactical.good_points.map((pt, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                  <span className="text-[#00D4A0] shrink-0 mt-px">•</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Issues */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-[#FF4655] uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> 課題
            </div>
            <ul className="space-y-2">
              {tactical.issues.map((iss, i) => {
                const cfg = PRIORITY_CFG[iss.priority] ?? PRIORITY_CFG.mid
                return (
                  <li key={i} className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[9px] font-black px-1.5 py-px rounded"
                        style={{ color: cfg.color, background: `${cfg.color}20` }}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-[11px] text-white font-medium">{iss.issue}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground pl-8 leading-relaxed">{iss.impact}</p>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* Expandable: root causes, improvements, rules, pattern flags */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-white transition-colors py-1"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? '折りたたむ' : '根本原因・改善策・ルールを表示'}
        </button>

        {expanded && (
          <div className="space-y-4 border-t border-border/40 pt-4">
            {/* Root causes */}
            {tactical.root_causes.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-[#FF8C42] uppercase tracking-wider">根本原因</div>
                <ul className="space-y-1">
                  {tactical.root_causes.map((rc, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                      <span className="text-[#FF8C42] shrink-0 mt-px font-bold">{i + 1}.</span>
                      <span>{rc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            <div className="grid grid-cols-2 gap-3">
              {tactical.improvements.team.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3 h-3" /> チーム改善
                  </div>
                  <ul className="space-y-1">
                    {tactical.improvements.team.map((a, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                        <span className="text-[#6C63FF] font-bold shrink-0 mt-px">{i + 1}.</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tactical.improvements.individual.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3" /> 個人改善
                  </div>
                  <ul className="space-y-1">
                    {tactical.improvements.individual.map((a, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                        <span className="text-[#3B82F6] font-bold shrink-0 mt-px">{i + 1}.</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Rules */}
            {tactical.rules.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-[#FFD700] uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> チームルール
                </div>
                <ul className="space-y-1">
                  {tactical.rules.map((r, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5 bg-[#FFD700]/5 rounded px-2 py-1">
                      <span className="text-[#FFD700] shrink-0 font-bold">›</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pattern flags */}
            {tactical.pattern_flags.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-[#FF4655] uppercase tracking-wider flex items-center gap-1">
                  <Flag className="w-3 h-3" /> パターンフラグ
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tactical.pattern_flags.map((pf, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-[#FF4655] border border-[#FF4655]/30 bg-[#FF4655]/5 rounded-full px-2 py-0.5"
                    >
                      {pf}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Legacy Card (coach memo or old AI format) ─────────────────────────────────

function LegacyCard({
  feedback,
  onDelete,
}: {
  feedback: FeedbackData
  onDelete?: (id: string) => void
}) {
  const isAI = feedback.type === 'ai'
  const date = new Date(feedback.created_at).toLocaleDateString('ja-JP', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className={cn(
      'p-4 rounded-xl border space-y-3',
      isAI ? 'border-[#6C63FF]/30 bg-[#6C63FF]/5' : 'border-border bg-muted/10'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0', isAI ? 'bg-[#6C63FF]/20' : 'bg-muted')}>
            {isAI ? <Bot className="w-3.5 h-3.5 text-[#6C63FF]" /> : <User className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
          <span className="text-xs font-semibold text-white">{isAI ? 'AI分析' : 'コーチメモ'}</span>
          {feedback.style_tag && (() => {
            const cfg = STYLE_CFG[feedback.style_tag] ?? { label: feedback.style_tag, color: '#9B9BA4' }
            return (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: `${cfg.color}20` }}>
                {cfg.label}
              </span>
            )
          })()}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{date}</span>
          {!isAI && onDelete && (
            <button onClick={() => onDelete(feedback.id)} className="text-muted-foreground hover:text-[#FF4655] transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {feedback.summary && (
        <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
          {feedback.summary}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {feedback.strengths.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-[#00D4A0] uppercase tracking-wider">✓ 良かった点</div>
            <ul className="space-y-1">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                  <span className="text-[#00D4A0] shrink-0 mt-px">•</span><span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {feedback.weaknesses.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-[#FF4655] uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> 課題
            </div>
            <ul className="space-y-1">
              {feedback.weaknesses.map((w, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                  <span className="text-[#FF4655] shrink-0 mt-px">•</span><span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {feedback.action_items.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-[#FF8C42] uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3" /> 改善アクション
            </div>
            <ul className="space-y-1">
              {feedback.action_items.map((a, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                  <span className="text-[#FF8C42] font-bold shrink-0 mt-px">{i + 1}.</span><span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Coach Form ────────────────────────────────────────────────────────────────

function CoachForm({
  matchId, onSaved, onCancel,
}: { matchId: string; onSaved: () => void; onCancel: () => void }) {
  const [summary, setSummary]       = useState('')
  const [strengths, setStrengths]   = useState('')
  const [weaknesses, setWeaknesses] = useState('')
  const [actions, setActions]       = useState('')
  const [styleTag, setStyleTag]     = useState('')
  const [saving, setSaving]         = useState(false)

  const textCls = 'w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs text-white placeholder-muted-foreground focus:border-[#FF4655] outline-none resize-none'

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/feedback/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: matchId,
          summary: summary.trim() || null,
          strengths:    strengths.split('\n').map(s => s.trim()).filter(Boolean),
          weaknesses:   weaknesses.split('\n').map(s => s.trim()).filter(Boolean),
          action_items: actions.split('\n').map(s => s.trim()).filter(Boolean),
          style_tag: styleTag || null,
        }),
      })
      onSaved()
      onCancel()
    } finally { setSaving(false) }
  }

  return (
    <div className="p-4 bg-muted/10 border border-border rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white">コーチメモを追加</span>
        <button onClick={onCancel} className="text-muted-foreground hover:text-white transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">総括</label>
        <textarea rows={2} value={summary} onChange={e => setSummary(e.target.value)}
          placeholder="試合全体の印象・総評を入力" className={textCls} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: '良かった点', color: '#00D4A0', value: strengths, set: setStrengths, placeholder: '1行1項目\n例：Bサイトの守り' },
          { label: '課題', color: '#FF4655', value: weaknesses, set: setWeaknesses, placeholder: '1行1項目\n例：エコラウンドの管理' },
          { label: '改善アクション', color: '#FF8C42', value: actions, set: setActions, placeholder: '1行1項目\n例：フォースの基準を決める' },
        ].map(({ label, color, value, set, placeholder }) => (
          <div key={label} className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</label>
            <textarea rows={5} value={value} onChange={e => set(e.target.value)}
              placeholder={placeholder} className={textCls} />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">プレイスタイル診断</label>
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTS.map(o => (
            <button key={o.value} onClick={() => setStyleTag(styleTag === o.value ? '' : o.value)}
              className="text-xs px-3 py-1 rounded-full border font-medium transition-colors"
              style={styleTag === o.value
                ? { color: o.color, borderColor: o.color, backgroundColor: `${o.color}20` }
                : { color: '#9B9BA4', borderColor: '#2A2A3A' }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-white border border-border rounded-lg px-3 py-1.5 transition-colors">
          キャンセル
        </button>
        <button onClick={save} disabled={saving}
          className="text-xs bg-[#FF4655] hover:bg-[#FF4655]/80 text-white rounded-lg px-4 py-1.5 transition-colors disabled:opacity-50">
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function MatchFeedbackPanel({ matchId }: { matchId: string }) {
  const { canUseAI, aiUsageCount, aiUsageLimit, showUpgrade } = usePlan()
  const [feedbacks, setFeedbacks]         = useState<FeedbackData[]>([])
  const [loading, setLoading]             = useState(true)
  const [aiLoading, setAiLoading]         = useState(false)
  const [aiError, setAiError]             = useState<string | null>(null)
  const [showCoachForm, setShowCoachForm] = useState(false)

  const fetchFeedbacks = useCallback(async () => {
    try {
      const res  = await fetch(`/api/feedback?matchId=${matchId}`)
      const json = await res.json()
      const rows = (json.data ?? []).map((f: Record<string, unknown>) => {
        const base: FeedbackData = {
          ...f as unknown as FeedbackData,
          strengths:    Array.isArray(f.strengths)    ? f.strengths    as string[] : JSON.parse(String(f.strengths    ?? '[]')),
          weaknesses:   Array.isArray(f.weaknesses)   ? f.weaknesses   as string[] : JSON.parse(String(f.weaknesses   ?? '[]')),
          action_items: Array.isArray(f.action_items) ? f.action_items as string[] : JSON.parse(String(f.action_items ?? '[]')),
        }
        if (f.type === 'ai') {
          base.tactical = parseTactical(f.raw_response as string | null) ?? undefined
        }
        return base
      })
      setFeedbacks(rows)
    } finally { setLoading(false) }
  }, [matchId])

  useEffect(() => { fetchFeedbacks() }, [fetchFeedbacks])

  const runAI = async () => {
    if (!canUseAI) {
      const prev = feedbacks.find(f => f.type === 'ai')
      showUpgrade({
        feature: 'ai_limit',
        title: 'AI分析の上限に達しました',
        message: `今月のAI使用回数（${aiUsageLimit}回）を使い切りました。Proプランで月20回、Teamプランで無制限にご利用いただけます。`,
        preview: prev?.tactical?.pattern_flags?.slice(0, 2) ?? prev?.weaknesses?.slice(0, 2),
      })
      return
    }
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/feedback/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId }),
      })
      if (!res.ok) { setAiError((await res.json()).error ?? 'AI分析に失敗しました'); return }
      await fetchFeedbacks()
    } finally { setAiLoading(false) }
  }

  const deleteFeedback = async (id: string) => {
    await fetch(`/api/feedback/coach?id=${id}`, { method: 'DELETE' })
    await fetchFeedbacks()
  }

  const aiFeedbacks    = feedbacks.filter(f => f.type === 'ai')
  const coachFeedbacks = feedbacks.filter(f => f.type === 'coach')

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">試合フィードバック</span>
          {feedbacks.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">{feedbacks.length}件</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCoachForm(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors',
              showCoachForm ? 'bg-white/10 text-white border-white/30' : 'text-muted-foreground hover:text-white border-border hover:border-white/30'
            )}
          >
            <Plus className="w-3 h-3" /> コーチメモ
          </button>
          <button
            onClick={runAI}
            disabled={aiLoading}
            title={!canUseAI ? `AI使用上限 (${aiUsageCount}/${aiUsageLimit}回) に達しました` : undefined}
            className={cn(
              'flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50',
              canUseAI
                ? 'bg-[#6C63FF]/20 hover:bg-[#6C63FF]/30 text-[#6C63FF] border-[#6C63FF]/30'
                : 'bg-[#FF4655]/10 hover:bg-[#FF4655]/20 text-[#FF4655] border-[#FF4655]/20'
            )}
          >
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : canUseAI ? <Bot className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            AI分析{!canUseAI && ` (${aiUsageCount}/${aiUsageLimit})`}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {loading && <div className="text-center py-6 text-muted-foreground text-xs">読み込み中...</div>}

        {!loading && aiError && (
          <div className="text-xs text-[#FF4655] bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg px-3 py-2">{aiError}</div>
        )}

        {showCoachForm && (
          <CoachForm matchId={matchId} onSaved={fetchFeedbacks} onCancel={() => setShowCoachForm(false)} />
        )}

        {!loading && feedbacks.length === 0 && !showCoachForm && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            フィードバックがありません。AI分析またはコーチメモを追加してください。
          </div>
        )}

        {aiFeedbacks.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">AI分析</div>
            {aiFeedbacks.map(f =>
              f.tactical
                ? <TacticalCard key={f.id} feedback={f} tactical={f.tactical} />
                : <LegacyCard   key={f.id} feedback={f} />
            )}
          </div>
        )}

        {coachFeedbacks.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">コーチメモ</div>
            {coachFeedbacks.map(f => <LegacyCard key={f.id} feedback={f} onDelete={deleteFeedback} />)}
          </div>
        )}
      </div>
    </div>
  )
}
