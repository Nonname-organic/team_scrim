import { NextRequest, NextResponse } from 'next/server'
import {
  getDashboardSummary,
  getWinRateTrend,
  getEconomyWinRates,
  getFirstBloodImpact,
  getRoundNumberWinRates,
  getRoundSiteStats,
  getTimingWinRates,
} from '@/lib/analysis'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { serverError } from '@/lib/api-error'
import { isRateLimited, rateLimitedResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { logger, hashRequestMeta, newRequestId } from '@/lib/logger'

type SiteRow = { plant_site: string; side: string; wins: number; total: number; win_rate: number }
type Entry   = { wins: number; total: number; win_rate: number }

function toEntry(r: SiteRow | undefined): Entry | undefined {
  if (!r) return undefined
  return { wins: Number(r.wins), total: Number(r.total), win_rate: Number(r.win_rate) }
}

function buildSiteWinRates(siteStats: { by_site: SiteRow[]; post_plant: Entry | null }) {
  const bs = siteStats.by_site ?? []
  const find = (site: string, side: string) => bs.find(r => r.plant_site === site && r.side === side)
  const pp = siteStats.post_plant
  return {
    a_attack:   toEntry(find('A', 'attack')),
    b_attack:   toEntry(find('B', 'attack')),
    c_attack:   toEntry(find('C', 'attack')),
    a_retake:   toEntry(find('A', 'defense')),
    b_retake:   toEntry(find('B', 'defense')),
    c_retake:   toEntry(find('C', 'defense')),
    post_plant: pp ? { wins: Number(pp.wins), total: Number(pp.total), win_rate: Number(pp.win_rate) } : undefined,
  }
}

// ============================================================
// Export report data — self-team only, rate-limited, audited (PR-4)
// ============================================================
export async function GET(req: NextRequest) {
  const requestId = newRequestId()
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const { ipHash, userAgentHash } = hashRequestMeta(req)

  // ── Rate limit: 1チーム10回/時 ──
  if (await isRateLimited(RATE_LIMITS.exportHourly(auth.teamId))) {
    logger.security({
      eventType: 'rate_limit_exceeded',
      requestId, teamId: auth.teamId, userId: auth.userId,
      path: '/api/export/report', ipHash, userAgentHash,
      message: 'export hourly limit exceeded',
    })
    return rateLimitedResponse()
  }

  const sp = new URL(req.url).searchParams
  const map       = sp.get('map')        ?? undefined
  const matchType = sp.get('match_type') ?? undefined

  try {
    // team_id はクエリではなく必ず auth.teamId を使用（他チーム出力の禁止）
    const [summary, trend, economy, fbImpact, roundWinRates, siteStats, timingWinRates] = await Promise.all([
      getDashboardSummary(auth.teamId, map, matchType),
      getWinRateTrend(auth.teamId, 20, map, matchType),
      getEconomyWinRates(auth.teamId, map, matchType),
      getFirstBloodImpact(auth.teamId, map, matchType),
      getRoundNumberWinRates(auth.teamId, map, matchType),
      getRoundSiteStats(auth.teamId, map, matchType),
      getTimingWinRates(auth.teamId, map, matchType),
    ])

    const siteWinRates = buildSiteWinRates(siteStats as { by_site: SiteRow[]; post_plant: Entry | null })

    // 監査用 row_count（出力データ量の指標）
    const rowCount =
      (Array.isArray(economy) ? economy.length : 0) +
      (Array.isArray(timingWinRates) ? timingWinRates.length : 0) +
      (Array.isArray(trend) ? trend.length : 0)

    logger.audit({
      requestId, teamId: auth.teamId, userId: auth.userId,
      action: 'export',
      resource: 'dashboard_report', resourceId: auth.teamId,
      metadata: { export_type: 'dashboard_report', row_count: rowCount, filters: { map, match_type: matchType } },
    })

    return NextResponse.json({
      data: {
        summary,
        trend,
        economy,
        first_blood_impact: fbImpact,
        site_win_rates: siteWinRates,
        round_win_rates: roundWinRates,
        timing_win_rates: timingWinRates,
      },
    })
  } catch (err) {
    return serverError('export/report GET', err)
  }
}
