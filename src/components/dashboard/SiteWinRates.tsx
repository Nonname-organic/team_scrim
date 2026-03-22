'use client'
import { cn } from '@/lib/utils'

interface SiteData {
  wins: number
  total: number
  win_rate: number | null
}

interface Props {
  data: Record<string, SiteData>
}

const SITE_LABELS: Record<string, { label: string; side: string }> = {
  a_attack:   { label: 'A アタック',    side: 'attack' },
  b_attack:   { label: 'B アタック',    side: 'attack' },
  a_retake:   { label: 'A リテイク',    side: 'defense' },
  b_retake:   { label: 'B リテイク',    side: 'defense' },
  post_plant: { label: 'ポストプラント', side: 'both' },
}

export function SiteWinRates({ data }: Props) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-sm text-muted-foreground">データなし</p>
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {Object.entries(SITE_LABELS).map(([key, { label, side }]) => {
        const item = data[key] as SiteData | undefined
        if (!item) return null

        const pct = item.win_rate !== null ? Math.round(item.win_rate * 10) / 10 : null
        const color =
          pct === null ? '#9B9BA4' :
          pct >= 50 ? '#00D4A0' :
          pct >= 35 ? '#FF8C42' : '#FF4655'

        return (
          <div key={key} className="bg-muted/30 rounded-xl p-4 text-center relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{ background: color }}
            />
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              {label}
            </div>
            <div className="text-2xl font-bold" style={{ color }}>
              {pct !== null ? `${pct}%` : '--'}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {item.wins}W / {item.total}R
            </div>
            {/* Progress ring (simplified) */}
            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct ?? 0}%`, background: color }}
              />
            </div>
            <div className={cn(
              'text-[10px] mt-1.5 px-1.5 py-0.5 rounded inline-block',
              side === 'attack' ? 'bg-[#FF8C42]/10 text-[#FF8C42]' :
              side === 'defense' ? 'bg-[#00D4A0]/10 text-[#00D4A0]' :
              'bg-[#6C63FF]/10 text-[#6C63FF]'
            )}>
              {side === 'attack' ? 'ATK' : side === 'defense' ? 'DEF' : 'ALL'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
