'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'

interface Props {
  data: Record<string, unknown>[]
}

const CustomTooltip = ({ active, payload, label }: Record<string, unknown>) => {
  if (!active || !(payload as unknown[])?.length) return null
  const items = payload as { name: string; value: number; color: string }[]

  return (
    <div className="bg-[#18181F] border border-border rounded-lg p-3 text-xs shadow-xl">
      <div className="text-muted-foreground mb-2">{label as string}</div>
      {items.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="text-white font-semibold">{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

export function WinRateTrendChart({ data }: Props) {
  if (!data?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        データが不足しています（最低3試合必要）
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}
        />
        <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="win_rate"
          name="総合勝率"
          stroke="#FF4655"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#FF4655' }}
        />
        <Line
          type="monotone"
          dataKey="attack_wr"
          name="攻め勝率"
          stroke="#FF8C42"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="4 2"
          activeDot={{ r: 3, fill: '#FF8C42' }}
        />
        <Line
          type="monotone"
          dataKey="defense_wr"
          name="守り勝率"
          stroke="#00D4A0"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="4 2"
          activeDot={{ r: 3, fill: '#00D4A0' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
