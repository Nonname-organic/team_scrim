'use client'

import { cn } from '@/lib/utils'
import { PAYMENTS_ENABLED, type Plan } from '@/lib/plans'

const CFG: Record<Plan, { label: string; color: string; bg: string; border: string }> = {
  free: {
    label: 'Free',
    color: '#9B9BA4',
    bg: 'rgba(155,155,164,0.1)',
    border: 'rgba(155,155,164,0.3)',
  },
  pro: {
    label: 'Pro',
    color: '#FFD700',
    bg: 'rgba(255,215,0,0.1)',
    border: 'rgba(255,215,0,0.3)',
  },
  team: {
    label: 'Team',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.1)',
    border: 'rgba(96,165,250,0.3)',
  },
}

export function PlanBadge({
  plan,
  size = 'sm',
  className,
}: {
  plan: Plan
  size?: 'xs' | 'sm'
  className?: string
}) {
  if (!PAYMENTS_ENABLED) return null
  const cfg = CFG[plan]
  return (
    <span
      className={cn(
        'font-bold rounded-full border inline-flex items-center',
        size === 'xs' ? 'text-[9px] px-1.5 py-0' : 'text-[10px] px-2 py-0.5',
        className
      )}
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  )
}
