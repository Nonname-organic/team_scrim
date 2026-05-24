import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/server-auth'
import { queryOne } from '@/lib/db'
import { PLAN_LIMITS, type Plan } from '@/lib/plans'

interface UserTeamRow {
  plan: Plan
  ai_usage_count: number
  ai_usage_reset_at: string
  plan_expires_at: string | null
}

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await queryOne<UserTeamRow>(
    `SELECT plan, ai_usage_count, ai_usage_reset_at, plan_expires_at
     FROM user_teams WHERE user_id = $1 AND team_id = $2`,
    [auth.userId, auth.teamId]
  )

  let plan: Plan = row?.plan ?? 'free'
  let usageCount = row?.ai_usage_count ?? 0

  // Expire one-time plans past their end date
  if (plan !== 'free' && row?.plan_expires_at) {
    if (new Date(row.plan_expires_at) < new Date()) {
      await queryOne(
        `UPDATE user_teams SET plan = 'free', plan_expires_at = NULL
         WHERE user_id = $1 AND team_id = $2`,
        [auth.userId, auth.teamId]
      )
      plan = 'free'
    }
  }

  const limits = PLAN_LIMITS[plan]

  // Reset monthly usage if needed
  if (row?.ai_usage_reset_at) {
    const resetAt = new Date(row.ai_usage_reset_at)
    const now = new Date()
    if (now.getFullYear() !== resetAt.getFullYear() || now.getMonth() !== resetAt.getMonth()) {
      await queryOne(
        `UPDATE user_teams SET ai_usage_count = 0, ai_usage_reset_at = NOW()
         WHERE user_id = $1 AND team_id = $2`,
        [auth.userId, auth.teamId]
      )
      usageCount = 0
    }
  }

  return NextResponse.json({
    plan,
    ai_usage_count: usageCount,
    ai_usage_limit: limits.ai_feedback_monthly,
    can_use_ai: limits.ai_feedback_monthly === null || usageCount < limits.ai_feedback_monthly,
    limits,
  })
}
