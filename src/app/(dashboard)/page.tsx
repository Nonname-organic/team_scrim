'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { WinRateCard } from '@/components/dashboard/WinRateCard'
import { WinRateTrendChart } from '@/components/charts/WinRateTrendChart'
import { EconomyWinRates } from '@/components/dashboard/EconomyWinRates'
import { FirstBloodImpact } from '@/components/dashboard/FirstBloodImpact'
import { SiteWinRates } from '@/components/dashboard/SiteWinRates'
import { RecentMatches } from '@/components/dashboard/RecentMatches'
import { RoundWinRates } from '@/components/dashboard/RoundWinRates'
import { TimingWinRates } from '@/components/dashboard/TimingWinRates'
import {
  EngagementSiteWinRates, DecidedPhaseStats, PlayerStateStats, RotationStats, LossTagStats,
  type RoundDetailData,
} from '@/components/dashboard/RoundDetailPanels'
import { AlertTriangle, FileDown } from 'lucide-react'
import { MAPS } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
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
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (!teamId) return
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (mapFilter)  params.set('map', mapFilter)
    if (typeFilter) params.set('match_type', typeFilter)
    if (dateFrom)   params.set('from', dateFrom)
    if (dateTo)     params.set('to', dateTo)

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
    // t は毎レンダー再生成されるため deps に入れると無限フェッチになる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFilter, typeFilter, dateFrom, dateTo, teamId])

  if (loading) return <LoadingState />
  if (error || !data) return <ErrorState message={error ?? 'No data'} dbSetup={!data && !!error} />

  const { summary, trend, economy, first_blood_impact, site_win_rates, round_win_rates, timing_win_rates, round_detail } =
    data as Record<string, unknown>
  const s = summary as Record<string, unknown>
  const rd = (round_detail ?? {}) as Partial<RoundDetailData> as RoundDetailData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Map filter */}
          <span className="text-xs text-muted-foreground shrink-0">{t('common.map')}</span>
          <select
            value={mapFilter}
            onChange={e => setMapFilter(e.target.value)}
            className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF4655] outline-none min-h-[40px]"
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
                'px-3 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[40px]',
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

          {/* 期間フィルター（カレンダー・キーボード入力両対応のネイティブ date input） */}
          <span className="text-xs text-muted-foreground shrink-0">{t('common.period')}</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF4655] outline-none min-h-[40px] [color-scheme:dark]"
          />
          <span className="text-xs text-muted-foreground">〜</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={e => setDateTo(e.target.value)}
            className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF4655] outline-none min-h-[40px] [color-scheme:dark]"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="px-3 py-2 rounded-lg text-xs font-medium border bg-muted border-border text-muted-foreground hover:text-white hover:border-white/30 transition-colors min-h-[40px]"
            >
              {t('common.reset')}
            </button>
          )}

          {/* PDF出力: 現在のフィルターを引き継いで印刷用レポートを別タブで開く */}
          <a
            href={`/export?${new URLSearchParams({
              ...(mapFilter  && { map: mapFilter }),
              ...(typeFilter && { match_type: typeFilter }),
              ...(dateFrom   && { from: dateFrom }),
              ...(dateTo     && { to: dateTo }),
            })}`}
            target="_blank"
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border bg-muted border-border text-muted-foreground hover:text-white hover:border-white/30 transition-colors min-h-[40px]"
          >
            <FileDown className="w-3.5 h-3.5" />
            {t('dashboard.exportPdf')}
          </a>
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

      {/* Site Win Rates: 交戦サイト別 / 設置サイト別（ポストプラント・リテイク） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title={t('roundDetail.engagementWinRate')}>
          <EngagementSiteWinRates data={rd.engagement} />
        </Panel>
        <Panel title={t('dashboard.siteWinRate')}>
          <SiteWinRates data={site_win_rates as Record<string, unknown>} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title={t('roundDetail.phaseTitle')}>
          <DecidedPhaseStats data={rd.decided_phase} />
        </Panel>
        <Panel title={t('roundDetail.playerStateTitle')}>
          <PlayerStateStats data={rd.player_state} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title={t('roundDetail.rotationTitle')}>
          <RotationStats data={rd.rotation} />
        </Panel>
        <Panel title={t('roundDetail.lossTagTitle')}>
          <LossTagStats data={rd.loss_tags} />
        </Panel>
      </div>

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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-card rounded-xl p-5 border border-border">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{title}</h2>
      {children}
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
