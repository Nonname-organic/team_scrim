'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Shield, Crosshair, Pencil, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AGENTS } from '@/types'

const RESULT_COLOR = { win: '#00D4A0', loss: '#FF4655', draw: '#9B9BA4' } as const
const ECONOMY_OPTS = ['', 'pistol', 'eco', 'semi_eco', 'semi_buy', 'full_buy', 'force']
const SITE_OPTS = ['', 'A', 'B', 'C', 'M']

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
  plant_site: string
  first_blood_team: string
}

const inputCls = 'bg-muted/40 border border-border rounded px-1.5 py-0.5 text-xs text-white focus:border-[#FF4655] outline-none w-full'
const selectCls = 'bg-muted/40 border border-border rounded px-1 py-0.5 text-xs text-white focus:border-[#FF4655] outline-none w-full'

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editPlayers, setEditPlayers] = useState<PEdit[]>([])
  const [editRounds, setEditRounds] = useState<REdit[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/matches/${id}`)
      .then(r => r.json())
      .then(j => { setData(j.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">読み込み中...</div>
  )
  if (!data) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">試合が見つかりません</div>
  )

  const match = data.match as Record<string, unknown>
  const playerStats = (data.player_stats ?? []) as Record<string, unknown>[]
  const rounds = (data.rounds ?? []) as Record<string, unknown>[]

  const result = String(match.result ?? 'draw') as 'win' | 'loss' | 'draw'
  const resultLabel = result === 'win' ? '勝利' : result === 'loss' ? '敗北' : '引き分け'
  const resultColor = RESULT_COLOR[result]

  const matchDate = match.match_date
    ? new Date(String(match.match_date)).toLocaleDateString('ja-JP')
    : ''

  const attackWins = Number(match.attack_rounds_won ?? 0)
  const attackTotal = Number(match.attack_rounds_played ?? 0)
  const defenseWins = Number(match.defense_rounds_won ?? 0)
  const defenseTotal = Number(match.defense_rounds_played ?? 0)
  const totalRounds = Number(match.team_score ?? 0) + Number(match.opponent_score ?? 0)

  function enterEdit() {
    setSaveError(null)
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
    setEditRounds(rounds.map(r => ({
      round_number: Number(r.round_number),
      side: String(r.side ?? ''),
      result: String(r.result ?? ''),
      economy_type: String(r.economy_type ?? ''),
      planted: Boolean(r.planted),
      plant_site: r.plant_site == null ? '' : String(r.plant_site),
      first_blood_team:
        r.first_blood_team == null ? '' : String(r.first_blood_team),
    })))
    setEditMode(true)
  }

  function updatePlayer(i: number, field: keyof PEdit, value: string | number) {
    setEditPlayers(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function updateRound(i: number, field: keyof REdit, value: string | boolean) {
    setEditRounds(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  async function saveAll() {
    setSaving(true)
    setSaveError(null)
    try {
      // Save player stats
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

      // Save rounds
      if (editRounds.length > 0) {
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
              plant: r.planted,
              site: r.plant_site,
              fb_team: r.first_blood_team,
            })),
          }),
        }).then(r => r.json())
        if (roundRes.error) throw new Error(roundRes.error)
      }

      // Refresh
      const j = await fetch(`/api/matches/${id}`).then(r => r.json())
      setData(j.data)
      setEditMode(false)
    } catch (e) {
      setSaveError(String(e))
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
            <div className="text-sm font-semibold text-white">選手スタッツ</div>
            {!editMode ? (
              <button
                onClick={enterEdit}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white border border-border hover:border-white/30 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Pencil className="w-3 h-3" /> 編集
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {saveError && <span className="text-xs text-[#FF4655]">{saveError}</span>}
                <button
                  onClick={() => setEditMode(false)}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white border border-border rounded-lg px-3 py-1.5 transition-colors"
                >
                  <X className="w-3 h-3" /> キャンセル
                </button>
                <button
                  onClick={saveAll}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs bg-[#FF4655] hover:bg-[#FF4655]/80 text-white rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Save className="w-3 h-3" /> {saving ? '保存中...' : '保存'}
                </button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['選手', 'エージェント', 'K', 'D', 'A', 'ACS', 'KD', 'FB', 'FD'].map(h => (
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
      {rounds.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <div className="text-sm font-semibold text-white">ラウンドログ</div>
          </div>

          {!editMode ? (
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5">
                {rounds.map((r) => {
                  const isWin = r.result === 'win'
                  const side = String(r.side ?? '')
                  return (
                    <div
                      key={String(r.round_number)}
                      title={`R${r.round_number} ${side} ${r.economy_type ?? ''} ${r.planted ? '🌱' : ''}`}
                      className={cn(
                        'w-8 h-8 rounded flex items-center justify-center text-xs font-bold cursor-default',
                        isWin
                          ? 'bg-[#00D4A0]/20 text-[#00D4A0] border border-[#00D4A0]/30'
                          : 'bg-[#FF4655]/20 text-[#FF4655] border border-[#FF4655]/30'
                      )}
                    >
                      {String(r.round_number)}
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-[#00D4A0]/20 border border-[#00D4A0]/30 inline-block" />勝利
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-[#FF4655]/20 border border-[#FF4655]/30 inline-block" />敗北
                </span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['R#', 'サイド', '結果', 'エコ', 'プラント', 'サイト', 'FB取得'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editRounds.map((r, i) => (
                    <tr key={r.round_number} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
                      <td className="px-3 py-1.5 text-muted-foreground font-mono">{r.round_number}</td>
                      <td className="px-2 py-1.5">
                        <select
                          value={r.side}
                          onChange={e => updateRound(i, 'side', e.target.value)}
                          className={selectCls}
                        >
                          <option value="">-</option>
                          <option value="attack">ATK</option>
                          <option value="defense">DEF</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={r.result}
                          onChange={e => updateRound(i, 'result', e.target.value)}
                          className={selectCls}
                        >
                          <option value="">-</option>
                          <option value="win">勝利</option>
                          <option value="loss">敗北</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={r.economy_type}
                          onChange={e => updateRound(i, 'economy_type', e.target.value)}
                          className={selectCls}
                        >
                          {ECONOMY_OPTS.map(o => (
                            <option key={o} value={o}>{o || '-'}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={r.planted}
                          onChange={e => updateRound(i, 'planted', e.target.checked)}
                          className="accent-[#FF4655] w-4 h-4"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={r.plant_site}
                          onChange={e => updateRound(i, 'plant_site', e.target.value)}
                          className={selectCls}
                        >
                          {SITE_OPTS.map(o => (
                            <option key={o} value={o}>{o || '-'}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={r.first_blood_team}
                          onChange={e => updateRound(i, 'first_blood_team', e.target.value)}
                          className={selectCls}
                        >
                          <option value="">-</option>
                          <option value="true">取得</option>
                          <option value="false">被取得</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {playerStats.length === 0 && rounds.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          詳細データがありません
        </div>
      )}
    </div>
  )
}
