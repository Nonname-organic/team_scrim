'use client'

interface Entry {
  wins: number
  total: number
  win_rate: number | null
}

interface Props {
  data: Record<string, unknown>
}

function pct(e: Entry | undefined): number | null {
  if (!e || e.win_rate == null) return null
  return Math.round(Number(e.win_rate) * 100)
}

function color(p: number | null): string {
  if (p === null) return '#9B9BA4'
  if (p >= 50) return '#00D4A0'
  if (p >= 35) return '#FF8C42'
  return '#FF4655'
}

function Bar({ entry, label, sideColor }: { entry: Entry | undefined; label: string; sideColor: string }) {
  const p = pct(entry)
  const c = color(p)
  if (!entry) return null
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium" style={{ color: sideColor }}>{label}</span>
        <span>
          <span className="font-bold" style={{ color: c }}>{p !== null ? `${p}%` : '--'}</span>
          <span className="text-muted-foreground/60 ml-1 text-[10px]">{entry.wins}W/{entry.total}R</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${p ?? 0}%`, background: sideColor }} />
      </div>
    </div>
  )
}

export function SiteWinRates({ data }: Props) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-sm text-muted-foreground">データなし</p>
  }

  const get = (key: string) => data[key] as Entry | undefined

  const sites = [
    { key: 'A', atk: get('a_attack'), def: get('a_retake') },
    { key: 'B', atk: get('b_attack'), def: get('b_retake') },
    { key: 'C', atk: get('c_attack'), def: get('c_retake') },
  ].filter(s => s.atk || s.def)

  const postPlant = get('post_plant')

  if (!sites.length && !postPlant) {
    return <p className="text-sm text-muted-foreground">データなし</p>
  }

  return (
    <div className="space-y-4">
      {/* Per-site ATK + DEF */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {sites.map(({ key, atk, def }) => (
          <div key={key} className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-[#6C63FF]/60" />
            <div className="text-xs font-bold text-white pl-1">{key} サイト</div>
            <div className="space-y-2.5 pl-1">
              {atk && <Bar entry={atk} label="プラント後" sideColor="#FF8C42" />}
              {def && <Bar entry={def} label="リテイク" sideColor="#00D4A0" />}
            </div>
          </div>
        ))}
      </div>

      {/* Post-plant overall */}
      {postPlant && (() => {
        const p = pct(postPlant)
        const c = color(p)
        return (
          <div className="bg-muted/20 border border-border/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ポストプラント全体</span>
              <span>
                <span className="font-bold text-sm" style={{ color: c }}>{p !== null ? `${p}%` : '--'}</span>
                <span className="text-muted-foreground/60 ml-1.5 text-xs">{postPlant.wins}W / {postPlant.total}R</span>
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${p ?? 0}%`, background: c }} />
            </div>
          </div>
        )
      })()}
    </div>
  )
}
