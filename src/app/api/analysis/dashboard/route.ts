import { NextRequest, NextResponse } from 'next/server'
import {
  getDashboardSummary,
  getWinRateTrend,
  getEconomyWinRates,
  getFirstBloodImpact,
  getRoundNumberWinRates,
  getRoundSiteStats,
  getTimingWinRates,
  getRoundDetailStats,
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

  const sp = new URL(req.url).searchParams
  const map       = sp.get('map')        ?? undefined
  const matchType = sp.get('match_type') ?? undefined
  // yyyy-mm-dd 以外は無視（SQL は $N バインドだが Postgres の date キャストエラーを防ぐ）
  const asDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)
  const from = asDate(sp.get('from'))
  const to   = asDate(sp.get('to'))

  try {
    const [summary, trend, economy, fbImpact, roundWinRates, siteStats, timingWinRates, roundDetail] = await Promise.all([
      getDashboardSummary(auth.teamId, map, matchType, from, to),
      getWinRateTrend(auth.teamId, 20, map, matchType, from, to),
      getEconomyWinRates(auth.teamId, map, matchType, from, to),
      getFirstBloodImpact(auth.teamId, map, matchType, from, to),
      getRoundNumberWinRates(auth.teamId, map, matchType, from, to),
      getRoundSiteStats(auth.teamId, map, matchType, from, to),
      getTimingWinRates(auth.teamId, map, matchType, from, to),
      getRoundDetailStats(auth.teamId, map, matchType, from, to),
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
        round_detail: roundDetail,
      },
    })
  } catch (err) {
    console.error('[dashboard]', err)
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 503 })
  }
}
