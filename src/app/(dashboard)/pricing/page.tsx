'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Minus, Zap, Loader2, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLANS, PLAN_FEATURES, PAYMENTS_ENABLED, type Plan } from '@/lib/plans'
import { usePlan } from '@/contexts/PlanContext'
import { AIUsageBar } from '@/components/pricing/UsageBar'

export default function PricingPage() {
  return (
    <Suspense>
      <PricingPageInner />
    </Suspense>
  )
}

function PricingPageInner() {
  const { plan, aiUsageCount, aiUsageLimit, refreshPlan } = usePlan()
  const params = useSearchParams()
  const success = params.get('success')
  const [upgrading, setUpgrading] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (success) refreshPlan()
  }, [success, refreshPlan])

  async function handleUpgrade(targetPlan: Plan) {
    if (targetPlan === 'free' || targetPlan === plan) return
    setUpgrading(targetPlan)
    setError(null)
    try {
      const res  = await fetch('/api/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'エラーが発生しました'); return }
      if (json.url) window.location.href = json.url
    } catch (e) {
      setError(String(e))
    } finally {
      setUpgrading(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2">
      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 bg-[#00D4A0]/10 border border-[#00D4A0]/30 rounded-xl px-5 py-4">
          <CheckCircle2 className="w-5 h-5 text-[#00D4A0] flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-white">アップグレード完了！</div>
            <div className="text-xs text-muted-foreground">新しいプランの機能がご利用いただけます</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-white">
          あなたの<span className="text-[#FF4655]">成長</span>を加速させる
        </h1>
        <p className="text-muted-foreground">
          チームの勝率を上げるために必要な機能を、必要なだけ
        </p>
      </div>

      {/* Current usage */}
      {aiUsageLimit !== null && (
        <div className="bg-card border border-border rounded-xl p-4 max-w-sm mx-auto">
          <div className="text-xs text-muted-foreground mb-2">今月のAI使用状況</div>
          <AIUsageBar />
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map(p => {
          const isCurrent = p.id === plan
          const isPopular = p.id === 'pro'
          const isUpgrading = upgrading === p.id

          return (
            <div
              key={p.id}
              className={cn(
                'relative rounded-2xl border p-6 flex flex-col',
                isCurrent
                  ? 'border-white/20 bg-white/5'
                  : isPopular
                  ? 'border-[#FFD700]/50 bg-gradient-to-b from-[#FFD700]/8 to-transparent'
                  : p.id === 'team'
                  ? 'border-[#3B82F6]/40 bg-gradient-to-b from-[#3B82F6]/8 to-transparent'
                  : 'border-border bg-card'
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-black bg-[#FFD700] text-black px-4 py-1 rounded-full shadow-lg">
                    ⭐ おすすめ
                  </span>
                </div>
              )}

              {/* Plan name */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                <span className="text-base font-black text-white">{p.name}</span>
                {isCurrent && (
                  <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    現在
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-1">
                <span className="text-4xl font-black text-white">{p.priceLabel}</span>
                {p.price > 0 && <span className="text-sm text-muted-foreground ml-1">/月</span>}
              </div>
              <p className="text-xs text-muted-foreground mb-6">{p.tagline}</p>

              {/* CTA */}
              <div className="mb-6">
                {isCurrent ? (
                  <div className="w-full text-center text-sm text-muted-foreground border border-border rounded-xl py-2.5">
                    現在のプラン
                  </div>
                ) : p.id === 'free' ? (
                  <div className="h-[42px]" />
                ) : !PAYMENTS_ENABLED ? (
                  <div className="w-full text-center text-sm text-muted-foreground border border-border rounded-xl py-2.5 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" /> 準備中
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(p.id)}
                    disabled={!!upgrading}
                    className={cn(
                      'w-full text-sm font-bold rounded-xl py-2.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50',
                      p.id === 'pro'
                        ? 'bg-[#FFD700] hover:bg-[#FFD700]/80 text-black shadow-lg shadow-[#FFD700]/20'
                        : 'bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white shadow-lg shadow-[#3B82F6]/20'
                    )}
                  >
                    {isUpgrading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> 処理中...</>
                      : <><Zap className="w-4 h-4" /> {p.name}にアップグレード</>}
                  </button>
                )}
              </div>

              {/* Feature list (top 6) */}
              <ul className="space-y-2.5">
                {PLAN_FEATURES.map(f => {
                  const val = f[p.id as 'free' | 'pro' | 'team']
                  return (
                    <li key={f.label} className="flex items-start gap-2 text-xs">
                      {val === false ? (
                        <Minus className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Check
                          className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                          style={{ color: p.id === 'free' ? '#9B9BA4' : p.id === 'pro' ? '#FFD700' : '#60A5FA' }}
                        />
                      )}
                      <span className={val === false ? 'text-muted-foreground/40' : 'text-muted-foreground'}>
                        {f.label}
                        {typeof val === 'string' && val !== 'true' && (
                          <span className="font-semibold text-white ml-1">({val})</span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="text-sm text-[#FF4655] bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-xl px-4 py-3 text-center">
          {error}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/60 text-center">
        いつでもキャンセル可能 · Stripe による安全な決済 · 税別表示
      </p>
    </div>
  )
}
