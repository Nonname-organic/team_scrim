'use client'

import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlan } from '@/contexts/PlanContext'
import { meetsRequirement, PAYMENTS_ENABLED, type Plan, type PlanLimits } from '@/lib/plans'
import type { UpgradeTrigger } from '@/contexts/PlanContext'

interface Props {
  /** 必要なプラン */
  requiredPlan: Plan
  /** トリガー情報（モーダルに表示する内容） */
  trigger?: UpgradeTrigger
  /** ロック時に薄く表示するプレビューコンテンツ */
  preview?: React.ReactNode
  /** ロック解除時に表示するコンテンツ */
  children: React.ReactNode
  /** ロック表示の高さ */
  minHeight?: number
  className?: string
}

const PLAN_LABEL: Record<Plan, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
}
const PLAN_COLOR: Record<Plan, string> = {
  free: '#9B9BA4',
  pro: '#FFD700',
  team: '#60A5FA',
}

export function LockedFeature({
  requiredPlan,
  trigger,
  preview,
  children,
  minHeight = 120,
  className,
}: Props) {
  const { plan, showUpgrade } = usePlan()

  // 決済無効中はすべての機能を開放
  if (!PAYMENTS_ENABLED || meetsRequirement(plan, requiredPlan)) {
    return <>{children}</>
  }

  const color = PLAN_COLOR[requiredPlan]
  const defaultTrigger: UpgradeTrigger = {
    feature: 'ai_limit',
    title: `${PLAN_LABEL[requiredPlan]}プランで解放`,
    message: 'この機能を使うにはプランのアップグレードが必要です',
  }

  return (
    <div
      className={cn('relative rounded-xl overflow-hidden', className)}
      style={{ minHeight }}
    >
      {/* Blurred preview */}
      {preview && (
        <div className="filter blur-sm pointer-events-none select-none opacity-40 absolute inset-0">
          {preview}
        </div>
      )}

      {/* Lock overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer"
        style={{ background: 'rgba(18,18,26,0.85)', backdropFilter: 'blur(2px)' }}
        onClick={() => showUpgrade(trigger ?? defaultTrigger)}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center border-2"
          style={{ borderColor: color, background: `${color}15` }}
        >
          <Lock className="w-5 h-5" style={{ color }} />
        </div>
        <div className="text-center space-y-0.5 px-4">
          <div className="text-xs font-bold text-white">
            {PLAN_LABEL[requiredPlan]}プランで解放
          </div>
          <div className="text-[10px] text-muted-foreground">
            クリックしてプランを確認
          </div>
        </div>
      </div>
    </div>
  )
}
