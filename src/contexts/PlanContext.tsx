'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { PLAN_LIMITS, type Plan, type PlanLimits } from '@/lib/plans'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UpgradeTrigger {
  feature: keyof PlanLimits | 'ai_limit'
  title: string
  message: string
  /** 検出された弱点・制限の一部を見せる用 */
  preview?: string[]
}

interface PlanContextType {
  plan: Plan
  aiUsageCount: number
  aiUsageLimit: number | null
  canUseAI: boolean
  limits: PlanLimits
  loading: boolean
  refreshPlan: () => Promise<void>
  showUpgrade: (trigger?: UpgradeTrigger) => void
  hideUpgrade: () => void
  upgradeOpen: boolean
  upgradeTrigger: UpgradeTrigger | null
}

// ── Context ────────────────────────────────────────────────────────────────────

const PlanContext = createContext<PlanContextType>({
  plan: 'free',
  aiUsageCount: 0,
  aiUsageLimit: 1,
  canUseAI: true,
  limits: PLAN_LIMITS.free,
  loading: true,
  refreshPlan: async () => {},
  showUpgrade: () => {},
  hideUpgrade: () => {},
  upgradeOpen: false,
  upgradeTrigger: null,
})

// ── Provider ───────────────────────────────────────────────────────────────────

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { teamId } = useAuth()

  const [plan, setPlan]               = useState<Plan>('free')
  const [aiUsageCount, setAiUsageCount] = useState(0)
  const [aiUsageLimit, setAiUsageLimit] = useState<number | null>(1)
  const [canUseAI, setCanUseAI]       = useState(true)
  const [limits, setLimits]           = useState<PlanLimits>(PLAN_LIMITS.free)
  const [loading, setLoading]         = useState(true)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeTrigger | null>(null)

  const refreshPlan = useCallback(async () => {
    if (!teamId) return
    try {
      const res  = await fetch('/api/user/plan')
      if (!res.ok) return
      const json = await res.json()
      setPlan(json.plan ?? 'free')
      setAiUsageCount(json.ai_usage_count ?? 0)
      setAiUsageLimit(json.ai_usage_limit ?? 1)
      setCanUseAI(json.can_use_ai ?? true)
      setLimits(json.limits ?? PLAN_LIMITS.free)
    } catch {}
    finally { setLoading(false) }
  }, [teamId])

  useEffect(() => { refreshPlan() }, [refreshPlan])

  const showUpgrade = useCallback((trigger?: UpgradeTrigger) => {
    setUpgradeTrigger(trigger ?? null)
    setUpgradeOpen(true)
  }, [])

  const hideUpgrade = useCallback(() => {
    setUpgradeOpen(false)
    setUpgradeTrigger(null)
  }, [])

  return (
    <PlanContext.Provider value={{
      plan, aiUsageCount, aiUsageLimit, canUseAI, limits,
      loading, refreshPlan, showUpgrade, hideUpgrade, upgradeOpen, upgradeTrigger,
    }}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan() {
  return useContext(PlanContext)
}
