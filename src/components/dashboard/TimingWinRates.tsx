'use client'

interface Row {
  contact_timing: string
  side: string
  total: number
  wins: number
  win_rate: number
}

const TIMING_CFG = {
  early: { label: 'Early', sublabel: 'ラッシュ',   color: '#FF4655' },
  mid:   { label: 'Mid',   sublabel: 'デフォルト', color: '#9B5CF6' },
  late:  { label: 'Late',  sublabel: 'スロウ',     color: '#E8B84B' },
} as const

export function TimingWinRates({ data: rawData }: { data: Record<string, unknown>[] }) {
  const data = rawData as unknown as Row[]
  if (!data?.length) return <p className="text-sm text-muted-foreground">データなし</p>

  const timings = (['early', 'mid', 'late'] as const).map(t => {
    const atk = data.find(r => r.contact_timing === t && r.side === 'attack')
    const def = data.find(r => r.contact_timing === t && r.side === 'defense')
    return { timing: t, atk, def }
  }).filter(t => t.atk || t.def)

  if (!timings.length) return <p className="text-sm text-muted-foreground">データなし</p>

  return (
    <div className="space-y-4">
      {timings.map(({ timing, atk, def }) => {
        const cfg = TIMING_CFG[timing]
        return (
          <div key={timing}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: cfg.color, background: `${cfg.color}20` }}>
                {cfg.label}
              </span>
              <span className="text-xs text-muted-foreground">{cfg.sublabel}</span>
            </div>
            <div className="space-y-2 pl-2">
              {atk && <WrBar label="ATK" color="#FF8C42" wins={Number(atk.wins)} total={Number(atk.total)} />}
              {def && <WrBar label="DEF" color="#00D4A0" wins={Number(def.wins)} total={Number(def.total)} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WrBar({ label, color, wins, total }: { label: string; color: string; wins: number; total: number }) {
  const pct = total > 0 ? Math.round((wins / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span>
          <span className="font-bold" style={{ color: pct >= 50 ? '#00D4A0' : '#FF4655' }}>{pct}%</span>
          <span className="text-muted-foreground/60 ml-1">{wins}/{total}</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
