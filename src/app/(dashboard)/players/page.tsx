'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { PlayerCareerStats } from '@/types'

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? 'YOUR_TEAM_UUID'

const ROLE_CONFIG: Record<string, { color: string; label: string }> = {
  duelist:   { color: '#FF4655', label: 'デュエリスト' },
  initiator: { color: '#FF8C42', label: 'イニシエーター' },
  controller:{ color: '#6C63FF', label: 'コントローラー' },
  sentinel:  { color: '#00D4A0', label: 'センチネル' },
  igl:       { color: '#FFD700', label: 'IGL' },
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<(PlayerCareerStats & { ign: string; role: string })[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [radarData, setRadarData] = useState<Record<string, unknown>[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/players?team_id=${TEAM_ID}`)
      .then(r => r.json())
      .then(json => {
        setPlayers(json.data ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!selected) { setRadarData(null); return }
    fetch(`/api/players/${selected}/stats`)
      .then(r => r.json())
      .then(json => setRadarData(json.data?.radar ?? null))
  }, [selected])

  if (loading) return <div className="text-muted-foreground text-sm p-8">読み込み中...</div>

  const selectedPlayer = players.find(p => p.player_id === selected)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">プレイヤー</h1>
        <p className="text-muted-foreground text-sm mt-1">選手スタッツ・パフォーマンス分析</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player list */}
        <div className="lg:col-span-2 space-y-2">
          {/* Stats table header */}
          <div className="grid grid-cols-6 text-[10px] text-muted-foreground uppercase tracking-wider px-3 py-2">
            <div className="col-span-2">選手</div>
            <div className="text-right">ACS</div>
            <div className="text-right">KD</div>
            <div className="text-right">FBSR</div>
            <div className="text-right">試合</div>
          </div>

          {players.map(p => {
            const roleCfg = ROLE_CONFIG[p.role] ?? { color: '#9B9BA4', label: p.role }
            const isSelected = selected === p.player_id

            return (
              <button
                key={p.player_id}
                onClick={() => setSelected(isSelected ? null : p.player_id)}
                className={cn(
                  'w-full grid grid-cols-6 items-center p-3 rounded-xl border text-sm transition-all',
                  isSelected
                    ? 'bg-[#FF4655]/10 border-[#FF4655]/30'
                    : 'bg-card border-border hover:bg-muted/30'
                )}
              >
                <div className="col-span-2 flex items-center gap-2 text-left">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${roleCfg.color}20`, color: roleCfg.color }}
                  >
                    {p.ign.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs">{p.ign}</div>
                    <div className="text-[10px]" style={{ color: roleCfg.color }}>
                      {roleCfg.label}
                    </div>
                  </div>
                </div>
                <StatCell value={Number(p.avg_acs).toFixed(0)} threshold={250} />
                <StatCell value={Number(p.avg_kd).toFixed(2)} threshold={1.1} />
                <StatCell value={(Number(p.career_fbsr) * 100).toFixed(1) + '%'} rawValue={Number(p.career_fbsr)} threshold={0.5} />
                <div className="text-right text-muted-foreground text-xs">{p.matches_played}</div>
              </button>
            )
          })}
        </div>

        {/* Radar chart panel */}
        <div className="bg-card rounded-xl border border-border p-5">
          {selectedPlayer && radarData ? (
            <div>
              <div className="mb-4">
                <div className="font-bold text-white">{selectedPlayer.ign}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {ROLE_CONFIG[selectedPlayer.role]?.label ?? selectedPlayer.role}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
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
                    stroke="#FF4655"
                    fill="#FF4655"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>

              {/* Quick stats */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <MiniStat label="ACS" value={Number(selectedPlayer.avg_acs).toFixed(0)} />
                <MiniStat label="K/D" value={Number(selectedPlayer.avg_kd).toFixed(2)} />
                <MiniStat label="FBSR" value={(Number(selectedPlayer.career_fbsr) * 100).toFixed(1) + '%'} />
              </div>

              <Link
                href={`/players/${selectedPlayer.player_id}`}
                className="mt-4 block text-center text-xs text-[#FF4655] hover:underline"
              >
                詳細ページ →
              </Link>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center py-12">
              <div>
                <div className="text-muted-foreground text-sm">選手を選択</div>
                <div className="text-muted-foreground text-xs mt-1">
                  レーダーチャートを表示します
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCell({
  value, rawValue, threshold,
}: {
  value: string | undefined
  rawValue?: number
  threshold: number
}) {
  const raw = rawValue ?? parseFloat(value ?? '0')
  const isGood = raw >= threshold

  return (
    <div className={cn(
      'text-right text-xs font-semibold',
      isGood ? 'text-[#00D4A0]' : 'text-muted-foreground'
    )}>
      {value ?? '--'}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="bg-muted/30 rounded-lg p-2 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-white font-bold mt-0.5">{value ?? '--'}</div>
    </div>
  )
}
