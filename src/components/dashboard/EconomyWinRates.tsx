'use client'
import { cn } from '@/lib/utils'

interface Row {
  economy_type: string
  rounds: number
  wins: number
  win_rate: number
}

const LABELS: Record<string, string> = {
  pistol:   'ピストル',
  eco:      'エコ',
  anti_eco: 'アンチエコ',
  semi_eco: 'セミエコ',
  semi_buy: 'セミバイ',
  full_buy: 'フルバイ',
  oper:     'オペ',
  second:   'セカンド',
  third:    'サード',
}

const IDEAL: Record<string, number> = {
  pistol:   0.5,
  eco:      0.2,
  anti_eco: 0.6,
  semi_eco: 0.35,
  semi_buy: 0.45,
  full_buy: 0.6,
  oper:     0.55,
  second:   0.5,
  third:    0.5,
}

export function EconomyWinRates({ data: rawData }: { data: Record<string, unknown>[] }) {
  const data = rawData as unknown as Row[]
  if (!data?.length) return <Empty />

  return (
    <div className="space-y-3">
      {data.map(row => {
        const pct = Math.round(row.win_rate * 100)
        const ideal = Math.round((IDEAL[row.economy_type] ?? 0.5) * 100)
        const isBelow = pct < ideal - 5
        const isGood  = pct >= ideal

        return (
          <div key={row.economy_type} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">
                  {LABELS[row.economy_type] ?? row.economy_type}
                </span>
                <span className="text-muted-foreground">
                  {row.wins}W / {row.rounds}R
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'font-bold',
                  isGood ? 'text-[#00D4A0]' : isBelow ? 'text-[#FF4655]' : 'text-[#FF8C42]'
                )}>
                  {pct}%
                </span>
                {isBelow && (
                  <span className="text-[10px] text-[#FF4655] bg-[#FF4655]/10 px-1.5 py-0.5 rounded">
                    低
                  </span>
                )}
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden relative">
              {/* Ideal marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-white/20"
                style={{ left: `${ideal}%` }}
              />
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: isGood ? '#00D4A0' : isBelow ? '#FF4655' : '#FF8C42',
                }}
              />
            </div>
          </div>
        )
      })}
      <p className="text-[10px] text-muted-foreground pt-1">
        縦線 = 期待値ベースライン
      </p>
    </div>
  )
}

function Empty() {
  return <p className="text-sm text-muted-foreground">データなし</p>
}
