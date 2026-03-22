'use client'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: number        // 0.0 - 1.0
  matches?: number
  type: 'overall' | 'attack' | 'defense' | 'recent'
}

const typeColors = {
  overall: '#FF4655',
  attack:  '#FF8C42',
  defense: '#00D4A0',
  recent:  '#6C63FF',
}

export function WinRateCard({ label, value, matches, type }: Props) {
  const pct = Math.round(value * 100)
  const color = typeColors[type]

  const Trend = pct >= 55 ? TrendingUp : pct <= 40 ? TrendingDown : Minus
  const trendColor = pct >= 55 ? '#00D4A0' : pct <= 40 ? '#FF4655' : '#9B9BA4'

  return (
    <div
      className="bg-card rounded-xl p-5 border border-border relative overflow-hidden"
      style={{ borderTop: `2px solid ${color}` }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 blur-2xl"
        style={{ background: color }}
      />

      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <span className="text-3xl font-bold text-white">{pct}</span>
          <span className="text-lg text-muted-foreground ml-0.5">%</span>
        </div>
        <Trend className="w-5 h-5" style={{ color: trendColor }} />
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>

      {matches !== undefined && (
        <div className="mt-2 text-xs text-muted-foreground">
          {matches} 試合
        </div>
      )}
    </div>
  )
}
