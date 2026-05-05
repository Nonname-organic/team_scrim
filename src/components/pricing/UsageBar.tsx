'use client'

import { cn } from '@/lib/utils'
import { usePlan } from '@/contexts/PlanContext'

export function AIUsageBar({ className }: { className?: string }) {
  const { plan, aiUsageCount, aiUsageLimit, showUpgrade } = usePlan()

  if (aiUsageLimit === null) return null // unlimited → don't show

  const pct = Math.min(100, Math.round((aiUsageCount / aiUsageLimit) * 100))
  const remaining = aiUsageLimit - aiUsageCount
  const nearLimit = pct >= 80
  const atLimit   = remaining <= 0

  return (
    <div
      className={cn(
        'space-y-1 cursor-pointer group',
        className
      )}
      onClick={() => atLimit && showUpgrade({
        feature: 'ai_limit',
        title: 'AI分析の上限に達しました',
        message: `今月のAI使用回数（${aiUsageLimit}回）を使い切りました。来月まで待つか、プランをアップグレードしてください。`,
      })}
    >
      <div className="flex items-center justify-between text-[10px]">
        <span className={cn(
          'font-medium',
          atLimit ? 'text-[#FF4655]' : nearLimit ? 'text-[#FFD700]' : 'text-muted-foreground'
        )}>
          AI使用 {aiUsageCount}/{aiUsageLimit}回
        </span>
        {atLimit ? (
          <span className="text-[#FF4655] font-bold group-hover:underline">アップグレード</span>
        ) : (
          <span className="text-muted-foreground/60">残り{remaining}回</span>
        )}
      </div>
      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: atLimit ? '#FF4655' : nearLimit ? '#FFD700' : '#00D4A0',
          }}
        />
      </div>
    </div>
  )
}
