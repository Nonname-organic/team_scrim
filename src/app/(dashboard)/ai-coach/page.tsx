'use client'
import { useState } from 'react'
import { Bot, AlertTriangle, TrendingUp, Lightbulb, User, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LossReason, WinPattern, Improvement, PlayerFeedback } from '@/types'

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? 'YOUR_TEAM_UUID'

const SEVERITY_CONFIG = {
  critical: { color: '#FF4655', bg: 'bg-[#FF4655]/10', border: 'border-[#FF4655]/30', label: '緊急' },
  high:     { color: '#FF8C42', bg: 'bg-[#FF8C42]/10', border: 'border-[#FF8C42]/30', label: '高' },
  medium:   { color: '#FFD700', bg: 'bg-[#FFD700]/10', border: 'border-[#FFD700]/30', label: '中' },
  low:      { color: '#9B9BA4', bg: 'bg-muted/30',     border: 'border-border',       label: '低' },
}

const PRIORITY_CONFIG = {
  immediate:   { label: '今すぐ',   color: '#FF4655' },
  this_week:   { label: '今週中',   color: '#FF8C42' },
  next_month:  { label: '来月まで', color: '#9B9BA4' },
}

const GRADE_CONFIG = {
  S: { bg: 'bg-[#FFD700]/15', text: 'text-[#FFD700]', border: 'border-[#FFD700]/30' },
  A: { bg: 'bg-[#00D4A0]/15', text: 'text-[#00D4A0]', border: 'border-[#00D4A0]/30' },
  B: { bg: 'bg-[#6C63FF]/15', text: 'text-[#6C63FF]', border: 'border-[#6C63FF]/30' },
  C: { bg: 'bg-[#FF8C42]/15', text: 'text-[#FF8C42]', border: 'border-[#FF8C42]/30' },
  D: { bg: 'bg-[#FF4655]/15', text: 'text-[#FF4655]', border: 'border-[#FF4655]/30' },
}

interface Report {
  id: string
  loss_reasons: LossReason[]
  win_patterns: WinPattern[]
  improvements: Improvement[]
  player_feedback: PlayerFeedback[]
  raw_analysis: string
  created_at: string
}

export default function AICoachPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: TEAM_ID, report_type: 'post_match' }),
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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#FF4655]" />
            AIコーチ
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            データ分析から「負けた原因」と「改善策」を自動生成
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all',
            loading
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-[#FF4655] hover:bg-[#e03e4d] text-white'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <Bot className="w-4 h-4" />
              分析実行
            </>
          )}
        </button>
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

      {/* Empty state */}
      {!report && !loading && !error && (
        <div className="bg-card rounded-xl p-12 border border-border text-center">
          <Bot className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-white font-semibold">分析を開始してください</h3>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
            「分析実行」ボタンをクリックすると、チームの全データをAIが分析し、
            コーチ視点でのフィードバックを生成します。
          </p>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-6">
          {/* Loss Reasons */}
          <Section title="敗因分析" icon={AlertTriangle} iconColor="#FF4655">
            <div className="space-y-3">
              {report.loss_reasons?.map((r, i) => {
                const cfg = SEVERITY_CONFIG[r.severity] ?? SEVERITY_CONFIG.medium
                return (
                  <div key={i} className={cn('rounded-xl p-4 border', cfg.bg, cfg.border)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: `${cfg.color}20`, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-sm font-semibold text-white">{r.factor}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.evidence}</p>
                        {r.rounds_affected && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            影響ラウンド: {r.rounds_affected}R
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold text-[#FF4655]">
                          {r.win_rate_impact > 0 ? '+' : ''}
                          {Math.round(r.win_rate_impact * 100)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">勝率影響</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* Win Patterns */}
          <Section title="勝ちパターン" icon={TrendingUp} iconColor="#00D4A0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.win_patterns?.map((p, i) => (
                <div key={i} className="bg-[#00D4A0]/5 border border-[#00D4A0]/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{p.pattern}</span>
                    <span className="text-lg font-bold text-[#00D4A0]">
                      {Math.round(p.win_rate * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    頻度: {Math.round(p.frequency * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Improvements */}
          <Section title="改善提案" icon={Lightbulb} iconColor="#FFD700">
            <div className="space-y-2">
              {report.improvements?.map((imp, i) => {
                const pCfg = PRIORITY_CONFIG[imp.priority]
                return (
                  <div key={i} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                    <div
                      className="text-[10px] font-bold px-2 py-1 rounded flex-shrink-0 mt-0.5"
                      style={{ background: `${pCfg.color}20`, color: pCfg.color }}
                    >
                      {pCfg.label}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground capitalize">[{imp.area}]</span>
                        <span className="text-sm text-white">{imp.action}</span>
                      </div>
                      {imp.drill && (
                        <div className="text-xs text-[#6C63FF] mt-1">
                          練習: {imp.drill}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* Player Feedback */}
          <Section title="個人フィードバック" icon={User} iconColor="#6C63FF">
            <div className="space-y-4">
              {report.player_feedback?.map((pf, i) => {
                const gCfg = GRADE_CONFIG[pf.performance_grade] ?? GRADE_CONFIG.C
                return (
                  <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center font-bold border',
                          gCfg.bg, gCfg.text, gCfg.border
                        )}>
                          {pf.performance_grade}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{pf.ign}</div>
                          <div className="text-xs text-muted-foreground capitalize">{pf.role}</div>
                        </div>
                        <div className="ml-auto text-right">
                          <div className="text-xs text-muted-foreground">ロール適正</div>
                          <div className="text-lg font-bold text-white">{pf.role_fit_score}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="text-[#00D4A0] font-semibold mb-1">強み</div>
                          <ul className="space-y-1">
                            {pf.strengths?.map((s, j) => (
                              <li key={j} className="text-muted-foreground flex items-start gap-1">
                                <span className="text-[#00D4A0] mt-0.5">+</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-[#FF4655] font-semibold mb-1">課題</div>
                          <ul className="space-y-1">
                            {pf.weaknesses?.map((w, j) => (
                              <li key={j} className="text-muted-foreground flex items-start gap-1">
                                <span className="text-[#FF4655] mt-0.5">!</span>
                                {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {pf.actions?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="text-xs text-[#FFD700] font-semibold mb-1">今週のアクション</div>
                          <ul className="space-y-1">
                            {pf.actions.map((a, j) => (
                              <li key={j} className="text-xs text-muted-foreground flex items-start gap-1">
                                <span className="text-[#FFD700] mt-0.5">→</span>
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>

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
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
        <h2 className="font-semibold text-white text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
