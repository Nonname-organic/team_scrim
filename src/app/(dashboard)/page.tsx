'use client'
import { useEffect, useState } from 'react'
import { WinRateCard } from '@/components/dashboard/WinRateCard'
import { WinRateTrendChart } from '@/components/charts/WinRateTrendChart'
import { EconomyWinRates } from '@/components/dashboard/EconomyWinRates'
import { FirstBloodImpact } from '@/components/dashboard/FirstBloodImpact'
import { SiteWinRates } from '@/components/dashboard/SiteWinRates'
import { RecentMatches } from '@/components/dashboard/RecentMatches'
import { RoundWinRates } from '@/components/dashboard/RoundWinRates'
import { TimingWinRates } from '@/components/dashboard/TimingWinRates'
import { AlertTriangle } from 'lucide-react'
import { MAPS } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { LockedFeature } from '@/components/pricing/LockedFeature'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

type TypeFilter = '' | 'official' | 'practice'
const TYPE_LABELS: Record<string, string> = { official: 'Competitive', practice: 'Practice' }

export default function DashboardPage() {
  const { teamId } = useAuth()
  const { t } = useLanguage()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapFilter, setMapFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('')

  useEffect(() => {
    if (!teamId) return
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (mapFilter)  params.set('map', mapFilter)
    if (typeFilter) params.set('match_type', typeFilter)

    fetch(`/api/analysis/dashboard${params.size ? `?${params}` : ''}`)
      .then(r => {
        if (!r.ok) return r.json().then(j => { throw new Error(`${j.error ?? `HTTP ${r.status}`}${j.details ? `: ${j.details}` : ''}`) })
        return r.json()
      })
      .then(json => {
        setData(json.data ?? null)
        if (!json.data) setError(t('dashboard.noData'))
        setLoading(false)
      })
      .catch(e => {
        setError(String(e))
        setLoading(false)
      })
  }, [mapFilter, typeFilter, teamId])

  if (loading) return <LoadingState />
  if (error || !data) return <ErrorState message={error ?? 'No data'} dbSetup={!data && !!error} />

  const { summary, trend, economy, first_blood_impact, site_win_rates, round_win_rates, timing_win_rates } =
    data as Record<string, unknown>
  const s = summary as Record<string, unknown>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Map filter */}
          <span className="text-xs text-muted-foreground">{t('common.map')}</span>
          <select
            value={mapFilter}
            onChange={e => setMapFilter(e.target.value)}
            className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#FF4655] outline-none"
          >
            <option value="">{t('common.allMaps')}</option>
            {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {/* 種別フィルター */}
          {(['official', 'practice'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(prev => prev === t ? '' : t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                typeFilter === t
                  ? t === 'official'
                    ? 'bg-[#00D4A0]/15 border-[#00D4A0]/40 text-[#00D4A0]'
                    : 'bg-[#6C63FF]/15 border-[#6C63FF]/40 text-[#6C63FF]'
                  : 'bg-muted border-border text-muted-foreground hover:text-white hover:border-white/30'
              )}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}

        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <WinRateCard
          label={t('dashboard.overallWinRate')}
          value={Number(s.overall_win_rate)}
          matches={Number((s.recent_matches as unknown[]).length)}
          type="overall"
        />
        <WinRateCard
          label={t('dashboard.attackWinRate')}
          value={Number(s.attack_win_rate)}
          type="attack"
        />
        <WinRateCard
          label={t('dashboard.defenseWinRate')}
          value={Number(s.defense_win_rate)}
          type="defense"
        />
        <WinRateCard
          label={t('dashboard.recent5')}
          value={computeRecentWR(s.recent_matches as Record<string, unknown>[], 5)}
          matches={5}
          type="recent"
        />
      </div>

      {/* Win Rate Trend */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {t('dashboard.winRateTrend')}
        </h2>
        <WinRateTrendChart data={trend as Record<string, unknown>[]} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {t('dashboard.economyWinRate')}
          </h2>
          <EconomyWinRates data={economy as Record<string, unknown>[]} />
        </div>

        <div className="bg-card rounded-xl p-5 border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {t('dashboard.firstBloodImpact')}
          </h2>
          <FirstBloodImpact data={first_blood_impact as Record<string, unknown>[]} />
        </div>
      </div>

      {/* Site Win Rates */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {t('dashboard.siteWinRate')}
        </h2>
        <SiteWinRates data={site_win_rates as Record<string, unknown>} />
      </div>

      {/* Round Win Rates + Timing Win Rates — Pro locked */}
      <LockedFeature
        requiredPlan="pro"
        trigger={{
          feature: 'growth_tracking',
          title: '成長トラッキングを解放',
          message: 'ラウンド番号別・タイミング別の勝率分析はProプランの機能です。弱点パターンを数値で把握し、練習に活かしましょう。',
        }}
        preview={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-5 border border-border h-48" />
            <div className="bg-card rounded-xl p-5 border border-border h-48" />
          </div>
        }
        minHeight={200}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl p-5 border border-border">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {t('dashboard.roundNumberWinRate')}
            </h2>
            <RoundWinRates data={round_win_rates as Record<string, unknown>[]} />
          </div>

          <div className="bg-card rounded-xl p-5 border border-border">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {t('dashboard.timingWinRate')}
            </h2>
            <TimingWinRates data={(timing_win_rates ?? []) as Record<string, unknown>[]} />
          </div>
        </div>
      </LockedFeature>

      {/* Recent Matches */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {t('dashboard.recentMatches')}
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
  const { t } = useLanguage()
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#FF4655] border-t-transparent animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      </div>
    </div>
  )
}

function ErrorState({ message, dbSetup }: { message: string; dbSetup?: boolean }) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-card border border-border rounded-2xl p-10 text-center max-w-md w-full space-y-4">
        <AlertTriangle className="w-12 h-12 text-[#FF4655] mx-auto" />
        <p className="text-white font-bold text-lg">
          {dbSetup ? 'DB未接続' : t('dashboard.loadError')}
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
