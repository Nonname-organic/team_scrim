import { NextRequest, NextResponse } from 'next/server'
import {
  getDashboardSummary,
  getWinRateTrend,
  getEconomyWinRates,
  getFirstBloodImpact,
  getSiteWinRates,
  getRoundNumberWinRates,
  getRoundSiteStats,
} from '@/lib/analysis'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id')

  if (!teamId) {
    return NextResponse.json({ error: 'team_id required' }, { status: 400 })
  }

  const map = searchParams.get('map') ?? undefined

  try {
    const [summary, trend, economy, fbImpact, sites, roundWinRates, siteStats] = await Promise.all([
      getDashboardSummary(teamId, map),
      getWinRateTrend(teamId, 20, map),
      getEconomyWinRates(teamId, map),
      getFirstBloodImpact(teamId, map),
      getSiteWinRates(teamId),
      getRoundNumberWinRates(teamId, map),
      getRoundSiteStats(teamId, map),
    ])

    return NextResponse.json({
      data: {
        summary,
        trend,
        economy,
        first_blood_impact: fbImpact,
        site_win_rates: sites,
        round_win_rates: roundWinRates,
        site_stats: siteStats,
      },
    })
  } catch (err) {
    console.error('[dashboard]', err)
    return NextResponse.json({ error: 'DB connection failed', details: String(err) }, { status: 503 })
  }
}
