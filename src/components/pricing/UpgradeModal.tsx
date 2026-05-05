'use client'

import { useState } from 'react'
import { X, Check, Minus, Zap, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlan } from '@/contexts/PlanContext'
import { PLANS, PLAN_FEATURES, type Plan } from '@/lib/plans'

export function UpgradeModal() {
  const { plan, upgradeOpen, upgradeTrigger, hideUpgrade } = usePlan()
  const [upgrading, setUpgrading] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!upgradeOpen) return null

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={hideUpgrade}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl bg-[#12121A] border border-border rounded-2xl overflow-hidden shadow-2xl">
        {/* Close */}
        <button
          onClick={hideUpgrade}
          className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Trigger message */}
        {upgradeTrigger && (
          <div className="px-6 pt-6 pb-0">
            <div className="flex items-start gap-3 bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-xl p-4">
              <AlertCircle className="w-4 h-4 text-[#FF4655] flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-white">{upgradeTrigger.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{upgradeTrigger.message}</div>
                {upgradeTrigger.preview && upgradeTrigger.preview.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {upgradeTrigger.preview.map((item, i) => (
                      <li key={i} className="text-xs text-[#FF4655] flex items-start gap-1.5">
                        <span className="mt-0.5">•</span> {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-white">
              プランを<span className="text-[#FF4655]">アップグレード</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              あなたの成長を加速させる機能を解放
            </p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {PLANS.map(p => {
              const isCurrent = p.id === plan
              const isPopular = p.id === 'pro'
              const isUpgrading = upgrading === p.id

              return (
                <div
                  key={p.id}
                  className={cn(
                    'relative rounded-xl border p-4 flex flex-col',
                    isCurrent
                      ? 'border-white/20 bg-white/5'
                      : isPopular
                      ? 'border-[#FFD700]/50 bg-[#FFD700]/5'
                      : 'border-border bg-card'
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] font-black bg-[#FFD700] text-black px-3 py-0.5 rounded-full">
                        おすすめ
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: p.color }}
                    />
                    <span className="text-sm font-black text-white">{p.name}</span>
                  </div>

                  <div className="mb-1">
                    <span className="text-2xl font-black text-white">{p.priceLabel}</span>
                    {p.price > 0 && <span className="text-xs text-muted-foreground">/月</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground mb-4">{p.tagline}</div>

                  <div className="mt-auto">
                    {isCurrent ? (
                      <div className="w-full text-center text-xs text-muted-foreground border border-border rounded-lg py-2">
                        現在のプラン
                      </div>
                    ) : p.id === 'free' ? (
                      <div className="w-full text-center text-xs text-muted-foreground py-2" />
                    ) : (
                      <button
                        onClick={() => handleUpgrade(p.id)}
                        disabled={!!upgrading}
                        className={cn(
                          'w-full text-xs font-bold rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50',
                          p.id === 'pro'
                            ? 'bg-[#FFD700] hover:bg-[#FFD700]/80 text-black'
                            : 'bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white'
                        )}
                      >
                        {isUpgrading
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> 処理中...</>
                          : <><Zap className="w-3 h-3" /> アップグレード</>}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {error && (
            <div className="mb-4 text-xs text-[#FF4655] bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Feature comparison */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_80px_80px] text-[10px] text-muted-foreground font-bold uppercase tracking-wider bg-muted/20 px-4 py-2.5">
              <div>機能</div>
              <div className="text-center">Free</div>
              <div className="text-center" style={{ color: '#FFD700' }}>Pro</div>
              <div className="text-center" style={{ color: '#60A5FA' }}>Team</div>
            </div>
            {PLAN_FEATURES.map((f, i) => (
              <div
                key={f.label}
                className={cn(
                  'grid grid-cols-[1fr_80px_80px_80px] px-4 py-2.5 border-t border-border/40 text-xs items-center',
                  i % 2 === 0 ? 'bg-transparent' : 'bg-muted/5'
                )}
              >
                <span className="text-muted-foreground">{f.label}</span>
                <FeatureCell value={f.free} />
                <FeatureCell value={f.pro} color="#FFD700" />
                <FeatureCell value={f.team} color="#60A5FA" />
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground/60 text-center mt-4">
            いつでもキャンセル可能 · Stripe による安全な決済
          </p>
        </div>
      </div>
    </div>
  )
}

function FeatureCell({ value, color }: { value: string | boolean; color?: string }) {
  if (value === true) return (
    <div className="flex justify-center">
      <Check className="w-4 h-4" style={{ color: color ?? '#00D4A0' }} />
    </div>
  )
  if (value === false) return (
    <div className="flex justify-center">
      <Minus className="w-3.5 h-3.5 text-muted-foreground/30" />
    </div>
  )
  return (
    <div className="text-center text-[10px] font-semibold" style={{ color: color ?? '#9B9BA4' }}>
      {value}
    </div>
  )
}
