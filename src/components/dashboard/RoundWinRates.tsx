'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine,
} from 'recharts'

interface Row {
  round_number: number
  rounds: number
  wins: number
  win_rate: number
}

export function RoundWinRates({ data: rawData }: { data: Record<string, unknown>[] }) {
  const data = rawData as Row[]
  if (!data?.length) return <p className="text-sm text-muted-foreground">データなし</p>

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <XAxis
          dataKey="round_number"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          label={{
            value: 'ラウンド',
            position: 'insideBottom',
            offset: -2,
            style: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 },
          }}
        />
        <YAxis
          domain={[0, 1]}
          tickFormatter={v => `${Math.round(v * 100)}%`}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(v: number) => [`${Math.round(v * 100)}%`, '勝率']}
          contentStyle={{
            background: '#18181F',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <ReferenceLine y={0.5} stroke="hsl(var(--border))" strokeDasharray="4 4" />
        <Bar dataKey="win_rate" radius={[3, 3, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell
              key={idx}
              fill={entry.win_rate >= 0.5 ? '#00D4A0' : '#FF4655'}
              opacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
