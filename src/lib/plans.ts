// ============================================================
// Plan definitions — Single source of truth
// ============================================================

export type Plan = 'free' | 'pro' | 'team'

export interface PlanLimits {
  ai_feedback_monthly: number | null  // null = unlimited
  round_preview_limit: number | null  // null = unlimited
  vod_analysis: boolean
  advanced_filters: boolean
  team_sharing: boolean
  growth_tracking: boolean
  practice_menu: boolean
  style_diagnosis: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    ai_feedback_monthly: 1,
    round_preview_limit: 10,
    vod_analysis: false,
    advanced_filters: false,
    team_sharing: false,
    growth_tracking: false,
    practice_menu: false,
    style_diagnosis: false,
  },
  pro: {
    ai_feedback_monthly: 20,
    round_preview_limit: null,
    vod_analysis: true,
    advanced_filters: true,
    team_sharing: false,
    growth_tracking: true,
    practice_menu: true,
    style_diagnosis: true,
  },
  team: {
    ai_feedback_monthly: null,
    round_preview_limit: null,
    vod_analysis: true,
    advanced_filters: true,
    team_sharing: true,
    growth_tracking: true,
    practice_menu: true,
    style_diagnosis: true,
  },
}

export interface PlanConfig {
  id: Plan
  name: string
  price: number       // monthly, JPY
  priceLabel: string
  tagline: string
  color: string
  accent: string
  stripePriceId: string
}

export const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '¥0',
    tagline: '基本機能を無料で試す',
    color: '#9B9BA4',
    accent: '#9B9BA4',
    stripePriceId: '',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 980,
    priceLabel: '¥980',
    tagline: '本気で上達したい個人向け',
    color: '#FFD700',
    accent: '#FFD700',
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? '',
  },
  {
    id: 'team',
    name: 'Team',
    price: 2980,
    priceLabel: '¥2,980',
    tagline: 'チーム全体の勝率を上げる',
    color: '#3B82F6',
    accent: '#60A5FA',
    stripePriceId: process.env.STRIPE_PRICE_TEAM ?? '',
  },
]

export const PLAN_FEATURES: {
  label: string
  free: string | boolean
  pro: string | boolean
  team: string | boolean
}[] = [
  { label: 'スクリム入力',       free: true,    pro: true,     team: true   },
  { label: '基本スタッツ',       free: true,    pro: true,     team: true   },
  { label: 'ラウンド分析',       free: '10件',  pro: '全件',   team: '全件' },
  { label: 'VOD連携分析',       free: false,   pro: true,     team: true   },
  { label: 'AIフィードバック',   free: '月1回', pro: '月20回', team: '無制限'},
  { label: 'プレイスタイル診断', free: false,   pro: true,     team: true   },
  { label: '練習メニュー生成',   free: false,   pro: true,     team: true   },
  { label: '成長トラッキング',   free: false,   pro: true,     team: true   },
  { label: 'チームフィードバック共有', free: false, pro: false, team: true  },
  { label: 'フルフィルター検索', free: false,   pro: true,     team: true   },
]

export function canUseFeature(plan: Plan, feature: keyof PlanLimits): boolean {
  const limit = PLAN_LIMITS[plan][feature]
  if (typeof limit === 'boolean') return limit
  return limit !== 0
}

export function planRank(plan: Plan): number {
  return { free: 0, pro: 1, team: 2 }[plan]
}

export function meetsRequirement(userPlan: Plan, requiredPlan: Plan): boolean {
  return planRank(userPlan) >= planRank(requiredPlan)
}
