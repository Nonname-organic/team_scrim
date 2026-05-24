'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Minus, Zap, Loader2, CheckCircle2, ArrowLeft, CreditCard, Building2, Store, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLANS, PLAN_FEATURES, PAYMENTS_ENABLED, PAYMENT_METHODS, BILLING_PERIODS, calcAmount, type Plan, type PaymentMethod } from '@/lib/plans'
import { usePlan } from '@/contexts/PlanContext'
import { AIUsageBar } from '@/components/pricing/UsageBar'

type Step = 'plans' | 'method' | 'period' | 'bank_done'

interface BankResult {
  reference: string
  amount: number
  plan: string
  months: number
  bank: { bankName: string; branchName: string; accountType: string; accountNumber: string; accountName: string }
}

export default function PricingPage() {
  return <Suspense><PricingPageInner /></Suspense>
}

function PricingPageInner() {
  const { plan, aiUsageLimit, refreshPlan } = usePlan()
  const params = useSearchParams()
  const success = params.get('success')

  const [step, setStep]                     = useState<Step>('plans')
  const [selectedPlan, setSelectedPlan]     = useState<Plan | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [selectedMonths, setSelectedMonths] = useState(1)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [bankResult, setBankResult]         = useState<BankResult | null>(null)

  useEffect(() => { if (success) refreshPlan() }, [success, refreshPlan])

  const selectedPlanConfig = PLANS.find(p => p.id === selectedPlan)

  function startUpgrade(targetPlan: Plan) {
    setSelectedPlan(targetPlan)
    setStep('method')
    setError(null)
  }

  async function selectMethod(method: PaymentMethod) {
    setSelectedMethod(method)
    if (method === 'card_subscription') {
      await doStripeCheckout(method, 1)
    } else {
      setStep('period')
    }
  }

  async function selectPeriod(months: number) {
    setSelectedMonths(months)
    if (!selectedPlan || !selectedMethod) return
    setError(null)

    if (selectedMethod === 'bank_transfer') {
      setLoading(true)
      try {
        const res = await fetch('/api/bank-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: selectedPlan, months }),
        })
        const json = await res.json()
        if (!res.ok) { setError(json.error ?? 'エラーが発生しました'); return }
        setBankResult(json)
        setStep('bank_done')
      } catch (e) { setError(String(e)) }
      finally { setLoading(false) }
    } else {
      await doStripeCheckout(selectedMethod, months)
    }
  }

  async function doStripeCheckout(method: PaymentMethod, months: number) {
    if (!selectedPlan) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, paymentMethod: method, months }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'エラーが発生しました'); return }
      if (json.url) window.location.href = json.url
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2">
      {/* Success banner */}
      {success && step === 'plans' && (
        <div className="flex items-center gap-3 bg-[#00D4A0]/10 border border-[#00D4A0]/30 rounded-xl px-5 py-4">
          <CheckCircle2 className="w-5 h-5 text-[#00D4A0] flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-white">アップグレード完了！</div>
            <div className="text-xs text-muted-foreground">新しいプランの機能がご利用いただけます</div>
          </div>
        </div>
      )}

      {/* Header */}
      {step === 'plans' && (
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-white">あなたの<span className="text-[#FF4655]">成長</span>を加速させる</h1>
          <p className="text-muted-foreground">チームの勝率を上げるために必要な機能を、必要なだけ</p>
        </div>
      )}

      {/* Current usage */}
      {step === 'plans' && aiUsageLimit !== null && (
        <div className="bg-card border border-border rounded-xl p-4 max-w-sm mx-auto">
          <div className="text-xs text-muted-foreground mb-2">今月のAI使用状況</div>
          <AIUsageBar />
        </div>
      )}

      {/* ── Step: Plans ─────────────────────────────────────────────────────── */}
      {step === 'plans' && (
        <div className="grid grid-cols-3 gap-4">
          {PLANS.map(p => {
            const isCurrent = p.id === plan
            const isPopular = p.id === 'pro'
            return (
              <div key={p.id} className={cn(
                'relative rounded-2xl border p-6 flex flex-col',
                isCurrent ? 'border-white/20 bg-white/5'
                  : isPopular ? 'border-[#FFD700]/50 bg-gradient-to-b from-[#FFD700]/8 to-transparent'
                  : p.id === 'team' ? 'border-[#3B82F6]/40 bg-gradient-to-b from-[#3B82F6]/8 to-transparent'
                  : 'border-border bg-card'
              )}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-black bg-[#FFD700] text-black px-4 py-1 rounded-full shadow-lg">⭐ おすすめ</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                  <span className="text-base font-black text-white">{p.name}</span>
                  {isCurrent && <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">現在</span>}
                </div>
                <div className="mb-1">
                  <span className="text-4xl font-black text-white">{p.priceLabel}</span>
                  {p.price > 0 && <span className="text-sm text-muted-foreground ml-1">/月〜</span>}
                </div>
                <p className="text-xs text-muted-foreground mb-6">{p.tagline}</p>
                <div className="mb-6">
                  {isCurrent ? (
                    <div className="w-full text-center text-sm text-muted-foreground border border-border rounded-xl py-2.5">現在のプラン</div>
                  ) : p.id === 'free' ? (
                    <div className="h-[42px]" />
                  ) : !PAYMENTS_ENABLED ? (
                    <div className="w-full text-center text-sm text-muted-foreground border border-border rounded-xl py-2.5 flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" /> 準備中
                    </div>
                  ) : (
                    <button
                      onClick={() => startUpgrade(p.id)}
                      className={cn(
                        'w-full text-sm font-bold rounded-xl py-2.5 transition-all flex items-center justify-center gap-2',
                        p.id === 'pro' ? 'bg-[#FFD700] hover:bg-[#FFD700]/80 text-black shadow-lg shadow-[#FFD700]/20'
                          : 'bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white shadow-lg shadow-[#3B82F6]/20'
                      )}
                    >
                      <Zap className="w-4 h-4" /> {p.name}にアップグレード
                    </button>
                  )}
                </div>
                <ul className="space-y-2.5">
                  {PLAN_FEATURES.map(f => {
                    const val = f[p.id as 'free' | 'pro' | 'team']
                    return (
                      <li key={f.label} className="flex items-start gap-2 text-xs">
                        {val === false
                          ? <Minus className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 mt-0.5" />
                          : <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: p.id === 'free' ? '#9B9BA4' : p.id === 'pro' ? '#FFD700' : '#60A5FA' }} />}
                        <span className={val === false ? 'text-muted-foreground/40' : 'text-muted-foreground'}>
                          {f.label}
                          {typeof val === 'string' && val !== 'true' && <span className="font-semibold text-white ml-1">({val})</span>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Step: Payment Method ─────────────────────────────────────────────── */}
      {step === 'method' && selectedPlanConfig && (
        <div className="max-w-md mx-auto space-y-4">
          <button onClick={() => setStep('plans')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> プラン選択に戻る
          </button>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-black text-white">
                <span style={{ color: selectedPlanConfig.color }}>{selectedPlanConfig.name}</span>にアップグレード
              </h2>
              <p className="text-sm text-muted-foreground mt-1">支払い方法を選択してください</p>
            </div>
            <div className="space-y-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  disabled={!m.available || loading}
                  onClick={() => selectMethod(m.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all',
                    m.available
                      ? 'border-border hover:border-white/30 hover:bg-white/5 bg-muted/20'
                      : 'border-border/30 bg-muted/5 opacity-40 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {m.id === 'card_subscription' || m.id === 'card'
                      ? <CreditCard className="w-4 h-4 text-muted-foreground" />
                      : m.id === 'bank_transfer'
                      ? <Building2 className="w-4 h-4 text-muted-foreground" />
                      : m.id === 'konbini'
                      ? <Store className="w-4 h-4 text-muted-foreground" />
                      : <span className="text-base leading-none">🟡</span>}
                    <div>
                      <div className="text-sm font-semibold text-white">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.sublabel}</div>
                    </div>
                  </div>
                  {loading && selectedMethod === m.id
                    ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    : !m.available
                    ? <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">準備中</span>
                    : null}
                </button>
              ))}
              {/* WebMoney placeholder */}
              <button disabled className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-border/30 bg-muted/5 opacity-40 cursor-not-allowed text-left">
                <div className="flex items-center gap-3">
                  <span className="text-base leading-none">💰</span>
                  <div>
                    <div className="text-sm font-semibold text-white">WebMoney</div>
                    <div className="text-xs text-muted-foreground">プリペイド払い</div>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">準備中</span>
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-[#FF4655] text-center">{error}</p>}
        </div>
      )}

      {/* ── Step: Billing Period ─────────────────────────────────────────────── */}
      {step === 'period' && selectedPlanConfig && selectedMethod && (
        <div className="max-w-md mx-auto space-y-4">
          <button onClick={() => setStep('method')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> 支払い方法選択に戻る
          </button>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-black text-white">支払い期間を選択</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedPlanConfig.name} · {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label}
              </p>
            </div>
            <div className="space-y-2">
              {BILLING_PERIODS.map(period => {
                const amount = calcAmount(selectedPlanConfig.price, period.months)
                return (
                  <button
                    key={period.months}
                    disabled={loading}
                    onClick={() => selectPeriod(period.months)}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-border hover:border-white/30 hover:bg-white/5 bg-muted/20 transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      {loading && selectedMonths === period.months
                        ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        : <div className="w-4 h-4" />}
                      <div>
                        <div className="text-sm font-semibold text-white">{period.label}</div>
                        {period.discount > 0 && (
                          <div className="text-xs text-[#00D4A0]">{period.discount}% お得</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">¥{amount.toLocaleString()}</div>
                      {period.months > 1 && (
                        <div className="text-xs text-muted-foreground">
                          月あたり ¥{Math.floor(amount / period.months).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          {error && <p className="text-xs text-[#FF4655] text-center">{error}</p>}
        </div>
      )}

      {/* ── Step: Bank Transfer Instructions ─────────────────────────────────── */}
      {step === 'bank_done' && bankResult && (
        <div className="max-w-md mx-auto space-y-4">
          <div className="bg-card border border-[#00D4A0]/30 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#00D4A0] flex-shrink-0" />
              <div>
                <h2 className="text-lg font-black text-white">振込申込完了</h2>
                <p className="text-sm text-muted-foreground">以下の口座に振り込んでください</p>
              </div>
            </div>

            {/* Reference */}
            <div className="bg-[#FF4655]/10 border border-[#FF4655]/30 rounded-xl px-4 py-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">振込番号（振込名義に追記）</div>
              <div className="text-2xl font-black text-[#FF4655] tracking-widest">{bankResult.reference}</div>
              <div className="text-xs text-muted-foreground mt-1">例：ヤマダ タロウ {bankResult.reference}</div>
            </div>

            {/* Amount */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground">振込金額</div>
              <div className="text-3xl font-black text-white">¥{bankResult.amount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{bankResult.plan}プラン {bankResult.months}ヶ月分</div>
            </div>

            {/* Bank details */}
            <div className="border border-border rounded-xl overflow-hidden text-sm">
              {[
                ['銀行名',   bankResult.bank.bankName],
                ['支店名',   bankResult.bank.branchName],
                ['口座種別', bankResult.bank.accountType],
                ['口座番号', bankResult.bank.accountNumber],
                ['口座名義', bankResult.bank.accountName],
              ].map(([label, value]) => (
                <div key={label} className="flex border-b border-border last:border-0">
                  <div className="w-24 px-3 py-2.5 text-xs text-muted-foreground bg-muted/20 flex-shrink-0">{label}</div>
                  <div className="px-3 py-2.5 text-xs text-white font-medium">{value}</div>
                </div>
              ))}
            </div>

            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>振込確認後（3〜5営業日以内）にプランを有効化します</p>
              <p>振込番号を振込名義に必ず追記してください</p>
            </div>

            <button
              onClick={() => { setStep('plans'); setBankResult(null) }}
              className="w-full text-sm text-muted-foreground hover:text-white border border-border hover:border-white/30 rounded-xl py-2.5 transition-colors"
            >
              プランページに戻る
            </button>
          </div>
        </div>
      )}

      {step === 'plans' && (
        <p className="text-[11px] text-muted-foreground/60 text-center">
          クレジットカード・PayPay・コンビニ払い・銀行振り込み対応 · Stripe による安全な決済 · 税別表示
        </p>
      )}
    </div>
  )
}
