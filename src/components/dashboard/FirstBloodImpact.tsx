'use client'

interface Row {
  fb_team: boolean
  rounds: number
  wins: number
  win_rate: number
}

export function FirstBloodImpact({ data: rawData }: { data: Record<string, unknown>[] }) {
  const data = rawData as unknown as Row[]
  if (!data?.length) return <p className="text-sm text-muted-foreground">データなし</p>

  const fbRow = data.find(r => r.fb_team === true)
  const fdRow = data.find(r => r.fb_team === false)

  const fbPct = fbRow ? Math.round(fbRow.win_rate * 100) : null
  const fdPct = fdRow ? Math.round(fdRow.win_rate * 100) : null
  const impact = fbPct !== null && fdPct !== null ? fbPct - fdPct : null

  return (
    <div className="space-y-4">
      {/* Impact banner */}
      {impact !== null && (
        <div className="bg-[#FF4655]/5 border border-[#FF4655]/20 rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground">FB/FD 勝率差</div>
          <div className="text-2xl font-bold text-[#FF4655] mt-1">+{impact}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            FBを取ったラウンドはFDより {impact}% 勝率が高い
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="FB取得時"
          value={fbPct}
          rounds={fbRow?.rounds ?? 0}
          color="#00D4A0"
          good
        />
        <StatCard
          label="FD発生時"
          value={fdPct}
          rounds={fdRow?.rounds ?? 0}
          color="#FF4655"
        />
      </div>

      {/* Interpretation */}
      {impact !== null && impact > 30 && (
        <div className="text-xs text-[#FF8C42] bg-[#FF8C42]/10 rounded-lg p-3">
          <strong>分析:</strong> FB/FDの勝率差が{impact}%と非常に大きい。
          エントリー選手のFBSR改善が最優先課題。
        </div>
      )}
    </div>
  )
}

function StatCard({
  label, value, rounds, color, good,
}: {
  label: string
  value: number | null
  rounds: number
  color: string
  good?: boolean
}) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color }}>
        {value !== null ? `${value}%` : '--'}
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">{rounds} R</div>
      <div
        className="mt-2 h-1 rounded-full"
        style={{
          background: `linear-gradient(to right, ${color}40, ${color})`,
          width: `${value ?? 0}%`,
        }}
      />
    </div>
  )
}
