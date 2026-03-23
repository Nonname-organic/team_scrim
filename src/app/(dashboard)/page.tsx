'use client'
import { useEffect, useState } from 'react'
import { WinRateCard } from '@/components/dashboard/WinRateCard'
import { WinRateTrendChart } from '@/components/charts/WinRateTrendChart'
import { EconomyWinRates } from '@/components/dashboard/EconomyWinRates'
import { FirstBloodImpact } from '@/components/dashboard/FirstBloodImpact'
import { SiteWinRates } from '@/components/dashboard/SiteWinRates'
import { RecentMatches } from '@/components/dashboard/RecentMatches'
import { RoundWinRates } from '@/components/dashboard/RoundWinRates'
import { AlertTriangle } from 'lucide-react'
import { MAPS } from '@/types'

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? 'YOUR_TEAM_UUID'

export default function DashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapFilter, setMapFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ team_id: TEAM_ID })
    if (mapFilter) params.set('map', mapFilter)

    fetch(`/api/analysis/dashboard?${params}`)
      .then(r => {
        if (!r.ok) return r.json().then(j => { throw new Error(`${j.error ?? `HTTP ${r.status}`}${j.details ? `: ${j.details}` : ''}`) })
        return r.json()
      })
      .then(json => {
        setData(json.data ?? null)
        if (!json.data) setError('データがありません。まず試合を追加してください。')
        setLoading(false)
      })
      .catch(e => {
        setError(String(e))
        setLoading(false)
      })
  }, [mapFilter])

  if (loading) return <LoadingState />
  if (error || !data) return <ErrorState message={error ?? 'No data'} dbSetup={!data && !!error} />

  const { summary, trend, economy, first_blood_impact, site_win_rates, round_win_rates } =
    data as Record<string, unknown>
  const s = summary as Record<string, unknown>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
          <p className="text-muted-foreground text-sm mt-1">チームパフォーマンス概要</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">マップ</span>
          <select
            value={mapFilter}
            onChange={e => setMapFilter(e.target.value)}
            className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#FF4655] outline-none"
          >
            <option value="">すべてのマップ</option>
            {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {mapFilter && (
            <button
              onClick={() => setMapFilter('')}
              className="text-xs text-muted-foreground hover:text-white px-2 py-1.5 rounded border border-border transition-colors"
            >
              リセット
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <WinRateCard
          label="総合勝率"
          value={Number(s.overall_win_rate)}
          matches={Number((s.recent_matches as unknown[]).length)}
          type="overall"
        />
        <WinRateCard
          label="攻め勝率"
          value={Number(s.attack_win_rate)}
          type="attack"
        />
        <WinRateCard
          label="守り勝率"
          value={Number(s.defense_win_rate)}
          type="defense"
        />
        <WinRateCard
          label="直近5試合"
          value={computeRecentWR(s.recent_matches as Record<string, unknown>[], 5)}
          matches={5}
          type="recent"
        />
      </div>

      {/* Win Rate Trend */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          勝率推移（直近20試合）
        </h2>
        <WinRateTrendChart data={trend as Record<string, unknown>[]} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            エコノミー別勝率
          </h2>
          <EconomyWinRates data={economy as Record<string, unknown>[]} />
        </div>

        <div className="bg-card rounded-xl p-5 border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            ファーストブラッド影響
          </h2>
          <FirstBloodImpact data={first_blood_impact as Record<string, unknown>[]} />
        </div>
      </div>

      {/* Site Win Rates */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          サイト・ポストプラント勝率
        </h2>
        <SiteWinRates data={site_win_rates as Record<string, unknown>} />
      </div>

      {/* Round Win Rates */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          ラウンド番号別勝率
        </h2>
        <RoundWinRates data={round_win_rates as Record<string, unknown>[]} />
      </div>

      {/* Recent Matches */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          直近マッチ
        </h2>
        <RecentMatches matches={s.recent_matches as Record<string, unknown>[]} />
      </div>
    </div>
  )
}

function computeRecentWR(matches: Record<string, unknown>[], n: number): number {
  if (!matches?.length) return 0
  const recent = matches.slice(0, n)
  return recent.filter(m => m.result === 'win').length / recent.length
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#FF4655] border-t-transparent animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">データを読み込み中...</p>
      </div>
    </div>
  )
}

function ErrorState({ message, dbSetup }: { message: string; dbSetup?: boolean }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-card border border-border rounded-2xl p-10 text-center max-w-md w-full space-y-4">
        <AlertTriangle className="w-12 h-12 text-[#FF4655] mx-auto" />
        <p className="text-white font-bold text-lg">
          {dbSetup ? 'DB未接続' : '読み込みエラー'}
        </p>
        <p className="text-muted-foreground text-sm">{message}</p>
        {dbSetup && (
          <div className="bg-muted/30 rounded-xl p-4 text-left text-xs space-y-2 mt-2">
            <p className="text-white font-semibold">セットアップ手順：</p>
            <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
              <li>RailwayでPostgreSQL Public URLを取得</li>
              <li><code className="text-[#FF4655]">.env.local</code> の DATABASE_URL を更新</li>
              <li><code className="text-[#FF4655]">npm run db:push</code> でスキーマ適用</li>
              <li><code className="text-[#FF4655]">npm run db:seed</code> でサンプルデータ投入</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
