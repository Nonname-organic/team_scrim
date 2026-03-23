'use client'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Match {
  id: string
  opponent_name: string
  map: string
  match_date: string
  team_score: number
  opponent_score: number
  result: string
  match_type: string
  attack_rounds_won: number
  attack_rounds_played: number
  defense_rounds_won: number
  defense_rounds_played: number
}

export function RecentMatches({ matches }: { matches: Record<string, unknown>[] }) {
  if (!matches?.length) {
    return <p className="text-sm text-muted-foreground">試合データなし</p>
  }

  return (
    <div className="space-y-2">
      {matches.map(m => {
        const match = m as unknown as Match
        const isWin = match.result === 'win'
        const isLoss = match.result === 'loss'
        const atkWR = match.attack_rounds_played > 0
          ? Math.round((match.attack_rounds_won / match.attack_rounds_played) * 100)
          : null
        const defWR = match.defense_rounds_played > 0
          ? Math.round((match.defense_rounds_won / match.defense_rounds_played) * 100)
          : null

        return (
          <Link
            key={match.id}
            href={`/matches/${match.id}`}
            className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group"
          >
            {/* Result badge */}
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
              isWin  ? 'bg-[#00D4A0]/15 text-[#00D4A0]' :
              isLoss ? 'bg-[#FF4655]/15 text-[#FF4655]' :
                       'bg-muted text-muted-foreground'
            )}>
              {match.result === 'win' ? 'W' : match.result === 'loss' ? 'L' : 'D'}
            </div>

            {/* Match info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white truncate">
                  vs {match.opponent_name}
                </span>
                <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                  {match.map}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {match.match_type}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(match.match_date).toLocaleDateString('ja-JP')}
              </div>
            </div>

            {/* Score */}
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold">
                <span className={isWin ? 'text-[#00D4A0]' : 'text-[#FF4655]'}>
                  {match.team_score}
                </span>
                <span className="text-muted-foreground mx-1">:</span>
                <span className="text-white">{match.opponent_score}</span>
              </div>
              {(atkWR !== null || defWR !== null) && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {atkWR !== null && <span className="text-[#FF8C42]">ATK {atkWR}%</span>}
                  {atkWR !== null && defWR !== null && <span className="mx-1">·</span>}
                  {defWR !== null && <span className="text-[#00D4A0]">DEF {defWR}%</span>}
                </div>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
