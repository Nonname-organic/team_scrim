'use client'
import { useEffect, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { MapPlantSelector, type PlantRound } from '@/components/map/MapPlantSelector'

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? 'YOUR_TEAM_UUID'

const ECO_LABELS: Record<string, string> = {
  pistol: 'ピストル', eco: 'エコ', anti_eco: 'アンチエコ', semi_eco: 'セミエコ',
  semi_buy: 'セミバイ', full_buy: 'フルバイ', oper: 'オペ', second: 'セカンド', third: 'サード',
}
const ECO_COLOR: Record<string, string> = {
  pistol: '#FFD700', eco: '#FF4655', anti_eco: '#FF8C42', semi_eco: '#FF8C42',
  semi_buy: '#6C63FF', full_buy: '#00D4A0', oper: '#9B59B6', second: '#3498DB', third: '#1ABC9C',
}
const TIMING_CFG = {
  early: { label: 'Early', color: '#FF4655' },
  mid:   { label: 'Mid',   color: '#6C63FF' },
  late:  { label: 'Late',  color: '#E8B84B' },
} as const

interface Match {
  id: string; opponent_name: string; match_date: string
  map: string; match_type: string; team_score: number; opponent_score: number; result: string
  attack_rounds_won: number; attack_rounds_played: number
  defense_rounds_won: number; defense_rounds_played: number
}
interface Round {
  id: string; round_number: number; side: string; result: string
  economy_type: string | null; planted: boolean; plant_site: string | null
  first_blood_team: boolean | null
  plant_x: number | null; plant_y: number | null
  contact_timing: 'early' | 'mid' | 'late' | null
}

type SortKey = 'date' | 'opponent' | 'map'
type SortDir = 'asc' | 'desc'

export default function RoundAnalysisPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [roundsCache, setRoundsCache] = useState<Record<string, Round[]>>({})

  const [loadingMatches, setLoadingMatches] = useState(true)
  const [loadingRoundId, setLoadingRoundId] = useState<string | null>(null)

  // Filter / sort
  const [filterText, setFilterText] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Fetch match list
  useEffect(() => {
    fetch(`/api/matches?team_id=${TEAM_ID}&limit=100`)
      .then(r => r.json())
      .then(j => { setMatches(j.data ?? []); setLoadingMatches(false) })
      .catch(() => setLoadingMatches(false))
  }, [])

  // Fetch rounds when match selected
  async function selectMatch(id: string) {
    if (selectedId === id) { setSelectedId(''); return }
    setSelectedId(id)
    if (roundsCache[id]) return
    setLoadingRoundId(id)
    try {
      const j = await fetch(`/api/matches/${id}`).then(r => r.json())
      setRoundsCache(prev => ({ ...prev, [id]: j.data?.rounds ?? [] }))
    } finally {
      setLoadingRoundId(null)
    }
  }

  // Sort columns
  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'date' ? 'desc' : 'asc') }
  }

  const filteredMatches = useMemo(() => {
    const q = filterText.toLowerCase()
    let list = q
      ? matches.filter(m =>
          m.opponent_name.toLowerCase().includes(q) ||
          m.map.toLowerCase().includes(q)
        )
      : [...matches]

    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
      else if (sortKey === 'opponent') cmp = a.opponent_name.localeCompare(b.opponent_name, 'ja')
      else if (sortKey === 'map') cmp = a.map.localeCompare(b.map)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [matches, filterText, sortKey, sortDir])

  const SORT_BTNS: { key: SortKey; label: string }[] = [
    { key: 'date',     label: '日時' },
    { key: 'opponent', label: 'チーム名' },
    { key: 'map',      label: 'マップ' },
  ]

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">ラウンド <span className="text-[#FF4655]">分析</span></h1>
        <p className="text-muted-foreground text-sm mt-0.5">試合ごとのラウンド詳細</p>
      </div>

      {/* Filter + sort bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="チーム名・マップで絞り込み"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder:text-muted-foreground focus:border-[#FF4655] outline-none"
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {SORT_BTNS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={cn(
                'flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                sortKey === key
                  ? 'bg-[#FF4655]/15 border-[#FF4655]/40 text-[#FF4655]'
                  : 'bg-card border-border text-muted-foreground hover:text-white hover:border-white/30'
              )}
            >
              {label}
              {sortKey === key && (
                sortDir === 'asc'
                  ? <ChevronUp className="w-3 h-3" />
                  : <ChevronDown className="w-3 h-3" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loadingMatches ? (
        <div className="text-center py-16 text-muted-foreground text-sm">読み込み中...</div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {filterText ? '一致する試合がありません' : '試合データがありません'}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column header */}
          <div className="grid grid-cols-[1fr_120px_110px_100px_32px] text-[10px] text-muted-foreground uppercase tracking-wider px-4 py-1.5">
            <div>対戦</div>
            <div>マップ</div>
            <div className="text-center">スコア</div>
            <div className="text-right">日付</div>
            <div />
          </div>

          {filteredMatches.map(m => {
            const isSelected = selectedId === m.id
            const isWin = m.result === 'win'
            const isLoss = m.result === 'loss'
            const rounds = roundsCache[m.id] ?? []
            const isLoadingThis = loadingRoundId === m.id
            const atkPct = m.attack_rounds_played > 0
              ? Math.round((m.attack_rounds_won / m.attack_rounds_played) * 100) : null
            const defPct = m.defense_rounds_played > 0
              ? Math.round((m.defense_rounds_won / m.defense_rounds_played) * 100) : null

            return (
              <div
                key={m.id}
                className={cn(
                  'bg-card rounded-xl border transition-all',
                  isSelected ? 'border-[#FF4655]/40' : 'border-border'
                )}
              >
                {/* Match row — clickable */}
                <button
                  onClick={() => selectMatch(m.id)}
                  className="w-full grid grid-cols-[1fr_120px_110px_100px_32px] items-center px-4 py-3 text-left hover:bg-muted/10 transition-colors rounded-xl"
                >
                  {/* vs opponent */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      isWin ? 'bg-[#00D4A0]' : isLoss ? 'bg-[#FF4655]' : 'bg-muted-foreground'
                    )} />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        vs {m.opponent_name}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize flex items-center gap-2 mt-0.5">
                        <span>{m.match_type}</span>
                        {atkPct !== null && (
                          <span className={atkPct >= 50 ? 'text-[#00D4A0]' : 'text-[#FF4655]'}>
                            ATK {atkPct}%
                          </span>
                        )}
                        {defPct !== null && (
                          <span className={defPct >= 50 ? 'text-[#00D4A0]' : 'text-[#FF4655]'}>
                            DEF {defPct}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">{m.map}</div>

                  <div className="text-center">
                    <span className={cn('font-bold text-sm', isWin ? 'text-[#00D4A0]' : 'text-[#FF4655]')}>
                      {m.team_score}
                    </span>
                    <span className="text-muted-foreground mx-1 text-sm">:</span>
                    <span className="text-white text-sm">{m.opponent_score}</span>
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    {new Date(m.match_date).toLocaleDateString('ja-JP')}
                  </div>

                  <ChevronDown className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform',
                    isSelected && 'rotate-180'
                  )} />
                </button>

                {/* Expanded round analysis */}
                {isSelected && (
                  <div className="border-t border-border px-4 pb-5 pt-4">
                    {isLoadingThis ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">読み込み中...</div>
                    ) : rounds.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        ラウンドデータがありません
                      </div>
                    ) : (
                      <RoundDetail
                        rounds={rounds}
                        map={m.map}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Round detail (shown when a match is expanded)
// ============================================================

function RoundDetail({
  rounds: initialRounds,
  map,
}: {
  rounds: Round[]
  map: string
}) {
  const [rounds, setRounds] = useState<Round[]>(initialRounds)

  async function updateTiming(roundId: string, timing: 'early' | 'mid' | 'late' | null) {
    await fetch(`/api/rounds/${roundId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_timing: timing }),
    })
    setRounds(prev => prev.map(r => r.id === roundId ? { ...r, contact_timing: timing } : r))
  }

  const atkRounds = rounds.filter(r => r.side === 'attack')
  const defRounds = rounds.filter(r => r.side === 'defense')
  const atkWins = atkRounds.filter(r => r.result === 'win').length
  const defWins = defRounds.filter(r => r.result === 'win').length

  const plantedRounds = rounds.filter(r => r.planted)
  const postPlantWins = plantedRounds.filter(r => r.result === 'win').length

  const fbWonRounds  = rounds.filter(r => r.first_blood_team === true)
  const fbLostRounds = rounds.filter(r => r.first_blood_team === false)
  const fbWinRate  = fbWonRounds.length  > 0 ? fbWonRounds.filter(r => r.result === 'win').length  / fbWonRounds.length  : null
  const fdWinRate  = fbLostRounds.length > 0 ? fbLostRounds.filter(r => r.result === 'win').length / fbLostRounds.length : null

  const ecoTypes = ['pistol', 'eco', 'anti_eco', 'semi_eco', 'semi_buy', 'full_buy', 'oper', 'second', 'third']
  const ecoStats = ecoTypes.map(type => {
    const rows = rounds.filter(r => r.economy_type === type)
    const wins = rows.filter(r => r.result === 'win').length
    return { type, total: rows.length, wins, wr: rows.length > 0 ? wins / rows.length : null }
  }).filter(e => e.total > 0)

  const sites = ['A', 'B', 'C'] as const
  const siteStats = sites.map(site => {
    const atk  = plantedRounds.filter(r => r.plant_site === site && r.side === 'attack')
    const def  = plantedRounds.filter(r => r.plant_site === site && r.side === 'defense')
    return {
      site,
      atk:    { total: atk.length,  wins: atk.filter(r => r.result === 'win').length },
      retake: { total: def.length,  wins: def.filter(r => r.result === 'win').length },
    }
  }).filter(s => s.atk.total > 0 || s.retake.total > 0)

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'ATK勝率',  value: atkRounds.length > 0  ? `${atkWins}/${atkRounds.length}`   : '--', pct: atkRounds.length > 0  ? atkWins / atkRounds.length   : null, color: '#FF8C42' },
          { label: 'DEF勝率',  value: defRounds.length > 0  ? `${defWins}/${defRounds.length}`   : '--', pct: defRounds.length > 0  ? defWins / defRounds.length   : null, color: '#00D4A0' },
          { label: 'プラント後', value: plantedRounds.length > 0 ? `${postPlantWins}/${plantedRounds.length}` : '--', pct: plantedRounds.length > 0 ? postPlantWins / plantedRounds.length : null, color: '#6C63FF' },
          { label: 'FB取得時', value: fbWonRounds.length > 0 ? `${fbWonRounds.filter(r=>r.result==='win').length}/${fbWonRounds.length}` : '--', pct: fbWinRate, color: '#FFD700' },
          { label: 'FB取られ時', value: fbLostRounds.length > 0 ? `${fbLostRounds.filter(r=>r.result==='win').length}/${fbLostRounds.length}` : '--', pct: fdWinRate, color: '#FF4655' },
          { label: '総ラウンド', value: String(rounds.length), pct: null, color: '#9B9BA4' },
        ].map(c => (
          <div key={c.label} className="bg-muted/20 border border-border/60 rounded-xl p-3 text-center relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: c.color }} />
            <div className="text-lg font-bold" style={{ color: c.pct !== null ? (c.pct >= 0.5 ? '#00D4A0' : '#FF4655') : c.color }}>
              {c.pct !== null ? `${Math.round(c.pct * 100)}%` : c.value}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{c.label}</div>
            {c.pct !== null && <div className="text-[10px] text-muted-foreground/60">{c.value}</div>}
          </div>
        ))}
      </div>

      {/* Round timeline */}
      <div className="bg-muted/10 border border-border/60 rounded-xl p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          ラウンドタイムライン
        </div>
        <div className="flex flex-wrap gap-1.5">
          {rounds.map(r => {
            const isWin = r.result === 'win'
            const side  = r.side === 'attack' ? 'ATK' : 'DEF'
            const eco   = r.economy_type ? ECO_LABELS[r.economy_type] ?? r.economy_type : ''
            return (
              <div
                key={r.round_number}
                title={`R${r.round_number} | ${side} | ${eco}${r.planted ? ` | 🌱${r.plant_site ?? ''}` : ''}${r.first_blood_team !== null ? (r.first_blood_team ? ' | FB味方' : ' | FB相手') : ''}`}
                className={cn(
                  'relative w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold cursor-default border',
                  isWin
                    ? 'bg-[#00D4A0]/20 text-[#00D4A0] border-[#00D4A0]/40'
                    : 'bg-[#FF4655]/20 text-[#FF4655] border-[#FF4655]/40'
                )}
              >
                {r.round_number}
                <div className={cn(
                  'absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
                  r.side === 'attack' ? 'bg-[#FF8C42]' : 'bg-[#00D4A0]'
                )} />
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-2.5 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#00D4A0]/20 border border-[#00D4A0]/40 inline-block" />勝利</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#FF4655]/20 border border-[#FF4655]/40 inline-block" />敗北</span>
          <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-[#FF8C42] inline-block" />ATK</span>
          <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-[#00D4A0] inline-block" />DEF</span>
          <span className="text-muted-foreground/50">ホバーで詳細</span>
        </div>
      </div>

      {/* Economy & Site */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ecoStats.length > 0 && (
          <div className="bg-muted/10 border border-border/60 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/60">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">エコノミー別</div>
            </div>
            <div className="p-4 space-y-3">
              {ecoStats.map(e => {
                const wr = e.wr !== null ? Math.round(e.wr * 100) : 0
                const color = ECO_COLOR[e.type] ?? '#9B9BA4'
                return (
                  <div key={e.type}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white font-medium">{ECO_LABELS[e.type] ?? e.type}</span>
                      <span className="text-muted-foreground">{e.wins}/{e.total}
                        <span className={cn('ml-2 font-bold', wr >= 50 ? 'text-[#00D4A0]' : 'text-[#FF4655]')}>{wr}%</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${wr}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {siteStats.length > 0 && (
          <div className="bg-muted/10 border border-border/60 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/60">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">サイト別（植込みラウンド）</div>
            </div>
            <div className="p-4 space-y-4">
              {siteStats.map(s => (
                <div key={s.site}>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">{s.site}サイト</div>
                  <div className="space-y-2">
                    {s.atk.total > 0 && <WrBar label="ATK実行" color="#FF8C42" wins={s.atk.wins} total={s.atk.total} />}
                    {s.retake.total > 0 && <WrBar label="リテイク" color="#00D4A0" wins={s.retake.wins} total={s.retake.total} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map plant heatmap */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3">
        <div className="bg-muted/10 border border-border/60 rounded-xl p-4">
          <MapPlantSelector
            mapName={map}
            rounds={rounds.filter(r => r.planted).map<PlantRound>(r => ({
              id: r.id,
              round_number: r.round_number,
              plant_x: r.plant_x,
              plant_y: r.plant_y,
              plant_site: r.plant_site,
              result: r.result,
              side: r.side,
            }))}
            editRoundId={null}
            onSaved={() => {}}
            onCancelEdit={() => {}}
          />
        </div>

        {/* Round detail table */}
        <div className="bg-muted/10 border border-border/60 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/60">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ラウンド詳細</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  {['R', 'サイド', '購入状況', '結果', 'プラント', 'サイト', 'FB', 'タイミング'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rounds.map(r => {
                  return (
                    <tr
                      key={r.round_number}
                      className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/10"
                    >
                      <td className="px-3 py-2 font-bold text-white">{r.round_number}</td>
                      <td className="px-3 py-2">
                        <span className={cn('font-semibold', r.side === 'attack' ? 'text-[#FF8C42]' : 'text-[#00D4A0]')}>
                          {r.side === 'attack' ? 'ATK' : 'DEF'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {r.economy_type ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{ background: `${ECO_COLOR[r.economy_type] ?? '#9B9BA4'}20`, color: ECO_COLOR[r.economy_type] ?? '#9B9BA4' }}>
                            {ECO_LABELS[r.economy_type] ?? r.economy_type}
                          </span>
                        ) : <span className="text-muted-foreground">--</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn('font-bold', r.result === 'win' ? 'text-[#00D4A0]' : 'text-[#FF4655]')}>
                          {r.result === 'win' ? '勝' : '敗'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {r.planted ? <span className="text-[#6C63FF]">あり</span> : <span className="text-muted-foreground">--</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.plant_site ?? '--'}</td>
                      <td className="px-3 py-2">
                        {r.first_blood_team === true  ? <span className="text-[#FFD700]">味方</span>
                        : r.first_blood_team === false ? <span className="text-[#FF4655]">相手</span>
                        : <span className="text-muted-foreground">--</span>}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex gap-1">
                          {(['early', 'mid', 'late'] as const).map(t => {
                            const cfg = TIMING_CFG[t]
                            const active = r.contact_timing === t
                            return (
                              <button
                                key={t}
                                onClick={() => updateTiming(r.id, active ? null : t)}
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors',
                                  active
                                    ? 'border-current'
                                    : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground'
                                )}
                                style={active ? { color: cfg.color, background: `${cfg.color}20`, borderColor: `${cfg.color}60` } : undefined}
                              >
                                {cfg.label}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function WrBar({ label, color, wins, total }: { label: string; color: string; wins: number; total: number }) {
  const wr = total > 0 ? Math.round((wins / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span style={{ color }} className="font-semibold">{wr}%
          <span className="text-muted-foreground/60 font-normal ml-1">{wins}/{total}</span>
        </span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${wr}%`, background: color }} />
      </div>
    </div>
  )
}
