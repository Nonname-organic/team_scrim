'use client'
import { useEffect, useRef, useState } from 'react'
import { Upload, Save, RotateCcw, Loader2, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MAPS, AGENTS } from '@/types'

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? 'YOUR_TEAM_UUID'

// ============================================================
// Types
// ============================================================
interface Player { id: string; ign: string; role: string }

interface PlayerRow {
  player_id: string
  agent: string
  kills: number | ''
  deaths: number | ''
  assists: number | ''
  fb: number | ''
  fd: number | ''
  acs: number | ''
  hs_pct: number | ''
}

interface RoundRow {
  round_number: number
  side: 'attack' | 'defense' | ''
  economy: string
  result: 'win' | 'loss' | ''
  plant: boolean
  site: string
  retake: boolean
  fb_team: boolean | ''
  contact_timing: 'early' | 'mid' | 'late' | ''
}

const TIMING_OPTIONS = [
  { value: 'early', label: 'Early', sub: '〜25秒', color: 'text-[#FF4655]', bg: 'bg-[#FF4655]/20 border-[#FF4655]/40' },
  { value: 'mid',   label: 'Mid',   sub: '25〜75秒', color: 'text-[#6C63FF]', bg: 'bg-[#6C63FF]/20 border-[#6C63FF]/40' },
  { value: 'late',  label: 'Late',  sub: '75秒〜', color: 'text-[#9B9BA4]', bg: 'bg-muted/40 border-border' },
]

const EMPTY_ROW = (): PlayerRow => ({
  player_id: '', agent: '', kills: '', deaths: '', assists: '',
  fb: '', fd: '', acs: '', hs_pct: '',
})

const ECO_OPTIONS = ['pistol', 'eco', 'anti_eco', 'semi_eco', 'semi_buy', 'full_buy', 'force']
const ECO_LABELS: Record<string, string> = {
  pistol: 'ピストル', eco: 'エコ', anti_eco: 'アンチエコ', semi_eco: 'セミエコ',
  semi_buy: 'セミバイ', full_buy: 'フルバイ', force: 'フォース',
}

// ============================================================
// Page
// ============================================================
export default function ScrimInputPage() {
  const [players, setPlayers] = useState<Player[]>([])

  // Match info
  const [matchDate, setMatchDate] = useState(new Date().toISOString().slice(0, 10))
  const [map, setMap] = useState('')
  const [teamScore, setTeamScore] = useState<number | ''>('')
  const [oppScore, setOppScore] = useState<number | ''>('')
  const [firstHalfSide, setFirstHalfSide] = useState<'attack' | 'defense' | ''>('')
  const [matchType, setMatchType] = useState('scrim')
  const [opponentName, setOpponentName] = useState('')

  // Player rows — 登録選手数に合わせて可変（最低5行）
  const [rows, setRows] = useState<PlayerRow[]>(Array.from({ length: 5 }, EMPTY_ROW))

  // Round detail
  const [showRounds, setShowRounds] = useState(false)
  const [rounds, setRounds] = useState<RoundRow[]>([])
  const [videoUrl, setVideoUrl] = useState('')

  // UI state
  const [ocrLoading, setOcrLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/players?team_id=${TEAM_ID}`)
      .then(r => r.json())
      .then(j => {
        const fetched: Player[] = j.data ?? []
        setPlayers(fetched)
        // 登録選手を最初から行に入れる（スタッツは空）
        const preFilledRows: PlayerRow[] = fetched.slice(0, 10).map(p => ({
          ...EMPTY_ROW(),
          player_id: p.id,
        }))
        // 最低5行確保
        while (preFilledRows.length < 5) preFilledRows.push(EMPTY_ROW())
        setRows(preFilledRows)
      })
  }, [])

  // Auto-generate rounds when score changes
  useEffect(() => {
    const total = Number(teamScore || 0) + Number(oppScore || 0)
    if (total < 2 || total > 50) return
    const side1 = firstHalfSide || 'attack'
    const side2 = side1 === 'attack' ? 'defense' : 'attack'
    const half = Math.ceil(total / 2)
    setRounds(Array.from({ length: total }, (_, i) => ({
      round_number: i + 1,
      side: (i < half ? side1 : side2) as 'attack' | 'defense',
      economy: '',
      result: '',
      plant: false,
      site: '',
      retake: false,
      fb_team: '',
      contact_timing: '',
    })))
  }, [teamScore, oppScore, firstHalfSide])

  // Computed KPR/DPR/APR
  const totalRounds = Number(teamScore || 0) + Number(oppScore || 0)
  function calcRate(val: number | '', rounds: number) {
    if (val === '' || rounds === 0) return '-'
    return (Number(val) / rounds).toFixed(2)
  }

  // ── OCR auto-fill ──
  async function handleOcr(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('image', file)
    fd.append('map', map)

    try {
      const res = await fetch('/api/ocr', { method: 'POST', body: fd })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'OCR失敗')

      // Populate match info
      if (json.map && json.map !== 'unknown') setMap(json.map)
      if (json.team_score != null) setTeamScore(json.team_score)
      if (json.opponent_score != null) setOppScore(json.opponent_score)

      // OCRデータを登録済み選手に名前照合してスタッツだけ上書き
      const ocr: Record<string, unknown>[] = json.players ?? []

      setRows(prev => {
        const next = prev.map(row => {
          // この行に対応するプレイヤーのIGNを取得
          const regPlayer = players.find(p => p.id === row.player_id)
          if (!regPlayer) return row

          // OCRデータから名前が一致するものを探す
          const hit = ocr.find(op =>
            String(op.ign).toLowerCase().replace(/\s/g, '') ===
            regPlayer.ign.toLowerCase().replace(/\s/g, '')
          )
          if (!hit) return row  // 一致なし → そのまま

          // スタッツだけ上書き（player_idはそのまま）
          return {
            ...row,
            agent:  String(hit.agent ?? row.agent),
            kills:  hit.kills  != null ? Number(hit.kills)  : row.kills,
            deaths: hit.deaths != null ? Number(hit.deaths) : row.deaths,
            assists:hit.assists!= null ? Number(hit.assists): row.assists,
            fb:     hit.first_bloods != null ? Number(hit.first_bloods) : row.fb,
            fd:     hit.first_deaths != null ? Number(hit.first_deaths) : row.fd,
            acs:    hit.acs    != null ? Number(hit.acs)    : row.acs,
            hs_pct: hit.hs_pct != null ? Number(hit.hs_pct): row.hs_pct,
          }
        })
        return next
      })
    } catch (e) {
      setError(String(e))
    } finally {
      setOcrLoading(false)
      e.target.value = ''
    }
  }

  // ── Save ──
  async function handleSave() {
    if (!map || teamScore === '' || oppScore === '') {
      setError('マップ・スコアは必須です')
      return
    }
    setSaving(true)
    setError(null)

    const playersPayload = rows
      .filter(r => r.player_id)
      .map(r => ({
        player_id: r.player_id,
        ign: players.find(p => p.id === r.player_id)?.ign ?? '',
        agent: r.agent,
        kills: Number(r.kills) || 0,
        deaths: Number(r.deaths) || 0,
        assists: Number(r.assists) || 0,
        acs: Number(r.acs) || 0,
        adr: 0,
        hs_pct: Number(r.hs_pct) || 0,
        first_bloods: Number(r.fb) || 0,
        first_deaths: Number(r.fd) || 0,
        rounds_played: totalRounds,
      }))

    try {
      // 1. Save match + player stats
      const matchRes = await fetch('/api/ocr/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: TEAM_ID,
          opponent_name: opponentName || '未登録',
          match_date: matchDate + 'T00:00:00',
          map, match_type: matchType,
          team_score: Number(teamScore),
          opponent_score: Number(oppScore),
          players: playersPayload,
        }),
      })
      const matchJson = await matchRes.json()
      if (!matchRes.ok) throw new Error(matchJson.details ?? matchJson.error ?? 'Save failed')

      const matchId = matchJson.data.match.id

      // 2. Save round details if filled
      const filledRounds = rounds.filter(r => r.result !== '')
      if (filledRounds.length > 0) {
        await fetch('/api/rounds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            match_id: matchId,
            rounds: filledRounds.map(r => ({
              ...r,
              // DEF retake = opponent planted, mark planted=true in DB
              plant: r.side === 'defense' ? r.retake : r.plant,
            })),
          }),
        })
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  // ── Reset ── スタッツのみクリア、選手IDは維持
  function handleReset() {
    setOpponentName(''); setMap(''); setTeamScore(''); setOppScore('')
    setFirstHalfSide(''); setMatchType('scrim')
    setMatchDate(new Date().toISOString().slice(0, 10))
    // 選手IDはそのまま、スタッツだけ空に
    setRows(prev => prev.map(r => ({ ...EMPTY_ROW(), player_id: r.player_id })))
    setRounds([]); setVideoUrl(''); setError(null)
  }

  function updateRow(i: number, key: keyof PlayerRow, val: unknown) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r))
  }
  function updateRound(i: number, key: keyof RoundRow, val: unknown) {
    setRounds(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          スクリム <span className="text-[#FF4655]">入力</span>
        </h1>
        <div className="flex gap-2">
          {/* OCR button */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={ocrLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-white hover:border-white/30 transition-colors disabled:opacity-50"
          >
            {ocrLoading
              ? <Loader2 className="w-4 h-4 animate-spin text-[#FF4655]" />
              : <Upload className="w-4 h-4" />
            }
            スコアボードから自動入力
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleOcr} />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 text-[#FF4655] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#FF4655]">{error}</p>
        </div>
      )}

      {/* ── Match Info ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">試合情報</div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="md:col-span-1">
            <Label>スクリム日</Label>
            <input type="date" className={cls} value={matchDate}
              onChange={e => setMatchDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>相手チーム名</Label>
            <input className={cls} placeholder="Team Name" value={opponentName}
              onChange={e => setOpponentName(e.target.value)} />
          </div>
          <div>
            <Label>マップ</Label>
            <select className={cls} value={map} onChange={e => setMap(e.target.value)}>
              <option value="">マップを選択</option>
              {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>自チームスコア *</Label>
            <input type="number" min={0} max={25} className={cls} value={teamScore}
              onChange={e => setTeamScore(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div>
            <Label>相手スコア *</Label>
            <input type="number" min={0} max={25} className={cls} value={oppScore}
              onChange={e => setOppScore(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div>
            <Label>前半サイド</Label>
            <select className={cls} value={firstHalfSide}
              onChange={e => setFirstHalfSide(e.target.value as 'attack' | 'defense' | '')}>
              <option value="">選択</option>
              <option value="attack">ATK</option>
              <option value="defense">DEF</option>
            </select>
          </div>
          <div>
            <Label>種別</Label>
            <select className={cls} value={matchType} onChange={e => setMatchType(e.target.value)}>
              <option value="scrim">スクリム</option>
              <option value="official">公式</option>
              <option value="practice">練習</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>ラウンド数</Label>
            <div className={cn(cls, 'bg-muted/10 text-muted-foreground cursor-default')}>
              {totalRounds > 0 ? `${totalRounds} R` : '自動計算'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Player Stats Table ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">選手スタッツ</div>
          {ocrLoading && (
            <div className="flex items-center gap-1.5 text-xs text-[#FF4655]">
              <Loader2 className="w-3 h-3 animate-spin" />
              OCR解析中...
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium w-6">#</th>
                <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">選手</th>
                <th className="px-3 py-2.5 text-xs text-muted-foreground font-medium">エージェント</th>
                {['K','D','A','FB','FD','ACS'].map(h => (
                  <th key={h} className="px-2 py-2.5 text-xs text-muted-foreground font-medium text-center">{h}</th>
                ))}
                <th className="px-2 py-2.5 text-xs text-muted-foreground font-medium text-center">KPR</th>
                <th className="px-2 py-2.5 text-xs text-muted-foreground font-medium text-center">DPR</th>
                <th className="px-2 py-2.5 text-xs text-muted-foreground font-medium text-center">APR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{i + 1}</td>

                  {/* Player select */}
                  <td className="px-3 py-2">
                    <select
                      className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs text-white focus:border-[#FF4655] outline-none w-32"
                      value={row.player_id}
                      onChange={e => updateRow(i, 'player_id', e.target.value)}
                    >
                      <option value="">-- 選手 --</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id}>{p.ign}</option>
                      ))}
                    </select>
                  </td>

                  {/* Agent select */}
                  <td className="px-3 py-2">
                    <select
                      className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs text-white focus:border-[#FF4655] outline-none w-28"
                      value={row.agent}
                      onChange={e => updateRow(i, 'agent', e.target.value)}
                    >
                      <option value="">エージェント選択</option>
                      {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </td>

                  {/* Numeric stats */}
                  {(['kills','deaths','assists','fb','fd','acs'] as const).map(key => (
                    <td key={key} className="px-2 py-2">
                      <input
                        type="number" min={0}
                        className="w-14 bg-muted border border-transparent hover:border-border focus:border-[#FF4655] rounded px-2 py-1 text-xs text-white outline-none text-center transition-colors"
                        value={row[key]}
                        placeholder="0"
                        onChange={e => updateRow(i, key, e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                  ))}

                  {/* Auto-calculated rates */}
                  <td className="px-2 py-2 text-center text-xs text-muted-foreground">
                    {calcRate(row.kills, totalRounds)}
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-muted-foreground">
                    {calcRate(row.deaths, totalRounds)}
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-muted-foreground">
                    {calcRate(row.assists, totalRounds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Round Detail (Collapsible) ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowRounds(v => !v)}
          className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              ラウンド詳細
            </span>
            <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">任意</span>
            {rounds.filter(r => r.result !== '').length > 0 && (
              <span className="text-xs text-[#00D4A0]">
                {rounds.filter(r => r.result !== '').length}R 入力済み
              </span>
            )}
          </div>
          {showRounds ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showRounds && (
          <div className="border-t border-border p-4 space-y-3">
            {/* Video URL */}
            <div>
              <Label>動画リンク <span className="text-muted-foreground font-normal">任意</span></Label>
              <input className={cls} placeholder="YouTube・Google Drive などのURLを入力"
                value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
            </div>

            {rounds.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                スコアを入力するとラウンド行が自動生成されます
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/20 border-b border-border">
                      {['#','サイド','エコノミー','結果','プラント','サイト','リテイク','FB','タイミング'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((r, i) => (
                      <tr key={i} className={cn(
                        'border-b border-border last:border-0',
                        r.result === 'win' ? 'bg-[#00D4A0]/5' : r.result === 'loss' ? 'bg-[#FF4655]/5' : ''
                      )}>
                        <td className="px-3 py-1.5 text-muted-foreground font-mono">{r.round_number}</td>
                        <td className="px-3 py-1.5">
                          <span className={cn('text-xs font-semibold',
                            r.side === 'attack' ? 'text-[#FF8C42]' : 'text-[#00D4A0]')}>
                            {r.side === 'attack' ? 'ATK' : r.side === 'defense' ? 'DEF' : '-'}
                          </span>
                        </td>
                        <td className="px-2 py-1">
                          <select
                            className="bg-muted border border-border rounded px-1.5 py-1 text-xs text-white focus:border-[#FF4655] outline-none"
                            value={r.economy}
                            onChange={e => updateRound(i, 'economy', e.target.value)}
                          >
                            <option value=""></option>
                            {ECO_OPTIONS.map(o => <option key={o} value={o}>{ECO_LABELS[o]}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <select
                            className={cn(
                              'border rounded px-2 py-1 text-xs font-semibold focus:border-[#FF4655] outline-none',
                              r.result === 'win' ? 'bg-[#00D4A0]/20 border-[#00D4A0]/30 text-[#00D4A0]' :
                              r.result === 'loss' ? 'bg-[#FF4655]/20 border-[#FF4655]/30 text-[#FF4655]' :
                              'bg-muted border-border text-muted-foreground'
                            )}
                            value={r.result}
                            onChange={e => updateRound(i, 'result', e.target.value)}
                          >
                            <option value=""></option>
                            <option value="win">WIN</option>
                            <option value="loss">LOSS</option>
                          </select>
                        </td>
                        <td className="px-3 py-1.5">
                          {/* ATK: plant enabled / DEF: plant disabled */}
                          <input type="checkbox" className="accent-[#FF4655]"
                            checked={r.plant}
                            disabled={r.side !== 'attack'}
                            onChange={e => {
                              updateRound(i, 'plant', e.target.checked)
                              if (!e.target.checked) { updateRound(i, 'site', '') }
                            }} />
                        </td>
                        <td className="px-2 py-1">
                          <select
                            className="bg-muted border border-border rounded px-1.5 py-1 text-xs text-white focus:border-[#FF4655] outline-none w-12"
                            value={r.site}
                            onChange={e => updateRound(i, 'site', e.target.value)}
                          >
                            <option value=""></option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                          </select>
                        </td>
                        <td className="px-3 py-1.5">
                          {/* ATK: retake disabled / DEF: retake enabled */}
                          <input type="checkbox" className="accent-[#6C63FF]"
                            checked={r.retake}
                            disabled={r.side !== 'defense'}
                            onChange={e => {
                              updateRound(i, 'retake', e.target.checked)
                              if (!e.target.checked) updateRound(i, 'site', '')
                            }} />
                        </td>
                        <td className="px-2 py-1">
                          <select
                            className="bg-muted border border-border rounded px-1.5 py-1 text-xs text-white focus:border-[#FF4655] outline-none"
                            value={r.fb_team === '' ? '' : r.fb_team ? 'us' : 'them'}
                            onChange={e => updateRound(i, 'fb_team',
                              e.target.value === '' ? '' : e.target.value === 'us')}
                          >
                            <option value=""></option>
                            <option value="us">味方</option>
                            <option value="them">相手</option>
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <div className="flex gap-1">
                            {TIMING_OPTIONS.map(t => (
                              <button
                                key={t.value}
                                type="button"
                                onClick={() => updateRound(i, 'contact_timing',
                                  r.contact_timing === t.value ? '' : t.value)}
                                title={`${t.label} ${t.sub}`}
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors',
                                  r.contact_timing === t.value
                                    ? t.bg + ' ' + t.color
                                    : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground'
                                )}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer buttons ── */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button onClick={handleReset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-white transition-colors">
          <RotateCcw className="w-4 h-4" />
          クリア
        </button>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
            saved ? 'bg-[#00D4A0] text-white' :
            saving ? 'bg-muted text-muted-foreground cursor-not-allowed' :
            'bg-[#FF4655] hover:bg-[#e03e4d] text-white'
          )}
        >
          {saved
            ? <><Check className="w-4 h-4" />保存しました！</>
            : saving
            ? <><Loader2 className="w-4 h-4 animate-spin" />保存中...</>
            : <><Save className="w-4 h-4" />スクリムを保存</>
          }
        </button>
      </div>
    </div>
  )
}

// ── Shared ──
const cls = 'w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF4655] outline-none'
function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground mb-1">{children}</div>
}
