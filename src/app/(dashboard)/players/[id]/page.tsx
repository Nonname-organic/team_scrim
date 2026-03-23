'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { cn } from '@/lib/utils'

const ROLE_CONFIG: Record<string, { color: string; label: string }> = {
  duelist:    { color: '#FF4655', label: 'デュエリスト' },
  initiator:  { color: '#FF8C42', label: 'イニシエーター' },
  controller: { color: '#6C63FF', label: 'コントローラー' },
  sentinel:   { color: '#00D4A0', label: 'センチネル' },
  igl:        { color: '#FFD700', label: 'IGL' },
}

type Tab = 'overall' | 'map' | 'agent'
type TrendMetric = 'ACS' | 'KD' | 'KDA' | 'K'

const TREND_METRICS: { id: TrendMetric; label: string }[] = [
  { id: 'ACS',  label: 'ACS' },
  { id: 'KD',   label: 'K/D' },
  { id: 'KDA',  label: 'KDA' },
  { id: 'K',    label: 'Kill数' },
]

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overall')
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('ACS')
  const [selectedMap, setSelectedMap] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/players/${id}/stats`)
      .then(r => r.json())
      .then(j => { setData(j.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">読み込み中...</div>
  )
  if (!data) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">選手が見つかりません</div>
  )

  const career = data.career as Record<string, unknown> | null
  const recent = (data.recent ?? []) as Record<string, unknown>[]
  const radar = (data.radar ?? []) as Record<string, unknown>[]
  const mapStats = (data.map_stats ?? []) as Record<string, unknown>[]
  const agentStats = (data.agent_stats ?? []) as Record<string, unknown>[]

  if (!career) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">データがありません</div>
  )

  const roleCfg = ROLE_CONFIG[String(career.role ?? '')] ?? { color: '#9B9BA4', label: String(career.role ?? '') }

  const kpiCards = [
    { label: 'ACS',  value: Number(career.avg_acs  ?? 0).toFixed(0), threshold: 250 },
    { label: 'K/D',  value: Number(career.avg_kd   ?? 0).toFixed(2), threshold: 1.1 },
    { label: 'KPR',  value: Number(career.avg_kpr  ?? 0).toFixed(2), threshold: 0.7 },
  ]

  const trendData = [...recent].reverse().map((r, i) => {
    const k = Number(r.kills ?? 0)
    const d = Number(r.deaths ?? 0)
    const a = Number(r.assists ?? 0)
    return {
      name: `#${i + 1}`,
      ACS: Number(r.acs ?? 0),
      KD: Number(r.kd_ratio ?? 0),
      KDA: d > 0 ? Math.round(((k + a) / d) * 100) / 100 : k + a,
      K: k,
      map: String(r.map ?? ''),
    }
  })

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overall', label: '全体' },
    { id: 'map',     label: 'マップ別' },
    { id: 'agent',   label: 'エージェント別' },
  ]

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg border border-border text-muted-foreground hover:text-white hover:border-white/30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: `${roleCfg.color}20`, color: roleCfg.color }}
          >
            {String(career.ign ?? '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{String(career.ign ?? '')}</h1>
            <div className="text-xs mt-0.5" style={{ color: roleCfg.color }}>{roleCfg.label}</div>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-black text-white">{String(career.matches_played ?? 0)}</div>
          <div className="text-xs text-muted-foreground">試合</div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {kpiCards.map(c => {
          const raw = parseFloat(c.value)
          const isGood = raw >= c.threshold
          return (
            <div key={c.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className={cn('text-2xl font-black', isGood ? 'text-[#00D4A0]' : 'text-white')}>
                {c.value}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{c.label}</div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/20 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-[#FF4655] text-white'
                : 'text-muted-foreground hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overall tab */}
      {tab === 'overall' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Radar chart */}
            {radar.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  スキルレーダー
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radar}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v}`, 'スコア']}
                      contentStyle={{
                        background: '#18181F',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Radar
                      dataKey="value"
                      stroke={roleCfg.color}
                      fill={roleCfg.color}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Trend chart */}
            {trendData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    推移（直近{trendData.length}試合）
                  </div>
                  <select
                    value={trendMetric}
                    onChange={e => setTrendMetric(e.target.value as TrendMetric)}
                    className="bg-muted border border-border rounded-lg px-2.5 py-1 text-xs text-white focus:border-[#FF4655] outline-none"
                  >
                    {TREND_METRICS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#18181F',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [
                        trendMetric === 'ACS' || trendMetric === 'K' ? v : v.toFixed(2),
                        TREND_METRICS.find(m => m.id === trendMetric)?.label ?? trendMetric,
                      ]}
                    />
                    <Line dataKey={trendMetric} stroke="#FF4655" strokeWidth={2} dot={{ r: 3, fill: '#FF4655' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Recent matches table */}
          {recent.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <div className="text-sm font-semibold text-white">最近の試合</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['日付', 'マップ', '相手', '結果', 'エージェント', 'K', 'D', 'A', 'ACS', 'KD'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-wider font-medium whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r, i) => {
                      const res = String(r.result ?? 'draw')
                      const kd = Number(r.kd_ratio ?? 0)
                      const date = r.match_date
                        ? new Date(String(r.match_date)).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })
                        : '--'
                      return (
                        <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{date}</td>
                          <td className="px-4 py-2.5 text-white">{String(r.map ?? '--')}</td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{String(r.opponent_name ?? '--')}</td>
                          <td className="px-4 py-2.5">
                            <span className={cn(
                              'text-xs font-bold px-2 py-0.5 rounded',
                              res === 'win' ? 'bg-[#00D4A0]/15 text-[#00D4A0]' :
                              res === 'loss' ? 'bg-[#FF4655]/15 text-[#FF4655]' :
                              'bg-muted/30 text-muted-foreground'
                            )}>
                              {res === 'win' ? '勝' : res === 'loss' ? '敗' : '分'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{String(r.agent ?? '--')}</td>
                          <td className="px-4 py-2.5 text-[#00D4A0] font-bold">{String(r.kills ?? 0)}</td>
                          <td className="px-4 py-2.5 text-[#FF4655]">{String(r.deaths ?? 0)}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{String(r.assists ?? 0)}</td>
                          <td className="px-4 py-2.5 font-bold text-white">{String(r.acs ?? 0)}</td>
                          <td className={cn('px-4 py-2.5 font-semibold', kd >= 1.0 ? 'text-[#00D4A0]' : 'text-[#FF4655]')}>
                            {kd.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Map breakdown tab */}
      {tab === 'map' && (() => {
        const activeMap = selectedMap ?? (mapStats.length > 0 ? String(mapStats[0].map ?? '') : '')
        const mapRow = mapStats.find(r => String(r.map ?? '') === activeMap) ?? mapStats[0]
        const mapRadar = mapRow ? radarFromRow(mapRow) : []
        const mapTrend = buildTrendData(recent, 'map', activeMap)
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {mapRadar.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    スキルレーダー
                  </div>
                  <div className="text-sm font-bold text-white mb-3">{activeMap}</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={mapRadar}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${v}`, 'スコア']} contentStyle={{ background: '#18181F', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Radar dataKey="value" stroke={roleCfg.color} fill={roleCfg.color} fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">推移</div>
                    <div className="text-sm font-bold text-white mt-0.5">{activeMap}</div>
                  </div>
                  <select
                    value={trendMetric}
                    onChange={e => setTrendMetric(e.target.value as TrendMetric)}
                    className="bg-muted border border-border rounded-lg px-2.5 py-1 text-xs text-white focus:border-[#FF4655] outline-none"
                  >
                    {TREND_METRICS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                {mapTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={mapTrend} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#18181F', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => [trendMetric === 'ACS' || trendMetric === 'K' ? v : v.toFixed(2), TREND_METRICS.find(m => m.id === trendMetric)?.label ?? trendMetric]} />
                      <Line dataKey={trendMetric} stroke={roleCfg.color} strokeWidth={2} dot={{ r: 3, fill: roleCfg.color }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">
                    直近データなし
                  </div>
                )}
              </div>
            </div>
            <BreakdownTable
              rows={mapStats} nameKey="map" nameLabel="マップ" color={roleCfg.color}
              selected={activeMap} onSelect={setSelectedMap}
            />
          </div>
        )
      })()}

      {/* Agent breakdown tab */}
      {tab === 'agent' && (() => {
        const activeAgent = selectedAgent ?? (agentStats.length > 0 ? String(agentStats[0].agent ?? '') : '')
        const agentRow = agentStats.find(r => String(r.agent ?? '') === activeAgent) ?? agentStats[0]
        const agentRadar = agentRow ? radarFromRow(agentRow) : []
        const agentTrend = buildTrendData(recent, 'agent', activeAgent)
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {agentRadar.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    スキルレーダー
                  </div>
                  <div className="text-sm font-bold text-white mb-3">{activeAgent}</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={agentRadar}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${v}`, 'スコア']} contentStyle={{ background: '#18181F', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Radar dataKey="value" stroke={roleCfg.color} fill={roleCfg.color} fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">推移</div>
                    <div className="text-sm font-bold text-white mt-0.5">{activeAgent}</div>
                  </div>
                  <select
                    value={trendMetric}
                    onChange={e => setTrendMetric(e.target.value as TrendMetric)}
                    className="bg-muted border border-border rounded-lg px-2.5 py-1 text-xs text-white focus:border-[#FF4655] outline-none"
                  >
                    {TREND_METRICS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                {agentTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={agentTrend} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#18181F', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => [trendMetric === 'ACS' || trendMetric === 'K' ? v : v.toFixed(2), TREND_METRICS.find(m => m.id === trendMetric)?.label ?? trendMetric]} />
                      <Line dataKey={trendMetric} stroke={roleCfg.color} strokeWidth={2} dot={{ r: 3, fill: roleCfg.color }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">
                    直近データなし
                  </div>
                )}
              </div>
            </div>
            <BreakdownTable
              rows={agentStats} nameKey="agent" nameLabel="エージェント" color={roleCfg.color}
              selected={activeAgent} onSelect={setSelectedAgent}
            />
          </div>
        )
      })()}
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

function radarFromRow(row: Record<string, unknown>) {
  return [
    { subject: 'ACS',  value: Math.min(100, Math.round((Number(row.avg_acs ?? 0) / 300) * 100)), fullMark: 100 },
    { subject: 'KD',   value: Math.min(100, Math.round((Number(row.avg_kd  ?? 0) / 1.8) * 100)), fullMark: 100 },
    { subject: 'KPR',  value: Math.min(100, Math.round((Number(row.avg_kpr ?? 0) / 1.0) * 100)), fullMark: 100 },
  ]
}

function buildTrendData(
  recent: Record<string, unknown>[],
  filterKey: string,
  filterValue: string
) {
  return [...recent]
    .filter(r => String(r[filterKey] ?? '') === filterValue)
    .reverse()
    .map((r, i) => {
      const k = Number(r.kills ?? 0)
      const d = Number(r.deaths ?? 0)
      const a = Number(r.assists ?? 0)
      return {
        name: `#${i + 1}`,
        ACS: Number(r.acs ?? 0),
        KD: Number(r.kd_ratio ?? 0),
        KDA: d > 0 ? Math.round(((k + a) / d) * 100) / 100 : k + a,
        K: k,
      }
    })
}

// ============================================================

function BreakdownTable({
  rows,
  nameKey,
  nameLabel,
  color,
  selected,
  onSelect,
}: {
  rows: Record<string, unknown>[]
  nameKey: string
  nameLabel: string
  color: string
  selected?: string
  onSelect?: (name: string) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">データがありません</div>
    )
  }

  const headers = [nameLabel, '試合数', '勝率', 'Avg ACS', 'Avg K', 'Avg D', 'Avg A', 'KPR']

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {headers.map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] text-muted-foreground uppercase tracking-wider font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const matches = Number(r.matches_played ?? 0)
              const wins = Number(r.wins ?? 0)
              const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0
              const kpr = Number(r.avg_kpr ?? 0)
              const rowName = String(r[nameKey] ?? '')
              const isSelected = selected === rowName
              return (
                <tr
                  key={i}
                  onClick={() => onSelect?.(rowName)}
                  className={cn(
                    'border-b border-border/50 last:border-0 transition-colors',
                    onSelect ? 'cursor-pointer' : '',
                    isSelected ? 'bg-muted/30' : 'hover:bg-muted/20'
                  )}
                >
                  <td className="px-4 py-3 font-semibold flex items-center gap-2" style={{ color }}>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
                    {rowName || '--'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{matches}</td>
                  <td className="px-4 py-3">
                    <span className={cn('font-bold', winRate >= 50 ? 'text-[#00D4A0]' : 'text-[#FF4655]')}>
                      {winRate}%
                    </span>
                    <span className="text-muted-foreground text-xs ml-1">({wins}W)</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-white">{Number(r.avg_acs ?? 0).toFixed(0)}</td>
                  <td className="px-4 py-3 text-[#00D4A0]">{Number(r.avg_kills ?? 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-[#FF4655]">{Number(r.avg_deaths ?? 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{Number(r.avg_assists ?? 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{kpr.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
