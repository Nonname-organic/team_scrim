'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bot, User, AlertCircle, Zap, Loader2, Plus, X, Trash2, Lock,
  Target, Shield, Users, TrendingUp, Flag, ChevronDown, ChevronUp,
  Lightbulb, GitBranch, RefreshCw, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlan } from '@/contexts/PlanContext'
import { useLanguage } from '@/contexts/LanguageContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TacticalIssue {
  issue: string
  impact: string
  priority: 'high' | 'mid' | 'low'
}

interface StructuredImprovement {
  who: string
  when: string
  what: string
  why: string
}

interface BreakdownPoint {
  round: string
  moment: string
  description: string
}

interface CauseAnalysis {
  structural: string[]
  execution: string[]
  judgment: string[]
  information: string[]
}

interface EVEvaluation {
  verdict: 'rational' | 'irrational' | 'situational'
  reasoning: string
}

interface Reproducibility {
  verdict: 'repeatable' | 'coincidence' | 'mixed'
  evidence: string
}

interface TacticalAnalysis {
  round_evaluation: string
  win_factor: string
  // 7-step framework fields
  intent_assessment?: string
  ev_evaluation?: EVEvaluation
  breakdown_points?: BreakdownPoint[]
  cause_analysis?: CauseAnalysis
  reproducibility?: Reproducibility
  improvements: StructuredImprovement[] | { team: string[]; individual: string[] }
  rules: string[]
  pattern_flags: string[]
  score: { macro: number; micro: number; teamplay: number; overall: number }
  // legacy fields (old format)
  good_points?: string[]
  issues?: TacticalIssue[]
  root_causes?: string[]
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

  const normalize = (json: Record<string, unknown>): TacticalAnalysis | null => {
    if (!json.round_evaluation) return null

    // score 正規化: フラット形式・空 {} ・undefined を全て安全に変換
    const rawScore = (json.score ?? {}) as Record<string, unknown>
    json.score = {
      macro:    Number(rawScore.macro    ?? json.score_macro    ?? 0) || 0,
      micro:    Number(rawScore.micro    ?? json.score_micro    ?? 0) || 0,
      teamplay: Number(rawScore.teamplay ?? json.score_teamplay ?? 0) || 0,
      overall:  Number(rawScore.overall  ?? json.score_overall  ?? 0) || 0,
    }

    // 旧 improvements 形式を正規化
    if (!json.improvements && (json.team_improvements || json.individual_improvements)) {
      json.improvements = {
        team:       json.team_improvements       ?? [],
        individual: json.individual_improvements ?? [],
      }
    }
    if (!json.improvements) json.improvements = []

    if (!json.rules)          json.rules          = []
    if (!json.pattern_flags)  json.pattern_flags  = []

    return json as unknown as TacticalAnalysis
  }

  try {
    const json = JSON.parse(raw)
    return normalize(json)
  } catch {}

  try {
    const fenced = raw.match(/```json\r?\n([\s\S]*?)\r?\n```/)
    if (fenced) {
      const json = JSON.parse(fenced[1])
      return normalize(json)
    }
  } catch {}

  return null
}

const PRIORITY_CFG = {
  high: { label: 'HIGH', color: '#FF4655' },
  mid:  { label: 'MID',  color: '#FF8C42' },
  low:  { label: 'LOW',  color: '#9B9BA4' },
}

function getEVCFG(t: (k: string) => string) {
  return {
    rational:    { label: t('feedback.evRational'),    color: '#00D4A0' },
    irrational:  { label: t('feedback.evIrrational'),  color: '#FF4655' },
    situational: { label: t('feedback.evSituational'), color: '#FF8C42' },
  }
}

function getREPROCFG(t: (k: string) => string) {
  return {
    repeatable:  { label: t('feedback.reproRepeatable'),  color: '#00D4A0' },
    coincidence: { label: t('feedback.reproCoincidence'), color: '#FF4655' },
    mixed:       { label: t('feedback.reproMixed'),       color: '#FF8C42' },
  }
}

function getCAUSECFG(t: (k: string) => string) {
  return [
    { key: 'structural' as const,  label: t('feedback.causeStructural'),  color: '#6C63FF' },
    { key: 'execution' as const,   label: t('feedback.causeExecution'),   color: '#FF4655' },
    { key: 'judgment' as const,    label: t('feedback.causeJudgment'),    color: '#FF8C42' },
    { key: 'information' as const, label: t('feedback.causeInformation'), color: '#3B82F6' },
  ]
}

function getSTYLECFG(t: (k: string) => string): Record<string, { label: string; color: string }> {
  return {
    aggressive: { label: t('feedback.styleAggressive'), color: '#FF4655' },
    control:    { label: t('feedback.styleControl'),    color: '#00D4A0' },
    mixed:      { label: t('feedback.styleMixed'),      color: '#6C63FF' },
    default:    { label: t('feedback.styleDefault'),    color: '#9B9BA4' },
  }
}

function getSTYLEOPTS(t: (k: string) => string) {
  return [
    { value: 'aggressive', label: t('feedback.styleAggressive'), color: '#FF4655' },
    { value: 'control',    label: t('feedback.styleControl'),    color: '#00D4A0' },
    { value: 'mixed',      label: t('feedback.styleMixed'),      color: '#6C63FF' },
    { value: 'default',    label: t('feedback.styleDefault'),    color: '#9B9BA4' },
  ]
}

// ── Score Bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  const v = Number(value) || 0
  const color = v >= 70 ? '#00D4A0' : v >= 45 ? '#FF8C42' : '#FF4655'
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[11px] font-bold" style={{ color }}>{v}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${v}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ── New Tactical Card (7-step framework) ─────────────────────────────────────

function TacticalCard({
  feedback,
  tactical,
}: {
  feedback: FeedbackData
  tactical: TacticalAnalysis
}) {
  const { locale, t } = useLanguage()
  // intent_assessment があれば旧7ステップ形式、なければ新コンパクト形式
  const isNewFormat = !!tactical.intent_assessment
  const hasSimpleImprovements = Array.isArray(tactical.improvements) &&
    tactical.improvements.length > 0 &&
    typeof (tactical.improvements as unknown[])[0] === 'string'
  const simpleImprovements = hasSimpleImprovements
    ? (tactical.improvements as unknown as string[])
    : []
  const structuredImprovements: StructuredImprovement[] = !hasSimpleImprovements && Array.isArray(tactical.improvements)
    ? (tactical.improvements as StructuredImprovement[])
    : []
  const hasExpandableContent = isNewFormat || simpleImprovements.length > 0 || tactical.rules.length > 0 || tactical.pattern_flags.length > 0
  const [expanded, setExpanded] = useState(isNewFormat || simpleImprovements.length > 0)
  const EV_CFG = getEVCFG(t)
  const REPRO_CFG = getREPROCFG(t)
  const CAUSE_CFG = getCAUSECFG(t)
  const date = new Date(feedback.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'ja-JP', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const scoreColor = (v: number) => v >= 70 ? '#00D4A0' : v >= 45 ? '#FF8C42' : '#FF4655'

  // legacy {team, individual} improvements (very old format)
  const legacyImprovements = !Array.isArray(tactical.improvements)
    ? (tactical.improvements as { team: string[]; individual: string[] })
    : null

  return (
    <div className="border border-[#6C63FF]/30 bg-[#6C63FF]/5 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#6C63FF]/20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#6C63FF]/20 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-[#6C63FF]" />
          </div>
          <span className="text-xs font-semibold text-white">{t('feedback.aiTacticalTitle')}</span>
          <span className="text-[10px] text-muted-foreground">{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black" style={{ color: scoreColor(tactical.score.overall) }}>
            {tactical.score.overall}
          </span>
          <span className="text-[10px] text-muted-foreground">/ 100</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 試合評価 + 勝敗要因 */}
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

        {isNewFormat && (
          <>
            {/* Step 1: 意図の推測 */}
            {tactical.intent_assessment && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> {t('feedback.stepIntent')}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pl-4">
                  {tactical.intent_assessment}
                </p>
              </div>
            )}

            {/* Step 2: 期待値評価 */}
            {tactical.ev_evaluation && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" /> {t('feedback.stepEV')}
                </div>
                <div className="flex items-start gap-2">
                  {(() => {
                    const cfg = EV_CFG[tactical.ev_evaluation.verdict] ?? EV_CFG.situational
                    return (
                      <>
                        <span
                          className="text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                          style={{ color: cfg.color, background: `${cfg.color}20`, border: `1px solid ${cfg.color}40` }}
                        >
                          {cfg.label}
                        </span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {tactical.ev_evaluation.reasoning}
                        </p>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </>
        )}

        {/* Score bars */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 bg-muted/10 rounded-xl p-3">
          <ScoreBar label={locale === 'en' ? 'Macro'     : 'マクロ'}       value={tactical.score.macro} />
          <ScoreBar label={locale === 'en' ? 'Micro'     : 'ミクロ'}       value={tactical.score.micro} />
          <ScoreBar label={locale === 'en' ? 'Teamplay'  : 'チームプレイ'} value={tactical.score.teamplay} />
          <ScoreBar label={locale === 'en' ? 'Overall'   : '総合'}         value={tactical.score.overall} />
        </div>

        {/* Legacy: Good points + Issues */}
        {!isNewFormat && tactical.good_points && tactical.issues && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-[#00D4A0] uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3 h-3" /> {t('feedback.goodPoints')}
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
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-[#FF4655] uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {t('feedback.issues')}
              </div>
              <ul className="space-y-2">
                {tactical.issues.map((iss, i) => {
                  const cfg = PRIORITY_CFG[iss.priority] ?? PRIORITY_CFG.mid
                  return (
                    <li key={i} className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black px-1.5 py-px rounded"
                          style={{ color: cfg.color, background: `${cfg.color}20` }}>
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
        )}

        {/* Expand toggle — only shown when there's content to expand */}
        {hasExpandableContent && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-white transition-colors py-1"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? t('feedback.collapseBtn') : isNewFormat ? t('feedback.expandNewFormat') : t('feedback.expandLegacy')}
          </button>
        )}

        {expanded && (
          <div className="space-y-4 border-t border-border/40 pt-4">

            {/* Step 3: 崩壊点 (new format) */}
            {isNewFormat && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-[#FF4655] uppercase tracking-wider flex items-center gap-1">
                  <GitBranch className="w-3 h-3" /> {t('feedback.stepBreakdown')}
                </div>
                {tactical.breakdown_points && tactical.breakdown_points.length > 0 ? (
                  <ul className="space-y-2">
                    {tactical.breakdown_points.map((bp, i) => (
                      <li key={i} className="bg-[#FF4655]/5 border border-[#FF4655]/15 rounded-lg px-3 py-2 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-[#FF4655] bg-[#FF4655]/20 px-1.5 py-px rounded">{bp.round}</span>
                          <span className="text-[11px] text-white font-medium">{bp.moment}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground pl-8 leading-relaxed">{bp.description}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground pl-1">—</p>
                )}
              </div>
            )}

            {/* Step 4: 原因分離 (new format) */}
            {isNewFormat && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-[#FF8C42] uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {t('feedback.stepCause')}
                </div>
                {tactical.cause_analysis ? (
                  <div className="grid grid-cols-2 gap-2">
                    {CAUSE_CFG.map(({ key, label, color }) => {
                      const items = tactical.cause_analysis![key] ?? []
                      return (
                        <div key={key} className="rounded-lg p-2.5 space-y-1.5"
                          style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                          <div className="text-[9px] font-black uppercase tracking-wider" style={{ color }}>
                            {label}
                          </div>
                          {items.length > 0 ? (
                            <ul className="space-y-1">
                              {items.map((item, i) => (
                                <li key={i} className="text-[10px] text-muted-foreground flex gap-1.5">
                                  <span style={{ color }} className="shrink-0 mt-px font-bold">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">—</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground pl-1">—</p>
                )}
              </div>
            )}

            {/* Step 5: 再現性評価 (new format) */}
            {isNewFormat && tactical.reproducibility && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-[#00D4A0] uppercase tracking-wider flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> {t('feedback.stepRepro')}
                </div>
                <div className="flex items-start gap-2">
                  {(() => {
                    const cfg = REPRO_CFG[tactical.reproducibility.verdict] ?? REPRO_CFG.mixed
                    return (
                      <>
                        <span
                          className="text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                          style={{ color: cfg.color, background: `${cfg.color}20`, border: `1px solid ${cfg.color}40` }}
                        >
                          {cfg.label}
                        </span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {tactical.reproducibility.evidence}
                        </p>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* 改善提案: シンプル string[] 形式（新コンパクト形式） */}
            {simpleImprovements.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3" /> {t('feedback.stepImprovement')}
                </div>
                <ul className="space-y-1.5">
                  {simpleImprovements.map((imp, i) => (
                    <li key={i} className="bg-[#6C63FF]/5 border border-[#6C63FF]/15 rounded-lg px-3 py-2 flex items-start gap-2">
                      <span className="text-[9px] font-black text-[#6C63FF] bg-[#6C63FF]/20 px-1.5 py-0.5 rounded shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-[11px] text-white/90 leading-relaxed">{imp}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 改善提案: 構造化 who/when/what/why 形式（旧7ステップ形式） */}
            {isNewFormat && structuredImprovements.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3" /> {t('feedback.stepImprovement')}
                </div>
                <ul className="space-y-2">
                  {structuredImprovements.map((imp, i) => (
                    <li key={i} className="bg-[#6C63FF]/5 border border-[#6C63FF]/15 rounded-lg px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black text-[#6C63FF] bg-[#6C63FF]/20 px-1.5 py-px rounded">{imp.who}</span>
                        <span className="text-[9px] text-muted-foreground">{imp.when}</span>
                      </div>
                      <p className="text-[11px] text-white font-medium">{imp.what}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{imp.why}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Legacy improvements */}
            {legacyImprovements && (
              <div className="grid grid-cols-2 gap-3">
                {legacyImprovements.team.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider flex items-center gap-1">
                      <Users className="w-3 h-3" /> {t('feedback.teamImprovement')}
                    </div>
                    <ul className="space-y-1">
                      {legacyImprovements.team.map((a, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                          <span className="text-[#6C63FF] font-bold shrink-0 mt-px">{i + 1}.</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {legacyImprovements.individual.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {t('feedback.individualImprovement')}
                    </div>
                    <ul className="space-y-1">
                      {legacyImprovements.individual.map((a, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                          <span className="text-[#3B82F6] font-bold shrink-0 mt-px">{i + 1}.</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Step 7: チームルール */}
            {tactical.rules.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-[#FFD700] uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {t('feedback.stepRules')}
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

            {/* パターンフラグ */}
            {tactical.pattern_flags.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-[#FF4655] uppercase tracking-wider flex items-center gap-1">
                  <Flag className="w-3 h-3" /> {t('feedback.stepPatterns')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tactical.pattern_flags.map((pf, i) => (
                    <span key={i}
                      className="text-[10px] text-[#FF4655] border border-[#FF4655]/30 bg-[#FF4655]/5 rounded-full px-2 py-0.5">
                      {pf}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Legacy: root causes */}
            {!isNewFormat && tactical.root_causes && tactical.root_causes.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-[#FF8C42] uppercase tracking-wider">{t('feedback.rootCauses')}</div>
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
  const { locale, t } = useLanguage()
  const STYLE_CFG = getSTYLECFG(t)
  const isAI = feedback.type === 'ai'
  const date = new Date(feedback.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'ja-JP', {
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
          <span className="text-xs font-semibold text-white">{isAI ? t('feedback.aiLabel') : t('feedback.coachNoteLabel')}</span>
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
            <div className="text-[10px] font-bold text-[#00D4A0] uppercase tracking-wider">✓ {t('feedback.goodPoints')}</div>
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
              <AlertCircle className="w-3 h-3" /> {t('feedback.issues')}
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
              <Zap className="w-3 h-3" /> {t('feedback.actionItems')}
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
  const { t } = useLanguage()
  const [summary, setSummary]       = useState('')
  const [strengths, setStrengths]   = useState('')
  const [weaknesses, setWeaknesses] = useState('')
  const [actions, setActions]       = useState('')
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
          style_tag: null,
        }),
      })
      onSaved()
      onCancel()
    } finally { setSaving(false) }
  }

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{t('feedback.addCoachNote')}</span>
        <button onClick={onCancel} className="text-muted-foreground hover:text-white transition-colors p-1 -mr-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t('feedback.summary')}</label>
        <textarea rows={2} value={summary} onChange={e => setSummary(e.target.value)}
          placeholder={t('feedback.summaryPlaceholder')} className={textCls} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: t('feedback.goodPoints'),  color: '#00D4A0', value: strengths, set: setStrengths, placeholder: t('feedback.strengthsPlaceholder') },
          { label: t('feedback.issues'),       color: '#FF4655', value: weaknesses, set: setWeaknesses, placeholder: t('feedback.weaknessesPlaceholder') },
          { label: t('feedback.actionItems'),  color: '#FF8C42', value: actions, set: setActions, placeholder: t('feedback.actionsPlaceholder') },
        ].map(({ label, color, value, set, placeholder }) => (
          <div key={label} className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</label>
            <textarea rows={5} value={value} onChange={e => set(e.target.value)}
              placeholder={placeholder} className={textCls} />
          </div>
        ))}
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-white border border-border rounded-lg px-4 py-2.5 sm:py-1.5 transition-colors">
          {t('common.cancel')}
        </button>
        <button onClick={save} disabled={saving}
          className="text-xs bg-[#FF4655] hover:bg-[#FF4655]/80 text-white rounded-lg px-4 py-2.5 sm:py-1.5 transition-colors disabled:opacity-50">
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function MatchFeedbackPanel({ matchId }: { matchId: string }) {
  const { canUseAI, aiUsageCount, aiUsageLimit, showUpgrade } = usePlan()
  const { t, locale } = useLanguage()
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
        title: t('common.loading') === 'Loading...' ? 'AI Analysis Limit Reached' : 'AI分析の上限に達しました',
        message: t('common.loading') === 'Loading...'
          ? `You've used all ${aiUsageLimit} AI analyses this month. Upgrade to Pro for 20/month or Team for unlimited.`
          : `今月のAI使用回数（${aiUsageLimit}回）を使い切りました。Proプランで月20回、Teamプランで無制限にご利用いただけます。`,
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
        body: JSON.stringify({ match_id: matchId, locale }),
      })
      if (!res.ok) {
        let msg = t('common.loading') === 'Loading...' ? `AI analysis failed (${res.status})` : `AI分析に失敗しました (${res.status})`
        if (res.status === 504) msg = t('common.loading') === 'Loading...' ? 'Request timed out. Please try again later.' : 'タイムアウトしました。しばらく待ってから再度お試しください。'
        else { try { msg = (await res.json()).error ?? msg } catch {} }
        setAiError(msg)
        return
      }
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
    <>
      {/* Coach memo modal — bottom sheet on mobile, centered dialog on desktop */}
      {showCoachForm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-stretch sm:items-center p-0 sm:p-6">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCoachForm(false)}
          />
          <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-xl bg-[#18181F] border-t sm:border border-border/60 shadow-2xl">
            <CoachForm matchId={matchId} onSaved={fetchFeedbacks} onCancel={() => setShowCoachForm(false)} />
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{t('feedback.panelTitle')}</span>
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
              <Plus className="w-3 h-3" /> {t('feedback.coachNoteLabel')}
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
              {t('feedback.aiLabel')}{!canUseAI && ` (${aiUsageCount}/${aiUsageLimit})`}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {loading && <div className="text-center py-6 text-muted-foreground text-xs">{t('feedback.loading')}</div>}

          {!loading && aiError && (
            <div className="text-xs text-[#FF4655] bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg px-3 py-2">{aiError}</div>
          )}

          {!loading && feedbacks.length === 0 && !showCoachForm && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-xs text-muted-foreground">{t('feedback.noFeedback')}</p>
              <button
                onClick={runAI}
                disabled={aiLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#6C63FF] hover:bg-[#6C63FF]/80 text-white transition-colors disabled:opacity-50 shadow-lg shadow-[#6C63FF]/20"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                {t('feedback.runAiTactical')}
              </button>
              <p className="text-[10px] text-muted-foreground">{t('feedback.aiAnalysisDesc')}</p>
            </div>
          )}

          {aiFeedbacks.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{t('feedback.aiLabel')}</div>
              {aiFeedbacks.map(f =>
                f.tactical
                  ? <TacticalCard key={f.id} feedback={f} tactical={f.tactical} />
                  : <LegacyCard   key={f.id} feedback={f} />
              )}
            </div>
          )}

          {coachFeedbacks.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{t('feedback.coachNoteLabel')}</div>
              {coachFeedbacks.map(f => <LegacyCard key={f.id} feedback={f} onDelete={deleteFeedback} />)}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
