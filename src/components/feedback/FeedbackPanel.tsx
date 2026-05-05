'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bot, User, AlertCircle, Zap, Loader2, Plus, X, Trash2, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlan } from '@/contexts/PlanContext'

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

function StyleBadge({ tag }: { tag: string | null }) {
  if (!tag) return null
  const cfg = STYLE_CFG[tag] ?? { label: tag, color: '#9B9BA4' }
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: `${cfg.color}20` }}
    >
      {cfg.label}
    </span>
  )
}

function FeedbackCard({
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
            isAI ? 'bg-[#6C63FF]/20' : 'bg-muted'
          )}>
            {isAI
              ? <Bot className="w-3.5 h-3.5 text-[#6C63FF]" />
              : <User className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
          <span className="text-xs font-semibold text-white">{isAI ? 'AI分析' : 'コーチメモ'}</span>
          <StyleBadge tag={feedback.style_tag} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{date}</span>
          {!isAI && onDelete && (
            <button
              onClick={() => onDelete(feedback.id)}
              className="text-muted-foreground hover:text-[#FF4655] transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      {feedback.summary && (
        <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
          {feedback.summary}
        </p>
      )}

      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {feedback.strengths.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-[#00D4A0] uppercase tracking-wider">
              ✓ 良かった点
            </div>
            <ul className="space-y-1">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                  <span className="text-[#00D4A0] shrink-0 mt-px">•</span>
                  <span>{s}</span>
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
                  <span className="text-[#FF4655] shrink-0 mt-px">•</span>
                  <span>{w}</span>
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
                  <span className="text-[#FF8C42] font-bold shrink-0 mt-px">{i + 1}.</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function CoachForm({
  matchId,
  onSaved,
  onCancel,
}: {
  matchId: string
  onSaved: () => void
  onCancel: () => void
}) {
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
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 bg-muted/10 border border-border rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white">コーチメモを追加</span>
        <button onClick={onCancel} className="text-muted-foreground hover:text-white transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Summary */}
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          総括
        </label>
        <textarea
          rows={2}
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="試合全体の印象・総評を入力"
          className={textCls}
        />
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] text-[#00D4A0] font-bold uppercase tracking-wider">
            良かった点
          </label>
          <textarea
            rows={5}
            value={strengths}
            onChange={e => setStrengths(e.target.value)}
            placeholder={'1行1項目\n例：Bサイトの守り\n例：ピストル勝率'}
            className={textCls}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-[#FF4655] font-bold uppercase tracking-wider">
            課題
          </label>
          <textarea
            rows={5}
            value={weaknesses}
            onChange={e => setWeaknesses(e.target.value)}
            placeholder={'1行1項目\n例：エコラウンドの管理\n例：リテイクの連携'}
            className={textCls}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-[#FF8C42] font-bold uppercase tracking-wider">
            改善アクション
          </label>
          <textarea
            rows={5}
            value={actions}
            onChange={e => setActions(e.target.value)}
            placeholder={'1行1項目\n例：フォースの基準を決める\n例：リテイクのタイミング確認'}
            className={textCls}
          />
        </div>
      </div>

      {/* Style tag selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          プレイスタイル診断
        </label>
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTS.map(o => (
            <button
              key={o.value}
              onClick={() => setStyleTag(styleTag === o.value ? '' : o.value)}
              className="text-xs px-3 py-1 rounded-full border font-medium transition-colors"
              style={styleTag === o.value
                ? { color: o.color, borderColor: o.color, backgroundColor: `${o.color}20` }
                : { color: '#9B9BA4', borderColor: '#2A2A3A', backgroundColor: 'transparent' }
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-white border border-border rounded-lg px-3 py-1.5 transition-colors"
        >
          キャンセル
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="text-xs bg-[#FF4655] hover:bg-[#FF4655]/80 text-white rounded-lg px-4 py-1.5 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}

export function MatchFeedbackPanel({ matchId }: { matchId: string }) {
  const { canUseAI, aiUsageCount, aiUsageLimit, showUpgrade } = usePlan()
  const [feedbacks, setFeedbacks]     = useState<FeedbackData[]>([])
  const [loading, setLoading]         = useState(true)
  const [aiLoading, setAiLoading]     = useState(false)
  const [aiError, setAiError]         = useState<string | null>(null)
  const [showCoachForm, setShowCoachForm] = useState(false)

  const fetchFeedbacks = useCallback(async () => {
    try {
      const res  = await fetch(`/api/feedback?matchId=${matchId}`)
      const json = await res.json()
      // Parse JSONB arrays that may come as strings from DB
      const rows = (json.data ?? []).map((f: Record<string, unknown>) => ({
        ...f,
        strengths:    Array.isArray(f.strengths)    ? f.strengths    : JSON.parse(String(f.strengths    ?? '[]')),
        weaknesses:   Array.isArray(f.weaknesses)   ? f.weaknesses   : JSON.parse(String(f.weaknesses   ?? '[]')),
        action_items: Array.isArray(f.action_items) ? f.action_items : JSON.parse(String(f.action_items ?? '[]')),
      }))
      setFeedbacks(rows)
    } finally {
      setLoading(false)
    }
  }, [matchId])

  useEffect(() => { fetchFeedbacks() }, [fetchFeedbacks])

  const runAI = async () => {
    // プラン制限チェック
    if (!canUseAI) {
      const aiFeedbacks = feedbacks.filter(f => f.type === 'ai')
      const weaknesses  = aiFeedbacks[0]?.weaknesses?.slice(0, 2) ?? []
      showUpgrade({
        feature: 'ai_limit',
        title: 'AI分析の上限に達しました',
        message: `今月のAI使用回数（${aiUsageLimit}回）を使い切りました。Proプランで月20回、Teamプランで無制限にご利用いただけます。`,
        preview: weaknesses.length > 0 ? weaknesses : undefined,
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
      if (!res.ok) {
        const json = await res.json()
        setAiError(json.error ?? 'AI分析に失敗しました')
        return
      }
      await fetchFeedbacks()
    } finally {
      setAiLoading(false)
    }
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
            <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {feedbacks.length}件
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCoachForm(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors',
              showCoachForm
                ? 'bg-white/10 text-white border-white/30'
                : 'text-muted-foreground hover:text-white border-border hover:border-white/30'
            )}
          >
            <Plus className="w-3 h-3" />
            コーチメモ
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
            {aiLoading
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : canUseAI
              ? <Bot className="w-3 h-3" />
              : <Lock className="w-3 h-3" />}
            AI分析{!canUseAI && ` (${aiUsageCount}/${aiUsageLimit})`}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {loading && (
          <div className="text-center py-6 text-muted-foreground text-xs">読み込み中...</div>
        )}

        {!loading && aiError && (
          <div className="text-xs text-[#FF4655] bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg px-3 py-2">
            {aiError}
          </div>
        )}

        {showCoachForm && (
          <CoachForm
            matchId={matchId}
            onSaved={fetchFeedbacks}
            onCancel={() => setShowCoachForm(false)}
          />
        )}

        {!loading && feedbacks.length === 0 && !showCoachForm && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            フィードバックがありません。AI分析またはコーチメモを追加してください。
          </div>
        )}

        {/* AI feedback section */}
        {aiFeedbacks.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              AI分析
            </div>
            {aiFeedbacks.map(f => (
              <FeedbackCard key={f.id} feedback={f} />
            ))}
          </div>
        )}

        {/* Coach feedback section */}
        {coachFeedbacks.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              コーチメモ
            </div>
            {coachFeedbacks.map(f => (
              <FeedbackCard key={f.id} feedback={f} onDelete={deleteFeedback} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
