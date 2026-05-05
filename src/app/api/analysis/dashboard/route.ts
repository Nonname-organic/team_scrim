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

export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const map = new URL(req.url).searchParams.get('map') ?? undefined

  try {
    const [summary, trend, economy, fbImpact, roundWinRates, siteStats, timingWinRates] = await Promise.all([
      getDashboardSummary(auth.teamId, map),
      getWinRateTrend(auth.teamId, 20, map),
      getEconomyWinRates(auth.teamId, map),
      getFirstBloodImpact(auth.teamId, map),
      getRoundNumberWinRates(auth.teamId, map),
      getRoundSiteStats(auth.teamId, map),
      getTimingWinRates(auth.teamId, map),
    ])

    return NextResponse.json({
      data: {
        summary,
        trend,
        economy,
        first_blood_impact: fbImpact,
        site_win_rates: buildSiteWinRates(siteStats as { by_site: SiteRow[]; post_plant: Entry | null }),
        round_win_rates: roundWinRates,
        timing_win_rates: timingWinRates,
      },
    })
  } catch (err) {
    console.error('[dashboard]', err)
    return NextResponse.json({ error: 'DB connection failed', details: String(err) }, { status: 503 })
  }
}
