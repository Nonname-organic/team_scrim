'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronDown, ChevronUp, Search, X, ArrowLeft, Settings2,
  Play, Shield, Crosshair, Zap, Flag, Bookmark,
} from 'lucide-react'
import { MapPlantSelector, type PlantRound } from '@/components/map/MapPlantSelector'
import { useAuth } from '@/contexts/AuthContext'
import { usePlan } from '@/contexts/PlanContext'
import { LockedFeature } from '@/components/pricing/LockedFeature'

// ── constants ────────────────────────────────────────────────────────────────

const ECO_LABELS: Record<string, string> = {
  pistol: 'ピストル', second: 'セカンド', third: 'サード',
  eco: 'エコ', anti_eco: 'アンチエコ', semi_eco: 'セミエコ',
  semi_buy: 'セミバイ', full_buy: 'フルバイ', oper: 'オペ',
}
const ECO_COLOR: Record<string, string> = {
  pistol: '#FFD700', second: '#3498DB', third: '#1ABC9C',
  eco: '#FF4655', anti_eco: '#FF8C42', semi_eco: '#FF8C42',
  semi_buy: '#6C63FF', full_buy: '#00D4A0', oper: '#9B59B6',
}
const TIMING_CFG = {
  early: { label: 'Early', color: '#FF4655' },
  mid:   { label: 'Mid',   color: '#6C63FF' },
  late:  { label: 'Late',  color: '#E8B84B' },
} as const

// ── types ─────────────────────────────────────────────────────────────────────

interface Match {
  id: string; opponent_name: string; match_date: string; video_url: string | null
  map: string; match_type: string; team_score: number; opponent_score: number; result: string
  attack_rounds_won: number; attack_rounds_played: number
  defense_rounds_won: number; defense_rounds_played: number
}
interface Round {
  id: string; round_number: number; side: string; result: string
  economy_type: string | null; planted: boolean; plant_site: string | null
  first_blood_team: boolean | null; retake: boolean; notable: boolean
  plant_x: number | null; plant_y: number | null
  contact_timing: 'early' | 'mid' | 'late' | null
}

// YouTube IFrame API
declare global {
  interface Window {
    YT: { Player: new (el: HTMLElement | string, opts: YTOpts) => YTPlayer }
    onYouTubeIframeAPIReady?: () => void
  }
}
interface YTOpts {
  videoId: string
  width?: string | number
  height?: string | number
  playerVars?: Record<string, number | string>
  events?: {
    onReady?: (e: { target: YTPlayer }) => void
    onStateChange?: (e: { data: number }) => void
  }
}
interface YTPlayer {
  seekTo(s: number, allow: boolean): void
  playVideo(): void
  pauseVideo(): void
  destroy(): void
  getCurrentTime(): number
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0]
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
  } catch {}
  return null
}

// ── main page ─────────────────────────────────────────────────────────────────

type SortKey = 'date' | 'opponent' | 'map'
type SortDir = 'asc' | 'desc'

export default function RoundAnalysisPage() {
  const { teamId } = useAuth()
  const { limits, showUpgrade } = usePlan()
  const [matches, setMatches] = useState<Match[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [filterText, setFilterText] = useState('')
  const [sortKey, setSortKey]   = useState<SortKey>('date')
  const [sortDir, setSortDir]   = useState<SortDir>('desc')

  // Analysis mode
  const [analysisMatch, setAnalysisMatch] = useState<Match | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [loadingRounds, setLoadingRounds] = useState(false)
  const [activeRound, setActiveRound] = useState<Round | null>(null)

  // VOD settings
  const [vodOffset, setVodOffset]     = useState(0)
  const [secPerRound, setSecPerRound] = useState(115)
  const [showVodSettings, setShowVodSettings] = useState(false)

  // Per-round notes (localStorage)
  const [notes, setNotes] = useState<Record<string, string>>({})

  // Per-round VOD timestamps (localStorage)
  const [roundTimestamps, setRoundTimestamps] = useState<Record<string, number>>({})
  const getVideoTimeRef = useRef<() => number>(() => 0)

  useEffect(() => {
    if (!teamId) return
    fetch('/api/matches?limit=100')
      .then(r => r.json())
      .then(j => { setMatches(j.data ?? []); setLoadingMatches(false) })
      .catch(() => setLoadingMatches(false))
  }, [teamId])

  async function enterAnalysis(m: Match) {
    setAnalysisMatch(m)
    setActiveRound(null)
    setRoundTimestamps({})
    setLoadingRounds(true)
    try {
      const j = await fetch(`/api/matches/${m.id}`).then(r => r.json())
      const rds: Round[] = j.data?.rounds ?? []
      setRounds(rds)
      const savedNotes: Record<string, string> = {}
      const savedTs: Record<string, number> = {}
      rds.forEach(r => {
        const note = localStorage.getItem(`round-note-${r.id}`)
        if (note) savedNotes[r.id] = note
        const ts = localStorage.getItem(`vod-ts-${m.id}-${r.id}`)
        if (ts) savedTs[r.id] = Number(ts)
      })
      setNotes(savedNotes)
      setRoundTimestamps(savedTs)
    } finally {
      setLoadingRounds(false)
    }
  }

  function exitAnalysis() {
    setAnalysisMatch(null)
    setRounds([])
    setActiveRound(null)
  }

  function saveNote(roundId: string, text: string) {
    localStorage.setItem(`round-note-${roundId}`, text)
    setNotes(prev => ({ ...prev, [roundId]: text }))
  }

  function saveRoundTimestamp(roundId: string, seconds: number) {
    if (!analysisMatch) return
    localStorage.setItem(`vod-ts-${analysisMatch.id}-${roundId}`, String(seconds))
    setRoundTimestamps(prev => ({ ...prev, [roundId]: seconds }))
  }

  function clearRoundTimestamp(roundId: string) {
    if (!analysisMatch) return
    localStorage.removeItem(`vod-ts-${analysisMatch.id}-${roundId}`)
    setRoundTimestamps(prev => { const n = { ...prev }; delete n[roundId]; return n })
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'date' ? 'desc' : 'asc') }
  }

  const filteredMatches = useMemo(() => {
    const q = filterText.toLowerCase()
    const list = q
      ? matches.filter(m => m.opponent_name.toLowerCase().includes(q) || m.map.toLowerCase().includes(q))
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

  // ── Analysis view ──────────────────────────────────────────────────────────
  if (analysisMatch) {
    const roundTime = (r: Round) =>
      roundTimestamps[r.id] ?? (vodOffset + (r.round_number - 1) * secPerRound)

    return (
      <div className="flex flex-col h-[calc(100vh-96px)] -m-6 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-[#18181F] flex-shrink-0">
          <button
            onClick={exitAnalysis}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 試合一覧
          </button>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', analysisMatch.result === 'win' ? 'bg-[#00D4A0]' : 'bg-[#FF4655]')} />
            <span className="text-sm font-semibold text-white">vs {analysisMatch.opponent_name}</span>
            <span className="text-xs text-muted-foreground">{analysisMatch.map}</span>
            <span className={cn('text-sm font-bold', analysisMatch.result === 'win' ? 'text-[#00D4A0]' : 'text-[#FF4655]')}>
              {analysisMatch.team_score}
            </span>
            <span className="text-muted-foreground text-xs">:</span>
            <span className="text-sm text-white">{analysisMatch.opponent_score}</span>
            <span className="text-[10px] text-muted-foreground ml-1">
              {new Date(analysisMatch.match_date).toLocaleDateString('ja-JP')}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowVodSettings(v => !v)}
              className={cn(
                'flex items-center gap-1.5 text-xs border rounded-lg px-2.5 py-1.5 transition-colors',
                showVodSettings
                  ? 'bg-white/10 text-white border-white/30'
                  : 'text-muted-foreground border-border hover:text-white hover:border-white/30'
              )}
            >
              <Settings2 className="w-3 h-3" /> VOD設定
            </button>
          </div>
        </div>

        {/* VOD settings bar */}
        {showVodSettings && (
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-card flex-shrink-0 text-xs">
            <span className="text-muted-foreground">R1開始時間</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number" min={0}
                value={vodOffset}
                onChange={e => setVodOffset(Number(e.target.value))}
                className="w-20 bg-muted/50 border border-border rounded px-2 py-1 text-white text-xs outline-none focus:border-[#FF4655]"
              />
              <span className="text-muted-foreground">秒</span>
            </div>
            <span className="text-muted-foreground ml-2">ラウンド平均時間</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number" min={60} max={200}
                value={secPerRound}
                onChange={e => setSecPerRound(Number(e.target.value))}
                className="w-20 bg-muted/50 border border-border rounded px-2 py-1 text-white text-xs outline-none focus:border-[#FF4655]"
              />
              <span className="text-muted-foreground">秒/ラウンド</span>
            </div>
          </div>
        )}

        {/* 3-pane */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── LEFT: Round list ── */}
          <div className="w-64 border-r border-border flex flex-col bg-card overflow-hidden flex-shrink-0">
            <div className="px-3 py-2 border-b border-border flex-shrink-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                ラウンド一覧 ({rounds.length})
              </span>
            </div>
            {loadingRounds ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">読み込み中...</div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {/* Free プランのラウンド制限 */}
                {(() => {
                  const limit = limits.round_preview_limit
                  const visible = limit !== null ? rounds.slice(0, limit) : rounds
                  const hidden  = limit !== null ? rounds.length - visible.length : 0
                  return (
                    <>
                      {visible.map(r => {
                  const isActive = activeRound?.id === r.id
                  const isWin = r.result === 'win'
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveRound(isActive ? null : r)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 border-b border-border/40 last:border-0 transition-colors text-left',
                        isActive
                          ? 'bg-[#FF4655]/10 border-l-2 border-l-[#FF4655]'
                          : 'hover:bg-muted/20'
                      )}
                    >
                      {/* Round number */}
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 border',
                        isWin
                          ? 'bg-[#00D4A0]/15 text-[#00D4A0] border-[#00D4A0]/30'
                          : 'bg-[#FF4655]/15 text-[#FF4655] border-[#FF4655]/30'
                      )}>
                        {r.round_number}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={cn('text-[10px] font-bold', r.side === 'attack' ? 'text-[#FF8C42]' : 'text-[#00D4A0]')}>
                            {r.side === 'attack' ? 'ATK' : 'DEF'}
                          </span>
                          {r.economy_type && (
                            <span className="text-[9px] px-1 rounded"
                              style={{ color: ECO_COLOR[r.economy_type] ?? '#9B9BA4', background: `${ECO_COLOR[r.economy_type] ?? '#9B9BA4'}18` }}>
                              {ECO_LABELS[r.economy_type] ?? r.economy_type}
                            </span>
                          )}
                          {r.planted && (
                            <span className="text-[9px] text-[#6C63FF]">💣{r.plant_site}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {r.retake && <span className="text-[8px] text-[#6C63FF] bg-[#6C63FF]/10 px-1 rounded">リテイク</span>}
                          {r.first_blood_team === true  && <span className="text-[8px] text-[#FFD700] bg-[#FFD700]/10 px-1 rounded">FB取</span>}
                          {r.first_blood_team === false && <span className="text-[8px] text-[#FF4655] bg-[#FF4655]/10 px-1 rounded">FB負</span>}
                          {r.notable && <Flag className="w-2.5 h-2.5 text-[#FF4655]" fill="currentColor" />}
                          {notes[r.id] && <Bookmark className="w-2.5 h-2.5 text-[#3498DB]" fill="currentColor" />}
                        </div>
                      </div>
                    </button>
                  )
                })}
                      {/* 制限バナー */}
                      {hidden > 0 && (
                        <button
                          onClick={() => showUpgrade({
                            feature: 'round_preview_limit',
                            title: 'すべてのラウンドを表示',
                            message: `あと${hidden}件のラウンドが非表示です。Teamプランにアップグレードするとすべてのラウンドを分析できます。`,
                          })}
                          className="w-full px-3 py-3 text-center border-t border-border bg-[#FFD700]/5 hover:bg-[#FFD700]/10 transition-colors"
                        >
                          <div className="text-[10px] font-bold text-[#FFD700]">
                            さらに{hidden}件 →
                          </div>
                          <div className="text-[9px] text-muted-foreground">Teamプランで全表示</div>
                        </button>
                      )}
                    </>
                  )
                })()}
              </div>
            )}

            {/* Mini stats */}
            {!loadingRounds && rounds.length > 0 && (() => {
              const atk = rounds.filter(r => r.side === 'attack')
              const def = rounds.filter(r => r.side === 'defense')
              const atkWr = atk.length > 0 ? Math.round(atk.filter(r => r.result === 'win').length / atk.length * 100) : null
              const defWr = def.length > 0 ? Math.round(def.filter(r => r.result === 'win').length / def.length * 100) : null
              return (
                <div className="border-t border-border px-3 py-2 flex gap-3 text-[10px] flex-shrink-0">
                  {atkWr !== null && (
                    <span>ATK <span className={atkWr >= 50 ? 'text-[#00D4A0] font-bold' : 'text-[#FF4655] font-bold'}>{atkWr}%</span></span>
                  )}
                  {defWr !== null && (
                    <span>DEF <span className={defWr >= 50 ? 'text-[#00D4A0] font-bold' : 'text-[#FF4655] font-bold'}>{defWr}%</span></span>
                  )}
                </div>
              )
            })()}
          </div>

          {/* ── CENTER: Video player ── */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#12121A]">
            {!limits.vod_analysis && analysisMatch?.video_url ? (
              <LockedFeature
                requiredPlan="pro"
                trigger={{
                  feature: 'vod_analysis',
                  title: 'VOD連携分析を解放',
                  message: 'ProプランにアップグレードするとVOD動画と連携し、ラウンドクリックで動画を自動シークできます。',
                }}
                minHeight={300}
                className="flex-1"
              >
                <div />
              </LockedFeature>
            ) : (
              <>
                <VideoPlayer
                  videoUrl={analysisMatch.video_url}
                  activeRound={activeRound}
                  roundTime={activeRound ? roundTime(activeRound) : null}
                  getCurrentTimeRef={getVideoTimeRef}
                />
                {/* Round timeline strip */}
                {rounds.length > 0 && (
                  <div className="px-3 py-2 border-t border-border flex-shrink-0 overflow-x-auto">
                    <div className="flex gap-1 min-w-max">
                      {rounds.map(r => {
                        const isWin = r.result === 'win'
                        const isActive = activeRound?.id === r.id
                        return (
                          <button
                            key={r.id}
                            onClick={() => setActiveRound(isActive ? null : r)}
                            title={`R${r.round_number} ${r.side === 'attack' ? 'ATK' : 'DEF'} ${r.result}`}
                            className={cn(
                              'w-6 h-6 rounded text-[9px] font-bold flex-shrink-0 border transition-all',
                              isActive
                                ? 'ring-1 ring-white scale-110'
                                : 'opacity-80 hover:opacity-100',
                              isWin
                                ? 'bg-[#00D4A0]/20 text-[#00D4A0] border-[#00D4A0]/30'
                                : 'bg-[#FF4655]/20 text-[#FF4655] border-[#FF4655]/30'
                            )}
                          >
                            {r.round_number}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── RIGHT: Round details + Feedback ── */}
          <div className="w-80 border-l border-border flex flex-col overflow-hidden flex-shrink-0 bg-card">
            <div className="flex-1 overflow-y-auto">
              {activeRound ? (
                <RoundDetailPanel
                  round={activeRound}
                  note={notes[activeRound.id] ?? ''}
                  timestamp={roundTimestamps[activeRound.id] ?? null}
                  onNoteChange={(text) => saveNote(activeRound.id, text)}
                  onSetTimestamp={() => saveRoundTimestamp(activeRound.id, getVideoTimeRef.current())}
                  onSetTimestampValue={(s) => saveRoundTimestamp(activeRound.id, s)}
                  onClearTimestamp={() => clearRoundTimestamp(activeRound.id)}
                  onTimingChange={async (timing) => {
                    await fetch(`/api/rounds/${activeRound.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ contact_timing: timing }),
                    })
                    setRounds(prev => prev.map(r => r.id === activeRound.id ? { ...r, contact_timing: timing } : r))
                    setActiveRound(prev => prev ? { ...prev, contact_timing: timing } : prev)
                  }}
                />
              ) : (
                <MatchStatsPanel rounds={rounds} map={analysisMatch.map} />
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Match list view ──────────────────────────────────────────────────────
  const SORT_BTNS: { key: SortKey; label: string }[] = [
    { key: 'date',     label: '日時' },
    { key: 'opponent', label: 'チーム名' },
    { key: 'map',      label: 'マップ' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">試合 <span className="text-[#FF4655]">分析</span></h1>
        <p className="text-muted-foreground text-sm mt-0.5">試合を選択してVOD連携分析を開始</p>
      </div>

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
            <button onClick={() => setFilterText('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
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
              {sortKey === key && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </button>
          ))}
        </div>
      </div>

      {loadingMatches ? (
        <div className="text-center py-16 text-muted-foreground text-sm">読み込み中...</div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {filterText ? '一致する試合がありません' : '試合データがありません'}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_120px_110px_80px_80px_40px] text-[10px] text-muted-foreground uppercase tracking-wider px-4 py-1.5">
            <div>対戦</div><div>マップ</div><div className="text-center">スコア</div>
            <div className="text-center">ATK%</div><div className="text-right">日付</div><div />
          </div>
          {filteredMatches.map(m => {
            const isWin = m.result === 'win'
            const atkPct = m.attack_rounds_played > 0 ? Math.round((m.attack_rounds_won / m.attack_rounds_played) * 100) : null
            return (
              <button
                key={m.id}
                onClick={() => enterAnalysis(m)}
                className="w-full grid grid-cols-[1fr_120px_110px_80px_80px_40px] items-center bg-card border border-border rounded-xl px-4 py-3 text-left hover:border-[#FF4655]/40 hover:bg-muted/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', isWin ? 'bg-[#00D4A0]' : 'bg-[#FF4655]')} />
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-[#FF4655] transition-colors">
                      vs {m.opponent_name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span>{m.match_type}</span>
                      {m.video_url && <Play className="w-2.5 h-2.5 text-[#FF4655]" fill="currentColor" />}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{m.map}</div>
                <div className="text-center">
                  <span className={cn('font-bold text-sm', isWin ? 'text-[#00D4A0]' : 'text-[#FF4655]')}>{m.team_score}</span>
                  <span className="text-muted-foreground mx-1">:</span>
                  <span className="text-white text-sm">{m.opponent_score}</span>
                </div>
                <div className={cn('text-center text-xs font-semibold', atkPct !== null ? (atkPct >= 50 ? 'text-[#00D4A0]' : 'text-[#FF4655]') : 'text-muted-foreground')}>
                  {atkPct !== null ? `${atkPct}%` : '--'}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {new Date(m.match_date).toLocaleDateString('ja-JP')}
                </div>
                <Play className="w-4 h-4 text-muted-foreground group-hover:text-[#FF4655] transition-colors justify-self-center" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Video Player ──────────────────────────────────────────────────────────────

function VideoPlayer({
  videoUrl,
  activeRound,
  roundTime,
  getCurrentTimeRef,
}: {
  videoUrl: string | null
  activeRound: Round | null
  roundTime: number | null
  getCurrentTimeRef: React.MutableRefObject<() => number>
}) {
  const ytPlayerRef  = useRef<YTPlayer | null>(null)
  const ytContainerRef = useRef<HTMLDivElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)
  const [ytReady, setYtReady] = useState(false)
  const prevUrlRef = useRef<string | null>(null)

  // 現在の再生位置を返す関数を親に公開
  useEffect(() => {
    getCurrentTimeRef.current = () => {
      if (ytPlayerRef.current) return ytPlayerRef.current.getCurrentTime()
      if (videoRef.current) return videoRef.current.currentTime
      return 0
    }
  })

  const videoId = videoUrl ? getYouTubeId(videoUrl) : null
  const isYouTube = !!videoId
  const isDirect  = !isYouTube && !!videoUrl?.startsWith('http')

  // Load YouTube IFrame API once
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.YT?.Player) { setYtReady(true); return }
    window.onYouTubeIframeAPIReady = () => setYtReady(true)
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    }
  }, [])

  // Create YouTube player
  useEffect(() => {
    if (!ytReady || !isYouTube || !videoId || !ytContainerRef.current) return
    if (prevUrlRef.current === videoId) return
    prevUrlRef.current = videoId

    if (ytPlayerRef.current) { ytPlayerRef.current.destroy(); ytPlayerRef.current = null }

    const div = document.createElement('div')
    div.style.cssText = 'width:100%;height:100%;'
    ytContainerRef.current.innerHTML = ''
    ytContainerRef.current.appendChild(div)

    ytPlayerRef.current = new window.YT.Player(div, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: () => {
          // YouTube API が生成する iframe にフルサイズを強制適用
          const iframe = ytContainerRef.current?.querySelector('iframe')
          if (iframe) {
            iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0;'
          }
        },
      },
    })
  }, [ytReady, isYouTube, videoId])

  // Seek when round changes
  useEffect(() => {
    if (roundTime === null) return
    if (ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(roundTime, true)
      ytPlayerRef.current.playVideo()
    } else if (videoRef.current) {
      videoRef.current.currentTime = roundTime
      videoRef.current.play().catch(() => {})
    }
  }, [roundTime, activeRound?.id])

  if (!videoUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0D0D14]">
        <div className="text-center space-y-2">
          <Play className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground text-sm">VODが未設定です</p>
          <p className="text-muted-foreground/60 text-xs">試合履歴からVOD URLを設定してください</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 relative bg-black overflow-hidden">
      {isYouTube && (
        <div ref={ytContainerRef} className="absolute inset-0" />
      )}
      {isDirect && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="absolute inset-0 w-full h-full"
        />
      )}
      {activeRound && (
        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white pointer-events-none flex items-center gap-2">
          <span className={cn(activeRound.result === 'win' ? 'text-[#00D4A0]' : 'text-[#FF4655]')}>
            R{activeRound.round_number}
          </span>
          <span className={cn(activeRound.side === 'attack' ? 'text-[#FF8C42]' : 'text-[#00D4A0]')}>
            {activeRound.side === 'attack' ? 'ATK' : 'DEF'}
          </span>
          {activeRound.economy_type && (
            <span style={{ color: ECO_COLOR[activeRound.economy_type] ?? '#9B9BA4' }}>
              {ECO_LABELS[activeRound.economy_type]}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Round detail panel (right pane when round selected) ───────────────────────

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseTimeInput(input: string): number | null {
  const s = input.trim()
  const mmss = s.match(/^(\d+):(\d{1,2})$/)
  if (mmss) {
    const sec = parseInt(mmss[2], 10)
    if (sec < 60) return parseInt(mmss[1], 10) * 60 + sec
  }
  const secs = parseFloat(s)
  if (!isNaN(secs) && secs >= 0) return secs
  return null
}

function RoundDetailPanel({
  round: r,
  note,
  timestamp,
  onNoteChange,
  onSetTimestamp,
  onSetTimestampValue,
  onClearTimestamp,
  onTimingChange,
}: {
  round: Round
  note: string
  timestamp: number | null
  onNoteChange: (text: string) => void
  onSetTimestamp: () => void
  onSetTimestampValue: (seconds: number) => void
  onClearTimestamp: () => void
  onTimingChange: (t: 'early' | 'mid' | 'late' | null) => void
}) {
  const isWin = r.result === 'win'
  const [timeInput, setTimeInput] = useState(timestamp !== null ? formatTime(timestamp) : '')
  const [inputError, setInputError] = useState(false)

  const handleSaveInput = () => {
    const parsed = parseTimeInput(timeInput)
    if (parsed === null) { setInputError(true); return }
    setInputError(false)
    onSetTimestampValue(parsed)
  }

  return (
    <div className="p-3 space-y-3">
      {/* Round header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className={cn(
          'text-2xl font-black',
          isWin ? 'text-[#00D4A0]' : 'text-[#FF4655]'
        )}>
          R{r.round_number}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            {r.side === 'attack'
              ? <Crosshair className="w-3.5 h-3.5 text-[#FF8C42]" />
              : <Shield className="w-3.5 h-3.5 text-[#00D4A0]" />}
            <span className={cn('text-xs font-bold', r.side === 'attack' ? 'text-[#FF8C42]' : 'text-[#00D4A0]')}>
              {r.side === 'attack' ? 'アタック' : 'ディフェンス'}
            </span>
          </div>
          <div className={cn('text-xs font-semibold', isWin ? 'text-[#00D4A0]' : 'text-[#FF4655]')}>
            {isWin ? '勝利' : '敗北'}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {r.economy_type && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{ color: ECO_COLOR[r.economy_type] ?? '#9B9BA4', borderColor: `${ECO_COLOR[r.economy_type] ?? '#9B9BA4'}50`, background: `${ECO_COLOR[r.economy_type] ?? '#9B9BA4'}15` }}>
            {ECO_LABELS[r.economy_type]}
          </span>
        )}
        {r.planted && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#6C63FF]/50 text-[#6C63FF] bg-[#6C63FF]/10">
            💣 {r.plant_site ? `${r.plant_site}サイト` : 'プラント'}
          </span>
        )}
        {r.retake && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#6C63FF]/50 text-[#6C63FF] bg-[#6C63FF]/10">
            リテイク
          </span>
        )}
        {r.first_blood_team === true  && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#FFD700]/50 text-[#FFD700] bg-[#FFD700]/10">FB取得</span>
        )}
        {r.first_blood_team === false && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#FF4655]/50 text-[#FF4655] bg-[#FF4655]/10">FB被</span>
        )}
        {r.notable && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#FF4655]/50 text-[#FF4655] bg-[#FF4655]/10 flex items-center gap-1">
            <Flag className="w-2.5 h-2.5" fill="currentColor" /> 注目
          </span>
        )}
      </div>

      {/* VOD タイムスタンプ */}
      <div className="space-y-2 bg-muted/20 border border-border/60 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Play className="w-3 h-3" /> VOD開始時間
          </div>
          {timestamp !== null && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-white">{formatTime(timestamp)}</span>
              <span className="text-[10px] text-muted-foreground">({Math.floor(timestamp)}秒)</span>
              <button onClick={onClearTimestamp} className="text-muted-foreground hover:text-[#FF4655] transition-colors ml-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {timestamp === null && (
            <span className="text-[10px] text-muted-foreground/50">未設定</span>
          )}
        </div>

        {/* 手動入力 */}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={timeInput}
            onChange={e => { setTimeInput(e.target.value); setInputError(false) }}
            onKeyDown={e => e.key === 'Enter' && handleSaveInput()}
            placeholder="1:23 または 83"
            className={cn(
              'flex-1 bg-muted/50 border rounded px-2.5 py-1.5 text-xs font-mono text-white placeholder-muted-foreground/50 outline-none transition-colors',
              inputError ? 'border-[#FF4655]' : 'border-border focus:border-[#FF4655]'
            )}
          />
          <button
            onClick={handleSaveInput}
            className="text-xs px-3 py-1.5 bg-muted/50 hover:bg-muted border border-border hover:border-white/30 text-white rounded transition-colors font-medium"
          >
            設定
          </button>
        </div>
        {inputError && (
          <div className="text-[10px] text-[#FF4655]">形式: 1:23 または 83 (秒)</div>
        )}

        {/* 動画から取得 */}
        <button
          onClick={() => { onSetTimestamp(); setTimeInput('') }}
          className="w-full text-xs bg-[#FF4655]/15 hover:bg-[#FF4655]/25 text-[#FF4655] border border-[#FF4655]/30 rounded-lg px-3 py-1.5 transition-colors font-medium"
        >
          現在の動画位置を設定
        </button>
      </div>

      {/* Timing selector */}
      <div className="space-y-1">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">プレイタイミング</div>
        <div className="flex gap-1">
          {(['early', 'mid', 'late'] as const).map(t => {
            const cfg = TIMING_CFG[t]
            const active = r.contact_timing === t
            return (
              <button
                key={t}
                onClick={() => onTimingChange(active ? null : t)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors"
                style={active
                  ? { color: cfg.color, borderColor: cfg.color, background: `${cfg.color}20` }
                  : { color: '#9B9BA4', borderColor: '#2A2A3A', background: 'transparent' }
                }
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Note */}
      <div className="space-y-1">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Zap className="w-3 h-3" /> このラウンドのメモ
        </div>
        <textarea
          rows={4}
          value={note}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="このラウンドの気づき・改善点を入力..."
          className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs text-white placeholder-muted-foreground/60 focus:border-[#FF4655] outline-none resize-none"
        />
        {note && (
          <div className="text-[9px] text-muted-foreground/60 text-right">
            ローカル保存済み
          </div>
        )}
      </div>
    </div>
  )
}

// ── Match stats panel (right pane when no round selected) ─────────────────────

function MatchStatsPanel({ rounds, map }: { rounds: Round[]; map: string }) {
  const atk  = rounds.filter(r => r.side === 'attack')
  const def  = rounds.filter(r => r.side === 'defense')
  const atkW = atk.filter(r => r.result === 'win').length
  const defW = def.filter(r => r.result === 'win').length
  const planted = rounds.filter(r => r.planted)
  const ppW  = planted.filter(r => r.result === 'win').length
  const fbW  = rounds.filter(r => r.first_blood_team === true)
  const fdW  = rounds.filter(r => r.first_blood_team === false)

  const ecoTypes = ['pistol','second','third','eco','anti_eco','semi_eco','semi_buy','full_buy','oper']
  const ecoStats = ecoTypes.map(type => {
    const rows = rounds.filter(r => r.economy_type === type)
    const wins = rows.filter(r => r.result === 'win').length
    return { type, total: rows.length, wins, wr: rows.length > 0 ? wins / rows.length : null }
  }).filter(e => e.total > 0)

  const plantRounds: PlantRound[] = planted.map(r => ({
    id: r.id, round_number: r.round_number,
    plant_x: r.plant_x, plant_y: r.plant_y, plant_site: r.plant_site,
    result: r.result, side: r.side,
  }))

  if (rounds.length === 0) return (
    <div className="flex-1 flex items-center justify-center p-4">
      <p className="text-muted-foreground text-xs text-center">ラウンドを選択すると詳細を表示</p>
    </div>
  )

  return (
    <div className="p-3 space-y-3">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">試合スタッツ</div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'ATK勝率', wins: atkW, total: atk.length, color: '#FF8C42' },
          { label: 'DEF勝率', wins: defW, total: def.length, color: '#00D4A0' },
          { label: 'プラント後', wins: ppW, total: planted.length, color: '#6C63FF' },
          { label: 'FB取得時', wins: fbW.filter(r => r.result === 'win').length, total: fbW.length, color: '#FFD700' },
        ].map(c => {
          const pct = c.total > 0 ? Math.round(c.wins / c.total * 100) : null
          return (
            <div key={c.label} className="bg-muted/20 rounded-lg p-2.5 text-center relative overflow-hidden border border-border/40">
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: c.color }} />
              <div className={cn('text-base font-black', pct !== null ? (pct >= 50 ? 'text-[#00D4A0]' : 'text-[#FF4655]') : 'text-muted-foreground')}>
                {pct !== null ? `${pct}%` : '--'}
              </div>
              <div className="text-[9px] text-muted-foreground">{c.label}</div>
              {pct !== null && <div className="text-[9px] text-muted-foreground/50">{c.wins}/{c.total}</div>}
            </div>
          )
        })}
      </div>

      {/* Eco stats */}
      {ecoStats.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">購入状況別</div>
          {ecoStats.map(e => {
            const wr = e.wr !== null ? Math.round(e.wr * 100) : 0
            const color = ECO_COLOR[e.type] ?? '#9B9BA4'
            return (
              <div key={e.type}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-muted-foreground">{ECO_LABELS[e.type] ?? e.type}</span>
                  <span className={wr >= 50 ? 'text-[#00D4A0] font-bold' : 'text-[#FF4655] font-bold'}>
                    {wr}% <span className="text-muted-foreground/60 font-normal">{e.wins}/{e.total}</span>
                  </span>
                </div>
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${wr}%`, background: color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Map heatmap */}
      {plantRounds.length > 0 && (
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">プラント位置</div>
          <MapPlantSelector
            mapName={map}
            rounds={plantRounds}
            editRoundId={null}
            onSaved={() => {}}
            onCancelEdit={() => {}}
          />
        </div>
      )}
    </div>
  )
}
