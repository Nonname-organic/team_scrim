'use client'
import { useEffect, useState, Fragment } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Shield, Crosshair, Pencil, Save, X, Plus, Trash2, MapPin, Flag, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AGENTS } from '@/types'
import { MAP_IMAGES, MAP_POLYGONS, MAP_ROTATION, normalizeMapKey } from '@/lib/mapPolygons'
import { detectSite } from '@/lib/geometry'
import { MapPlantSelector, type PlantRound } from '@/components/map/MapPlantSelector'
import { useLanguage } from '@/contexts/LanguageContext'

const RESULT_COLOR = { win: '#00D4A0', loss: '#FF4655', draw: '#9B9BA4' } as const
const ECO_OPTIONS = ['pistol', 'second', 'third', 'eco', 'anti_eco', 'semi_eco', 'semi_buy', 'full_buy', 'oper'] as const
const ECO_COLOR: Record<string, string> = {
  pistol: '#FFD700', second: '#3498DB', third: '#1ABC9C',
  eco: '#FF4655', anti_eco: '#FF8C42', semi_eco: '#FF8C42',
  semi_buy: '#6C63FF', full_buy: '#00D4A0', oper: '#9B59B6',
}
const TIMING_OPTIONS = [
  { value: 'early', label: 'Early', color: 'text-[#FF4655]', bg: 'bg-[#FF4655]/20 border-[#FF4655]/40' },
  { value: 'mid',   label: 'Mid',   color: 'text-[#6C63FF]', bg: 'bg-[#6C63FF]/20 border-[#6C63FF]/40' },
  { value: 'late',  label: 'Late',  color: 'text-[#E8B84B]', bg: 'bg-[#E8B84B]/20 border-[#E8B84B]/40' },
] as const
const SITE_OPTS = ['', 'A', 'B', 'C']

type PEdit = {
  player_id: string
  ign: string
  agent: string
  kills: number
  deaths: number
  assists: number
  acs: number
  hs_pct: number
  first_bloods: number
  first_deaths: number
}

type REdit = {
  round_number: number
  side: string
  result: string
  economy_type: string
  planted: boolean
  retake: boolean
  plant_site: string
  plant_x: number | null
  plant_y: number | null
  first_blood_team: string
  contact_timing: string
  notable: boolean
  memo: string
}

const inputCls = 'bg-muted border border-border rounded px-1.5 py-0.5 text-xs text-white focus:border-[#FF4655] outline-none w-full'
const selectCls = 'bg-muted border border-border rounded px-1 py-0.5 text-xs text-white focus:border-[#FF4655] outline-none w-full'

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { locale, t } = useLanguage()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editRoundMode, setEditRoundMode] = useState(false)
  const [editPlayers, setEditPlayers] = useState<PEdit[]>([])
  const [editRounds, setEditRounds] = useState<REdit[]>([])
  const [editDate, setEditDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [roundSaveError, setRoundSaveError] = useState<string | null>(null)
  const [plantEditIdx, setPlantEditIdx] = useState<number | null>(null)
  const [memoOpenIdx, setMemoOpenIdx]   = useState<Set<number>>(new Set())

  useEffect(() => {
    fetch(`/api/matches/${id}`)
      .then(r => r.json())
      .then(j => { setData(j.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">{t('common.loading')}</div>
  )
  if (!data) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">{t('matches.noMatches')}</div>
  )

  const match = data.match as Record<string, unknown>
  const playerStats = (data.player_stats ?? []) as Record<string, unknown>[]
  const rounds = (data.rounds ?? []) as Record<string, unknown>[]

  const result = String(match.result ?? 'draw') as 'win' | 'loss' | 'draw'
  const resultLabel = result === 'win' ? t('matches.roundWin') : result === 'loss' ? t('matches.roundLoss') : t('common.noData')
  const resultColor = RESULT_COLOR[result]

  const matchDate = match.match_date
    ? new Date(String(match.match_date)).toLocaleDateString(locale === 'en' ? 'en-US' : 'ja-JP')
    : ''

  const attackWins = Number(match.attack_rounds_won ?? 0)
  const attackTotal = Number(match.attack_rounds_played ?? 0)
  const defenseWins = Number(match.defense_rounds_won ?? 0)
  const defenseTotal = Number(match.defense_rounds_played ?? 0)
  const totalRounds = Number(match.team_score ?? 0) + Number(match.opponent_score ?? 0)

  function enterEdit() {
    setSaveError(null)
    setEditDate(String(match.match_date ?? '').slice(0, 10))
    setEditPlayers(playerStats.map(p => ({
      player_id: String(p.player_id ?? ''),
      ign: String(p.ign ?? ''),
      agent: String(p.agent ?? ''),
      kills: Number(p.kills ?? 0),
      deaths: Number(p.deaths ?? 0),
      assists: Number(p.assists ?? 0),
      acs: Number(p.acs ?? 0),
      hs_pct: Number(p.hs_pct ?? 0),
      first_bloods: Number(p.first_bloods ?? 0),
      first_deaths: Number(p.first_deaths ?? 0),
    })))
    setEditMode(true)
  }

  function enterRoundEdit() {
    setRoundSaveError(null)
    setMemoOpenIdx(new Set())
    setEditRounds(rounds.map(r => {
      const side = String(r.side ?? '')
      const planted = Boolean(r.planted)
      return {
        round_number: Number(r.round_number),
        side,
        result: String(r.result ?? ''),
        economy_type: String(r.economy_type ?? ''),
        planted: side === 'attack' ? planted : false,
        retake: side === 'defense' ? planted : false,
        plant_site: r.plant_site == null ? '' : String(r.plant_site),
        plant_x: r.plant_x != null ? Number(r.plant_x) : null,
        plant_y: r.plant_y != null ? Number(r.plant_y) : null,
        first_blood_team: r.first_blood_team == null ? '' : String(r.first_blood_team),
        contact_timing: r.contact_timing == null ? '' : String(r.contact_timing),
        notable: Boolean(r.notable),
        memo: r.memo != null ? String(r.memo) : '',
      }
    }))
    setEditRoundMode(true)
  }

  function addRound() {
    setEditRounds(prev => {
      const nextNum = prev.length > 0 ? prev[prev.length - 1].round_number + 1 : 1
      return [...prev, {
        round_number: nextNum,
        side: 'attack',
        result: 'win',
        economy_type: '',
        planted: false,
        retake: false,
        plant_site: '',
        plant_x: null,
        plant_y: null,
        first_blood_team: '',
        contact_timing: '',
        notable: false,
        memo: '',
      }]
    })
  }

  function removeRound(i: number) {
    setEditRounds(prev => prev.filter((_, idx) => idx !== i))
  }

  function updatePlayer(i: number, field: keyof PEdit, value: string | number) {
    setEditPlayers(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function updateRound(i: number, field: keyof REdit, value: string | boolean) {
    setEditRounds(prev => prev.map((r, idx) => {
      if (idx !== i) return r
      if (field === 'round_number') return { ...r, round_number: Number(value) }
      return { ...r, [field]: value }
    }))
  }

  function updateRoundCoords(i: number, x: number | null, y: number | null, site: string | null) {
    setEditRounds(prev => prev.map((r, idx) => {
      if (idx !== i) return r
      return { ...r, plant_x: x, plant_y: y, ...(site != null ? { plant_site: site } : {}) }
    }))
  }

  async function saveAll() {
    setSaving(true)
    setSaveError(null)
    try {
      const playerResults = await Promise.all(
        editPlayers.map(p =>
          fetch(`/api/players/${p.player_id}/stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              match_id: id,
              agent: p.agent || 'unknown',
              kills: Number(p.kills),
              deaths: Number(p.deaths),
              assists: Number(p.assists),
              acs: Number(p.acs),
              hs_pct: Number(p.hs_pct),
              first_bloods: Number(p.first_bloods),
              first_deaths: Number(p.first_deaths),
              rounds_played: totalRounds || 1,
            }),
          }).then(r => r.json())
        )
      )
      const playerErr = playerResults.find(r => r.error)
      if (playerErr) throw new Error(playerErr.error)

      if (editDate) {
        const mr = await fetch(`/api/matches/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ match_date: editDate }),
        }).then(r => r.json())
        if (mr.error) throw new Error(mr.error)
      }

      const j = await fetch(`/api/matches/${id}`).then(r => r.json())
      setData(j.data)
      setEditMode(false)
    } catch (e) {
      setSaveError(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function saveRounds() {
    setSaving(true)
    setRoundSaveError(null)
    try {
      const roundRes = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: id,
          rounds: editRounds.map(r => ({
            round_number: r.round_number,
            side: r.side,
            result: r.result,
            economy: r.economy_type,
            plant: r.side === 'defense' ? r.retake : r.planted,
            site: r.plant_site,
            plant_x: r.plant_x,
            plant_y: r.plant_y,
            fb_team: r.first_blood_team,
            contact_timing: r.contact_timing || null,
            notable: r.notable,
            memo: r.memo || null,
          })),
        }),
      }).then(r => r.json())
      if (roundRes.error) throw new Error(roundRes.error)

      const j = await fetch(`/api/matches/${id}`).then(r => r.json())
      setData(j.data)
      setEditRoundMode(false)
    } catch (e) {
      setRoundSaveError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg border border-border text-muted-foreground hover:text-white hover:border-white/30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="text-xs text-muted-foreground">{matchDate} · {String(match.map)} · {String(match.match_type)}</div>
          <h1 className="text-xl font-bold text-white mt-0.5">
            VS <span style={{ color: resultColor }}>{String(match.opponent_name)}</span>
          </h1>
        </div>
      </div>

      {/* Score card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">MY TEAM</div>
            <div className="text-5xl font-black text-white">{String(match.team_score)}</div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-black px-6 py-2 rounded-xl"
              style={{ color: resultColor, background: `${resultColor}15` }}
            >
              {resultLabel}
            </div>
            <div className="text-xs text-muted-foreground mt-2">{String(match.map)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">{String(match.opponent_name)}</div>
            <div className="text-5xl font-black text-muted-foreground">{String(match.opponent_score)}</div>
          </div>
        </div>

        {(attackTotal > 0 || defenseTotal > 0) && (
          <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-border">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Crosshair className="w-3 h-3" /> ATKサイド
              </div>
              <div className="text-lg font-bold" style={{ color: '#FF8C42' }}>
                {attackTotal > 0 ? `${attackWins}/${attackTotal}` : '--'}
              </div>
              {attackTotal > 0 && (
                <div className="text-xs text-muted-foreground">
                  {Math.round((attackWins / attackTotal) * 100)}%
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> DEFサイド
              </div>
              <div className="text-lg font-bold" style={{ color: '#00D4A0' }}>
                {defenseTotal > 0 ? `${defenseWins}/${defenseTotal}` : '--'}
              </div>
              {defenseTotal > 0 && (
                <div className="text-xs text-muted-foreground">
                  {Math.round((defenseWins / defenseTotal) * 100)}%
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Player stats */}
      {(playerStats.length > 0 || editMode) && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="text-sm font-semibold text-white">{t('matches.playerStatsTitle')}</div>
            {!editMode ? (
              <button
                onClick={enterEdit}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white border border-border hover:border-white/30 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Pencil className="w-3 h-3" /> {t('common.edit')}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {saveError && <span className="text-xs text-[#FF4655]">{saveError}</span>}
                <button
                  onClick={() => setEditMode(false)}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white border border-border rounded-lg px-3 py-1.5 transition-colors"
                >
                  <X className="w-3 h-3" /> {t('common.cancel')}
                </button>
                <button
                  onClick={saveAll}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs bg-[#FF4655] hover:bg-[#FF4655]/80 text-white rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Save className="w-3 h-3" /> {saving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            )}
          </div>
          {editMode && (
            <div className="px-5 py-3 border-b border-border flex items-center gap-3">
              <label className="text-xs text-muted-foreground whitespace-nowrap">{t('matches.matchDateEdit')}</label>
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="bg-muted border border-border rounded px-2 py-1 text-xs text-white focus:border-[#FF4655] outline-none"
              />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {[t('matches.headerPlayer'), t('common.agent'), 'K', 'D', 'A', 'ACS', 'KD', 'FB', 'FD'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(editMode ? editPlayers : playerStats.map(p => ({
                  player_id: String(p.player_id ?? ''),
                  ign: String(p.ign ?? '--'),
                  agent: String(p.agent ?? '--'),
                  kills: Number(p.kills ?? 0),
                  deaths: Number(p.deaths ?? 0),
                  assists: Number(p.assists ?? 0),
                  acs: Number(p.acs ?? 0),
                  hs_pct: Number(p.hs_pct ?? 0),
                  first_bloods: Number(p.first_bloods ?? 0),
                  first_deaths: Number(p.first_deaths ?? 0),
                }))).map((p, i) => {
                  const kd = p.deaths > 0 ? p.kills / p.deaths : p.kills
                  if (!editMode) {
                    return (
                      <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">{p.ign}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.agent}</td>
                        <td className="px-4 py-3 text-[#00D4A0] font-bold">{p.kills}</td>
                        <td className="px-4 py-3 text-[#FF4655]">{p.deaths}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.assists}</td>
                        <td className="px-4 py-3 font-bold text-white">{p.acs}</td>
                        <td className={cn('px-4 py-3 font-semibold', kd >= 1.0 ? 'text-[#00D4A0]' : 'text-[#FF4655]')}>
                          {kd.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-[#FF8C42]">{p.first_bloods}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.first_deaths}</td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={i} className="border-b border-border/50 last:border-0 bg-muted/10">
                      <td className="px-4 py-2 font-semibold text-white text-xs">{p.ign}</td>
                      <td className="px-2 py-2">
                        <select
                          value={p.agent}
                          onChange={e => updatePlayer(i, 'agent', e.target.value)}
                          className={selectCls}
                        >
                          {p.agent && !(AGENTS as readonly string[]).includes(p.agent) && (
                            <option key="__current" value={p.agent}>{p.agent}</option>
                          )}
                          {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </td>
                      {(['kills', 'deaths', 'assists', 'acs'] as const).map(f => (
                        <td key={f} className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            value={p[f]}
                            onChange={e => updatePlayer(i, f, Number(e.target.value))}
                            className={cn(inputCls, 'w-14')}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-xs text-muted-foreground">
                        {kd.toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          value={p.first_bloods}
                          onChange={e => updatePlayer(i, 'first_bloods', Number(e.target.value))}
                          className={cn(inputCls, 'w-14')}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          value={p.first_deaths}
                          onChange={e => updatePlayer(i, 'first_deaths', Number(e.target.value))}
                          className={cn(inputCls, 'w-14')}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Round log */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="text-sm font-semibold text-white">{t('matches.roundDetailTitle')}</div>
            {!editRoundMode ? (
              <button
                onClick={enterRoundEdit}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white border border-border hover:border-white/30 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Pencil className="w-3 h-3" /> {t('common.edit')}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {roundSaveError && <span className="text-xs text-[#FF4655]">{roundSaveError}</span>}
                <button
                  onClick={() => { setEditRoundMode(false); setMemoOpenIdx(new Set()) }}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white border border-border rounded-lg px-3 py-1.5 transition-colors"
                >
                  <X className="w-3 h-3" /> {t('common.cancel')}
                </button>
                <button
                  onClick={saveRounds}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs bg-[#FF4655] hover:bg-[#FF4655]/80 text-white rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Save className="w-3 h-3" /> {saving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            )}
          </div>

          {!editRoundMode ? (
            <div className="p-4">
              {rounds.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {t('matches.noRoundData')}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {rounds.map((r) => {
                      const isWin = r.result === 'win'
                      const side = String(r.side ?? '')
                      const hasMemo = !!r.memo
                      return (
                        <div
                          key={String(r.round_number)}
                          title={`R${r.round_number} ${side} ${r.economy_type ?? ''}${r.planted ? ' 💣' : ''}${hasMemo ? ' 📝' : ''}`}
                          className={cn(
                            'relative w-8 h-8 rounded flex items-center justify-center text-xs font-bold cursor-default',
                            isWin
                              ? 'bg-[#00D4A0]/20 text-[#00D4A0] border border-[#00D4A0]/30'
                              : 'bg-[#FF4655]/20 text-[#FF4655] border border-[#FF4655]/30'
                          )}
                        >
                          {String(r.round_number)}
                          {hasMemo && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#3498DB]" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {/* メモ一覧 */}
                  {rounds.some(r => r.memo) && (
                    <div className="mt-3 space-y-1.5">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Bookmark className="w-3 h-3" /> メモ
                      </div>
                      {rounds.filter(r => r.memo).map(r => (
                        <div key={String(r.round_number)} className="flex items-start gap-2 text-xs bg-[#3498DB]/5 border border-[#3498DB]/15 rounded-lg px-3 py-1.5">
                          <span className="text-[#3498DB] font-mono font-bold shrink-0">R{String(r.round_number)}</span>
                          <span className="text-white/70 leading-relaxed">{String(r.memo)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-[#00D4A0]/20 border border-[#00D4A0]/30 inline-block" />{t('matches.roundWin')}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-[#FF4655]/20 border border-[#FF4655]/30 inline-block" />{t('matches.roundLoss')}
                    </span>
                  </div>

                  {/* Plant heatmap + site win rates */}
                  {(() => {
                    const planted = rounds.filter(r => Boolean(r.planted))
                    if (planted.length === 0) return null
                    const plantRounds: PlantRound[] = planted.map(r => ({
                      id: String(r.id ?? r.round_number),
                      round_number: Number(r.round_number),
                      plant_x: r.plant_x != null ? Number(r.plant_x) : null,
                      plant_y: r.plant_y != null ? Number(r.plant_y) : null,
                      plant_site: r.plant_site != null ? String(r.plant_site) : null,
                      result: String(r.result ?? ''),
                      side: String(r.side ?? ''),
                    }))
                    const siteStats = (['A', 'B', 'C'] as const).map(site => {
                      const atk  = planted.filter(r => r.plant_site === site && r.side === 'attack')
                      const def  = planted.filter(r => r.plant_site === site && r.side === 'defense')
                      return {
                        site,
                        atk:    { total: (atk as unknown[]).length, wins: (atk as Record<string,unknown>[]).filter(r => r.result === 'win').length },
                        retake: { total: (def as unknown[]).length, wins: (def as Record<string,unknown>[]).filter(r => r.result === 'win').length },
                      }
                    }).filter(s => s.atk.total > 0 || s.retake.total > 0)
                    return (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 items-start">
                        <MapPlantSelector
                          mapName={String(match.map ?? '')}
                          rounds={plantRounds}
                          editRoundId={null}
                          onSaved={() => {}}
                          onCancelEdit={() => {}}
                        />
                        {siteStats.length > 0 && (
                          <div className="space-y-3">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {t('matches.siteWinRatesTitle')}
                            </div>
                            {siteStats.map(s => (
                              <div key={s.site} className="space-y-1.5">
                                <div className="text-xs font-semibold text-white">{s.site}{t('dashboard.siteSuffix')}</div>
                                {s.atk.total > 0 && (() => {
                                  const wr = Math.round((s.atk.wins / s.atk.total) * 100)
                                  return (
                                    <div>
                                      <div className="flex justify-between text-[10px] mb-0.5">
                                        <span className="text-muted-foreground">{t('matches.atkExecution')}</span>
                                        <span className={wr >= 50 ? 'text-[#00D4A0] font-bold' : 'text-[#FF4655] font-bold'}>{wr}% <span className="text-muted-foreground/60 font-normal">{s.atk.wins}/{s.atk.total}</span></span>
                                      </div>
                                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-[#FF8C42]" style={{ width: `${wr}%` }} />
                                      </div>
                                    </div>
                                  )
                                })()}
                                {s.retake.total > 0 && (() => {
                                  const wr = Math.round((s.retake.wins / s.retake.total) * 100)
                                  return (
                                    <div>
                                      <div className="flex justify-between text-[10px] mb-0.5">
                                        <span className="text-muted-foreground">{t('matches.retake')}</span>
                                        <span className={wr >= 50 ? 'text-[#00D4A0] font-bold' : 'text-[#FF4655] font-bold'}>{wr}% <span className="text-muted-foreground/60 font-normal">{s.retake.wins}/{s.retake.total}</span></span>
                                      </div>
                                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-[#00D4A0]" style={{ width: `${wr}%` }} />
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {['#', t('matches.headerSide'), t('matches.headerEconomy'), t('matches.headerResult'), t('matches.headerPlant'), t('matches.headerSite'), t('matches.headerRetake'), 'FB', t('matches.headerTiming'), t('matches.headerNotable'), 'メモ', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editRounds.map((r, i) => (
                      <Fragment key={i}>
                      <tr className={cn(
                        'border-b border-border/40 last:border-0',
                        r.result === 'win' ? 'bg-[#00D4A0]/5' : r.result === 'loss' ? 'bg-[#FF4655]/5' : ''
                      )}>
                        {/* # */}
                        <td className="px-3 py-1.5">
                          <input
                            type="number" min={1}
                            value={r.round_number}
                            onChange={e => updateRound(i, 'round_number' as keyof REdit, e.target.value)}
                            className={cn(inputCls, 'w-12')}
                          />
                        </td>
                        {/* サイド */}
                        <td className="px-2 py-1">
                          <select
                            value={r.side}
                            onChange={e => {
                              updateRound(i, 'side', e.target.value)
                              // サイドが変わったらプラント/リテイクをリセット
                              if (e.target.value === 'attack') updateRound(i, 'retake', false)
                              if (e.target.value === 'defense') { updateRound(i, 'planted', false); updateRound(i, 'plant_site', '') }
                            }}
                            className={cn(
                              'border rounded px-2 py-1 text-xs font-semibold focus:border-[#FF4655] outline-none',
                              r.side === 'attack'  ? 'bg-[#FF8C42]/20 border-[#FF8C42]/30 text-[#FF8C42]' :
                              r.side === 'defense' ? 'bg-[#00D4A0]/20 border-[#00D4A0]/30 text-[#00D4A0]' :
                              'bg-muted border-border text-muted-foreground'
                            )}
                          >
                            <option value="attack">ATK</option>
                            <option value="defense">DEF</option>
                          </select>
                        </td>
                        {/* エコノミー */}
                        <td className="px-2 py-1">
                          <select
                            value={r.economy_type}
                            onChange={e => updateRound(i, 'economy_type', e.target.value)}
                            className={selectCls}
                          >
                            <option value=""></option>
                            {ECO_OPTIONS.map(o => (
                              <option key={o} value={o}>{t(`eco.${o}`)}</option>
                            ))}
                          </select>
                        </td>
                        {/* 結果 */}
                        <td className="px-2 py-1">
                          <div className="flex gap-1">
                            {[
                              { value: 'win',  label: 'W', color: 'text-[#00D4A0]', bg: 'bg-[#00D4A0]/20 border-[#00D4A0]/40' },
                              { value: 'loss', label: 'L', color: 'text-[#FF4655]', bg: 'bg-[#FF4655]/20 border-[#FF4655]/40' },
                            ].map(opt => (
                              <button key={opt.value} type="button"
                                onClick={() => updateRound(i, 'result', r.result === opt.value ? '' : opt.value)}
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors',
                                  r.result === opt.value
                                    ? opt.bg + ' ' + opt.color
                                    : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground'
                                )}
                              >{opt.label}</button>
                            ))}
                          </div>
                        </td>
                        {/* プラント */}
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={r.planted}
                              disabled={r.side !== 'attack'}
                              onChange={e => {
                                updateRound(i, 'planted', e.target.checked)
                                if (!e.target.checked) {
                                  updateRound(i, 'plant_site', '')
                                  updateRoundCoords(i, null, null, null)
                                  if (plantEditIdx === i) setPlantEditIdx(null)
                                }
                              }}
                              className="accent-[#FF4655] w-4 h-4"
                            />
                            {r.planted && r.side === 'attack' && (
                              <button
                                onClick={() => setPlantEditIdx(plantEditIdx === i ? null : i)}
                                title="プラント位置を設定"
                                className={cn(
                                  'p-0.5 rounded transition-colors',
                                  plantEditIdx === i ? 'text-[#FF4655]' :
                                  r.plant_x != null ? 'text-[#00D4A0]' : 'text-muted-foreground hover:text-white'
                                )}
                              >
                                <MapPin className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        {/* サイト */}
                        <td className="px-2 py-1">
                          <div className="flex gap-1">
                            {['A', 'B', 'C'].map(s => (
                              <button key={s} type="button"
                                onClick={() => updateRound(i, 'plant_site', r.plant_site === s ? '' : s)}
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors',
                                  r.plant_site === s
                                    ? 'bg-[#6C63FF]/20 border-[#6C63FF]/40 text-[#6C63FF]'
                                    : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground'
                                )}
                              >{s}</button>
                            ))}
                          </div>
                        </td>
                        {/* リテイク */}
                        <td className="px-3 py-1.5">
                          <input
                            type="checkbox"
                            checked={r.retake}
                            disabled={r.side !== 'defense'}
                            onChange={e => {
                              updateRound(i, 'retake', e.target.checked)
                            }}
                            className="accent-[#6C63FF] w-4 h-4"
                          />
                        </td>
                        {/* FB */}
                        <td className="px-2 py-1">
                          <div className="flex gap-1">
                            {[
                              { value: 'us',   label: '味方', color: 'text-[#00D4A0]', bg: 'bg-[#00D4A0]/20 border-[#00D4A0]/40' },
                              { value: 'them', label: '相手', color: 'text-[#FF4655]', bg: 'bg-[#FF4655]/20 border-[#FF4655]/40' },
                            ].map(opt => {
                              const cur = r.first_blood_team === '' ? '' : r.first_blood_team === 'true' ? 'us' : 'them'
                              return (
                                <button key={opt.value} type="button"
                                  onClick={() => updateRound(i, 'first_blood_team',
                                    cur === opt.value ? '' : opt.value === 'us' ? 'true' : 'false'
                                  )}
                                  className={cn(
                                    'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors whitespace-nowrap',
                                    cur === opt.value
                                      ? opt.bg + ' ' + opt.color
                                      : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground'
                                  )}
                                >{opt.label}</button>
                              )
                            })}
                          </div>
                        </td>
                        {/* タイミング */}
                        <td className="px-2 py-1">
                          <div className="flex gap-1">
                            {TIMING_OPTIONS.map(t => (
                              <button key={t.value} type="button"
                                onClick={() => updateRound(i, 'contact_timing', r.contact_timing === t.value ? '' : t.value)}
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors',
                                  r.contact_timing === t.value
                                    ? t.bg + ' ' + t.color
                                    : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground'
                                )}
                              >{t.label}</button>
                            ))}
                          </div>
                        </td>
                        {/* 注目 */}
                        <td className="px-2 py-1">
                          <button type="button"
                            onClick={() => updateRound(i, 'notable', !r.notable)}
                            className={cn(
                              'p-1 rounded transition-colors',
                              r.notable ? 'text-[#FF4655] bg-[#FF4655]/10' : 'text-muted-foreground hover:text-white'
                            )}
                          >
                            <Flag className="w-3.5 h-3.5" fill={r.notable ? 'currentColor' : 'none'} />
                          </button>
                        </td>
                        {/* メモ toggle */}
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            title="メモ"
                            onClick={() => setMemoOpenIdx(prev => {
                              const next = new Set(prev)
                              next.has(i) ? next.delete(i) : next.add(i)
                              return next
                            })}
                            className={cn(
                              'p-1 rounded transition-colors',
                              r.memo
                                ? 'text-[#3498DB] bg-[#3498DB]/10'
                                : memoOpenIdx.has(i)
                                  ? 'text-white bg-white/10'
                                  : 'text-muted-foreground hover:text-[#3498DB]'
                            )}
                          >
                            <Bookmark className="w-3.5 h-3.5" fill={r.memo ? 'currentColor' : 'none'} />
                          </button>
                        </td>
                        {/* 削除 */}
                        <td className="px-2 py-1.5">
                          <button
                            onClick={() => removeRound(i)}
                            className="p-1 rounded text-muted-foreground hover:text-[#FF4655] hover:bg-[#FF4655]/10 transition-colors"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                      {/* メモ展開行 */}
                      {memoOpenIdx.has(i) && (
                        <tr className="border-b border-border">
                          <td colSpan={13} className="px-3 py-2 bg-[#3498DB]/5">
                            <div className="flex items-start gap-2">
                              <Bookmark className="w-3.5 h-3.5 text-[#3498DB] mt-1.5 flex-shrink-0" fill={r.memo ? 'currentColor' : 'none'} />
                              <textarea
                                rows={2}
                                autoFocus
                                value={r.memo}
                                onChange={e => updateRound(i, 'memo' as keyof REdit, e.target.value)}
                                placeholder={`R${r.round_number} のメモ（気づき・改善点）`}
                                className="flex-1 bg-muted/30 border border-[#3498DB]/30 rounded px-2.5 py-1.5 text-xs text-white placeholder-muted-foreground/50 focus:border-[#3498DB] outline-none resize-none"
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Plant position picker */}
              {plantEditIdx !== null && editRounds[plantEditIdx] && (() => {
                const mapName = String(match.map ?? '')
                const mapKey = normalizeMapKey(mapName)
                const imgUrl = MAP_IMAGES[mapKey] ? `/api/map-image?key=${mapKey}` : null
                const polygons = MAP_POLYGONS[mapKey] ?? {}
                const pr = editRounds[plantEditIdx]
                return (
                  <InlineMapPicker
                    key={plantEditIdx}
                    mapName={mapName}
                    imgUrl={imgUrl}
                    roundNumber={pr.round_number}
                    currentX={pr.plant_x}
                    currentY={pr.plant_y}
                    existingDots={editRounds
                      .filter((r, i) => i !== plantEditIdx && r.plant_x != null && r.plant_y != null)
                      .map(r => ({ x: r.plant_x!, y: r.plant_y!, win: r.result === 'win' }))}
                    onClose={() => setPlantEditIdx(null)}
                    onPick={(x, y) => {
                      const site = detectSite(x, y, polygons)
                      updateRoundCoords(plantEditIdx, x, y, site)
                      if (site) updateRound(plantEditIdx, 'plant_site', site)
                      setPlantEditIdx(null)
                    }}
                  />
                )
              })()}

              {/* Add row button */}
              <div className="px-4 py-3 border-t border-border/60">
                <button
                  onClick={addRound}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white border border-dashed border-border hover:border-white/40 rounded-lg px-3 py-2 w-full justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> ラウンド追加
                </button>
              </div>
            </div>
          )}
        </div>

      {playerStats.length === 0 && rounds.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          詳細データがありません
        </div>
      )}
    </div>
  )
}

// ── Inline map picker for edit mode ──
function InlineMapPicker({
  mapName, imgUrl, roundNumber, currentX, currentY, existingDots, onClose, onPick,
}: {
  mapName: string
  imgUrl: string | null
  roundNumber: number
  currentX?: number | null
  currentY?: number | null
  existingDots: { x: number; y: number; win: boolean }[]
  onClose: () => void
  onPick: (x: number, y: number) => void
}) {
  const [imgError, setImgError] = useState(false)
  const [hoverScreen, setHoverScreen] = useState<{ x: number; y: number } | null>(null)
  const rotation = MAP_ROTATION[normalizeMapKey(mapName)] ?? 0

  function toScreenPos(mx: number, my: number) {
    if (!rotation) return { x: mx, y: my }
    const θ = rotation * Math.PI / 180
    const cx = mx - 0.5, cy = my - 0.5
    return {
      x: cx * Math.cos(θ) - cy * Math.sin(θ) + 0.5,
      y: cx * Math.sin(θ) + cy * Math.cos(θ) + 0.5,
    }
  }

  function screenToMap(sx: number, sy: number) {
    if (!rotation) return { x: sx, y: sy }
    const θ = rotation * Math.PI / 180
    const cx = sx - 0.5, cy = sy - 0.5
    return {
      x:  cx * Math.cos(θ) + cy * Math.sin(θ) + 0.5,
      y: -cx * Math.sin(θ) + cy * Math.cos(θ) + 0.5,
    }
  }

  const currentScreen = currentX != null && currentY != null
    ? toScreenPos(currentX, currentY)
    : null

  return (
    <div className="border-t border-border/60 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          R{roundNumber} のプラント位置 — マップをクリック
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div
        className="relative rounded-xl overflow-hidden border border-[#FF4655]/50 cursor-none mx-auto"
        style={{ width: '100%', maxWidth: 320, aspectRatio: '1 / 1' }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          const sx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
          const sy = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
          const { x, y } = screenToMap(sx, sy)
          onPick(x, y)
        }}
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          setHoverScreen({
            x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
            y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
          })
        }}
        onMouseLeave={() => setHoverScreen(null)}
      >
        <div
          className="w-full h-full"
          style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
        >
          {imgUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl} alt={mapName}
              className="w-full h-full object-cover select-none"
              draggable={false}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1">
              <span className="text-muted-foreground text-sm">{mapName}</span>
              {imgError && <span className="text-muted-foreground/50 text-[10px]">画像を読み込めません</span>}
            </div>
          )}
        </div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {existingDots.map((d, i) => {
            const s = toScreenPos(d.x, d.y)
            return (
              <circle key={i}
                cx={`${s.x * 100}%`} cy={`${s.y * 100}%`}
                r={3} fill={d.win ? '#00D4A0' : '#FF4655'} fillOpacity={0.85}
                stroke="rgba(0,0,0,0.4)" strokeWidth={0.8}
              />
            )
          })}
          {currentScreen && (
            <g>
              <circle
                cx={`${currentScreen.x * 100}%`} cy={`${currentScreen.y * 100}%`}
                r={10} fill="#FF4655" fillOpacity={0.9} stroke="white" strokeWidth={1.5}
              />
              <text
                x={`${currentScreen.x * 100}%`} y={`${currentScreen.y * 100}%`}
                textAnchor="middle" dominantBaseline="central"
                fill="white" fontSize={9} fontWeight="bold"
              >{roundNumber}</text>
            </g>
          )}
          {hoverScreen && (
            <g>
              <line x1={`${hoverScreen.x * 100}%`} y1="0" x2={`${hoverScreen.x * 100}%`} y2="100%"
                stroke="#FF4655" strokeWidth="0.6" strokeOpacity="0.5" strokeDasharray="4 4" />
              <line x1="0" y1={`${hoverScreen.y * 100}%`} x2="100%" y2={`${hoverScreen.y * 100}%`}
                stroke="#FF4655" strokeWidth="0.6" strokeOpacity="0.5" strokeDasharray="4 4" />
              <circle cx={`${hoverScreen.x * 100}%`} cy={`${hoverScreen.y * 100}%`}
                r={3} fill="#FF4655" fillOpacity={0.9} stroke="white" strokeWidth={0.8} />
            </g>
          )}
        </svg>
        <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1 text-center pointer-events-none">
          <span className="text-white text-[10px]">クリックして位置を設定</span>
        </div>
      </div>
    </div>
  )
}
