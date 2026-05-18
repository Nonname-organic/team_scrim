'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, Save, RotateCcw, Loader2, Check, AlertCircle, ChevronDown, ChevronUp, Flag, Bookmark, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MAPS, AGENTS } from '@/types'
import { MAP_IMAGES, MAP_POLYGONS, MAP_ROTATION, normalizeMapKey } from '@/lib/mapPolygons'
import { detectSite } from '@/lib/geometry'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

// OCR: 英語エージェント名 → 日本語カタカナ正規化マップ
const AGENT_EN_JA: Record<string, string> = {
  astra: 'アストラ', breach: 'ブリーチ', brimstone: 'ブリムストーン',
  chamber: 'チェンバー', clove: 'クローブ', cypher: 'サイファー',
  deadlock: 'デッドロック', fade: 'フェイド', gecko: 'ゲッコー',
  harbor: 'ハーバー', iso: 'アイソ', jett: 'ジェット',
  'kay/o': 'ケイオー', kayo: 'ケイオー', killjoy: 'キルジョイ',
  neon: 'ネオン', omen: 'オーメン', phoenix: 'フェニックス',
  raze: 'レイズ', reyna: 'レイナ', sage: 'セージ',
  skye: 'スカイ', sova: 'ソーヴァ', tejo: 'テホ',
  viper: 'ヴァイパー', vyse: 'ヴァイス', waylay: 'ウェイレイ',
  yoru: 'ヨル', mixes: 'ミクス',
}
function normalizeAgent(name: string): string {
  const key = name.toLowerCase().replace(/[\s\-_]/g, '')
  return AGENT_EN_JA[key] ?? name
}
// Riot ID（"Name#TAG"形式）のタグ部分を除き、記号・スペースも除去してIGN照合
function normalizeIgn(ign: string): string {
  return ign.toLowerCase().replace(/[\s\u3000]/g, '').split('#')[0]
}
// OCR名と登録名を照合（完全一致 → 前方一致 → 部分一致の順でフォールバック）
function matchIgn(ocrIgn: string, regIgn: string): boolean {
  const o = normalizeIgn(ocrIgn)
  const r = normalizeIgn(regIgn)
  if (!o || !r) return false
  if (o === r) return true
  // 短い方が長い方に含まれるか（3文字以上の場合）
  const shorter = o.length <= r.length ? o : r
  const longer  = o.length <= r.length ? r : o
  return shorter.length >= 3 && longer.includes(shorter)
}

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
  plant_x: number | null
  plant_y: number | null
  notable: boolean
  memo: string
}

const TIMING_OPTIONS = [
  { value: 'early', label: 'Early', sub: '〜25秒',  color: 'text-[#FF4655]', bg: 'bg-[#FF4655]/20 border-[#FF4655]/40' },
  { value: 'mid',   label: 'Mid',   sub: '25〜75秒', color: 'text-[#6C63FF]', bg: 'bg-[#6C63FF]/20 border-[#6C63FF]/40' },
  { value: 'late',  label: 'Late',  sub: '75秒〜',  color: 'text-[#E8B84B]', bg: 'bg-[#E8B84B]/20 border-[#E8B84B]/40' },
]

const EMPTY_ROW = (): PlayerRow => ({
  player_id: '', agent: '', kills: '', deaths: '', assists: '',
  fb: '', fd: '', acs: '', hs_pct: '',
})

const ECO_OPTIONS = ['pistol', 'second', 'third', 'eco', 'anti_eco', 'semi_eco', 'semi_buy', 'full_buy', 'oper']

// ============================================================
// Page
// ============================================================
export default function ScrimInputPage() {
  const { teamId } = useAuth()
  const { t } = useLanguage()
  const [players, setPlayers] = useState<Player[]>([])

  // Match info
  const [matchDate, setMatchDate] = useState(new Date().toISOString().slice(0, 10))
  const [map, setMap] = useState('')
  const [teamScore, setTeamScore] = useState<number | ''>('')
  const [oppScore, setOppScore]   = useState<number | ''>('')
  // 入力中の表示用文字列（onChange で更新）。onBlur / Enter で上の committed state にコミット
  const [teamScoreInput, setTeamScoreInput] = useState('')
  const [oppScoreInput,  setOppScoreInput]  = useState('')
  const [firstHalfSide, setFirstHalfSide] = useState<'attack' | 'defense' | ''>('')
  const [matchType, setMatchType] = useState('official')
  const [opponentName, setOpponentName] = useState('')

  // Player rows — 登録選手数に合わせて可変（最低5行）
  const [rows, setRows] = useState<PlayerRow[]>(Array.from({ length: 5 }, EMPTY_ROW))

  // Round detail
  const [showRounds, setShowRounds] = useState(false)
  const [rounds, setRounds] = useState<RoundRow[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [memoOpenIdx, setMemoOpenIdx] = useState<Set<number>>(new Set())
  const [mapOpenIdx,  setMapOpenIdx]  = useState<Set<number>>(new Set())
  const [otSide, setOtSide] = useState<'attack' | 'defense' | ''>('')

  // UI state
  const [ocrLoading, setOcrLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // エージェント使用頻度（DB から取得して dropdown をソート）
  const [agentUsage, setAgentUsage] = useState<Map<string, number>>(new Map())
  useEffect(() => {
    if (!teamId) return
    fetch('/api/agents/usage')
      .then(r => r.json())
      .then(j => {
        if (j.data) setAgentUsage(new Map(j.data.map((r: { agent: string; count: number }) => [r.agent, r.count])))
      })
      .catch(() => {})
  }, [teamId])

  // 使用頻度順（降順）→ 未使用は五十音順（AGENTS の定義順）
  const sortedAgents = useMemo(() => {
    const used = (AGENTS as readonly string[]).filter(a => agentUsage.has(a))
      .sort((a, b) => (agentUsage.get(b) ?? 0) - (agentUsage.get(a) ?? 0))
    const unused = (AGENTS as readonly string[]).filter(a => !agentUsage.has(a))
    return [...used, ...unused]
  }, [agentUsage])

  useEffect(() => {
    if (!teamId) return
    fetch('/api/players')
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

  // Auto-generate rounds:
  // - 前半サイド選択時点で12ラウンド表示（スコア未入力でも可）
  // - スコア入力後は合計ラウンド数で生成、既存データを保持
  useEffect(() => {
    if (!firstHalfSide) return
    const total = Number(teamScore || 0) + Number(oppScore || 0)
    const side1 = firstHalfSide
    const side2 = side1 === 'attack' ? 'defense' : 'attack'
    // R1-12: side1 / R13-24: side2 / R25+: otSide 選択から交互
    const otStart = (otSide || side1) as 'attack' | 'defense'
    const otOpp   = otStart === 'attack' ? 'defense' : 'attack'
    const getSide = (i: number): 'attack' | 'defense' => {
      if (i < 12) return side1
      if (i < 24) return side2
      return ((i - 24) % 2 === 0) ? otStart : otOpp
    }
    setRounds(prev => {
      const calculated = (total >= 2 && total <= 50) ? total : 24
      // 両スコアが入力済み → 正確な合計を使用（縮小・拡大どちらも許可）
      // 片方だけ入力中 → 入力途中で縮小してデータが消えないよう縮小禁止
      const bothSet = teamScore !== '' && oppScore !== ''
      const count = bothSet ? calculated : Math.max(prev.length, calculated)
      return Array.from({ length: count }, (_, i) => {
        const existing = prev[i]
        const side = getSide(i)
        if (existing && existing.round_number === i + 1) {
          return { ...existing, side }
        }
        return {
          round_number: i + 1,
          side,
          economy: '',
          result: '' as '',
          plant: false,
          site: '',
          retake: false,
          fb_team: '' as '',
          contact_timing: '' as '',
          plant_x: null,
          plant_y: null,
          notable: false,
          memo: '',
        }
      })
    })
    setShowRounds(true)
  }, [teamScore, oppScore, firstHalfSide, otSide])

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
      if (json.team_score != null) { setTeamScore(json.team_score); setTeamScoreInput(String(json.team_score)) }
      if (json.opponent_score != null) { setOppScore(json.opponent_score); setOppScoreInput(String(json.opponent_score)) }

      // OCRデータを登録済み選手に名前照合してスタッツだけ上書き
      const ocr: Record<string, unknown>[] = json.players ?? []

      setRows(prev => {
        const next = prev.map(row => {
          // この行に対応するプレイヤーのIGNを取得
          const regPlayer = players.find(p => p.id === row.player_id)
          if (!regPlayer) return row

          // OCRデータから名前が一致するものを探す（完全一致 → 部分一致フォールバック）
          const hit = ocr.find(op => matchIgn(String(op.ign), regPlayer.ign))
          if (!hit) return row  // 一致なし → そのまま

          // スタッツだけ上書き（player_idはそのまま）
          return {
            ...row,
            agent: hit.agent ? normalizeAgent(String(hit.agent)) : row.agent,
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
    // blur していない場合に備え、入力文字列から最終スコアを取得
    const finalTeam = teamScoreInput !== '' ? Number(teamScoreInput) : teamScore
    const finalOpp  = oppScoreInput  !== '' ? Number(oppScoreInput)  : oppScore
    if (!map || finalTeam === '' || finalOpp === '') {
      setError(t('common.error'))
      return
    }
    const finalTotalRounds = Number(finalTeam) + Number(finalOpp)
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
        rounds_played: finalTotalRounds,
      }))

    try {
      // 1. Save match + player stats
      const matchRes = await fetch('/api/ocr/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponent_name: opponentName || '未登録',
          match_date: matchDate + 'T00:00:00',
          map, match_type: matchType,
          team_score: Number(finalTeam),
          opponent_score: Number(finalOpp),
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
    setOpponentName(''); setMap('')
    setTeamScoreInput(''); setTeamScore('')
    setOppScoreInput('');  setOppScore('')
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
          {t('matchInput.title')} <span className="text-[#FF4655]">{t('matchInput.titleAccent')}</span>
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
            {t('matchInput.autoFill')}
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
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('matchInput.matchInfo')}</div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="md:col-span-1">
            <Label>{t('matchInput.matchDate')}</Label>
            <input type="date" className={cls} value={matchDate}
              onChange={e => setMatchDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>{t('matchInput.opponent')}</Label>
            <input className={cls} placeholder="Team Name" value={opponentName}
              onChange={e => setOpponentName(e.target.value)} />
          </div>
          <div>
            <Label>{t('common.map')}</Label>
            <select className={cls} value={map} onChange={e => setMap(e.target.value)}>
              <option value="">{t('common.map')}</option>
              {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>{t('matchInput.teamScore')}</Label>
            <input
              type="number" min={0} max={25} className={cls}
              value={teamScoreInput}
              onChange={e => setTeamScoreInput(e.target.value)}
              onBlur={() => setTeamScore(teamScoreInput === '' ? '' : Number(teamScoreInput))}
              onKeyDown={e => { if (e.key === 'Enter') setTeamScore(teamScoreInput === '' ? '' : Number(teamScoreInput)) }}
            />
          </div>
          <div>
            <Label>{t('matchInput.opponentScore')}</Label>
            <input
              type="number" min={0} max={25} className={cls}
              value={oppScoreInput}
              onChange={e => setOppScoreInput(e.target.value)}
              onBlur={() => setOppScore(oppScoreInput === '' ? '' : Number(oppScoreInput))}
              onKeyDown={e => { if (e.key === 'Enter') setOppScore(oppScoreInput === '' ? '' : Number(oppScoreInput)) }}
            />
          </div>
          <div>
            <Label>{t('matchInput.firstHalfSide')}</Label>
            <select className={cls} value={firstHalfSide}
              onChange={e => setFirstHalfSide(e.target.value as 'attack' | 'defense' | '')}>
              <option value="">{t('common.all')}</option>
              <option value="attack">ATK</option>
              <option value="defense">DEF</option>
            </select>
          </div>
          <div>
            <Label>{t('matchInput.matchType')}</Label>
            <select className={cls} value={matchType} onChange={e => setMatchType(e.target.value)}>
              <option value="official">Competitive</option>
              <option value="practice">Practice</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>{t('matchInput.totalRounds')}</Label>
            <div className={cn(cls, 'bg-muted/10 text-muted-foreground cursor-default')}>
              {totalRounds > 0 ? `${totalRounds} R` : t('matchInput.autoCalc')}
            </div>
          </div>
        </div>
      </div>

      {/* ── Player Stats Table ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('matchInput.playerStats')}</div>
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
              <tr className="border-b border-border bg-muted/10 align-middle">
                <th className="text-left   align-middle px-4 py-2.5 text-xs text-muted-foreground font-medium w-8">#</th>
                <th className="text-left   align-middle px-3 py-2.5 text-xs text-muted-foreground font-medium w-36">{t('players.ign')}</th>
                <th className="text-left   align-middle px-3 py-2.5 text-xs text-muted-foreground font-medium w-40">{t('common.agent')}</th>
                {['K','D','A','FB','FD','ACS'].map(h => (
                  <th key={h} className="text-center align-middle px-2 py-2.5 text-xs text-muted-foreground font-medium w-16">{h}</th>
                ))}
                <th className="text-center align-middle px-2 py-2.5 text-xs text-muted-foreground font-medium w-14">KPR</th>
                <th className="text-center align-middle px-2 py-2.5 text-xs text-muted-foreground font-medium w-14">DPR</th>
                <th className="text-center align-middle px-2 py-2.5 text-xs text-muted-foreground font-medium w-14">APR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors align-middle">
                  <td className="align-middle px-4 py-2 text-xs text-muted-foreground">{i + 1}</td>

                  {/* Player select */}
                  <td className="align-middle px-3 py-2">
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
                  <td className="align-middle px-3 py-2">
                    <select
                      className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs text-white focus:border-[#FF4655] outline-none w-36"
                      value={row.agent}
                      onChange={e => updateRow(i, 'agent', e.target.value)}
                    >
                      <option value="">{t('matchInput.agentSelect')}</option>
                      {sortedAgents.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </td>

                  {/* Numeric stats */}
                  {(['kills','deaths','assists','fb','fd','acs'] as const).map(key => (
                    <td key={key} className="align-middle px-2 py-2">
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
                  <td className="align-middle px-2 py-2 text-center text-xs text-muted-foreground">
                    {calcRate(row.kills, totalRounds)}
                  </td>
                  <td className="align-middle px-2 py-2 text-center text-xs text-muted-foreground">
                    {calcRate(row.deaths, totalRounds)}
                  </td>
                  <td className="align-middle px-2 py-2 text-center text-xs text-muted-foreground">
                    {calcRate(row.assists, totalRounds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Video URL ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <Label>動画リンク <span className="text-muted-foreground font-normal">任意</span></Label>
        <input className={cls} placeholder="YouTube・Google Drive などのURLを入力"
          value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
      </div>

      {/* ── Round Detail (Collapsible) ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowRounds(v => !v)}
          className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('matchInput.roundDetail')}
            </span>
            <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">{t('matchInput.optional')}</span>
            {rounds.filter(r => r.result !== '').length > 0 && (
              <span className="text-xs text-[#00D4A0]">
                {rounds.filter(r => r.result !== '').length}R {t('matchInput.roundsEntered')}
              </span>
            )}
          </div>
          {showRounds ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showRounds && (
          <div className="border-t border-border p-4 space-y-3">
            {rounds.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                {t('matchInput.generateRounds')}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/20 border-b border-border">
                      {['#', t('matchInput.side'), t('matchInput.economy'), t('common.result'), t('matchInput.plant'), t('matchInput.site'), t('matchInput.retake'), t('matchInput.fb'), t('matchInput.timing'), t('matchInput.notable'), 'メモ'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((r, i) => (
                      <React.Fragment key={i}>
                      {/* OT セパレーター */}
                      {i === 24 && (
                        <tr className="border-b border-[#FFD700]/30 bg-[#FFD700]/5">
                          <td colSpan={11} className="px-3 py-2">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-[#FFD700] uppercase tracking-wider">OT R25〜</span>
                              <span className="text-[10px] text-muted-foreground">
                                {otSide ? '' : '開始サイドを選択:'}
                              </span>
                              {(['attack', 'defense'] as const).map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setOtSide(prev => prev === s ? '' : s)}
                                  className={cn(
                                    'px-3 py-0.5 rounded text-[10px] font-bold border transition-colors',
                                    otSide === s
                                      ? s === 'attack'
                                        ? 'bg-[#FF8C42]/20 border-[#FF8C42]/50 text-[#FF8C42]'
                                        : 'bg-[#00D4A0]/20 border-[#00D4A0]/50 text-[#00D4A0]'
                                      : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground'
                                  )}
                                >
                                  {s === 'attack' ? 'ATK' : 'DEF'}
                                </button>
                              ))}
                              {otSide && (
                                <span className="text-[10px] text-muted-foreground">
                                  から交互
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className={cn(
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
                            {ECO_OPTIONS.map(o => <option key={o} value={o}>{t(`eco.${o}`)}</option>)}
                          </select>
                        </td>
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
                        <td className="px-3 py-1.5">
                          {/* ATK: plant enabled / DEF: plant disabled */}
                          <div className="flex items-center gap-1.5">
                            <input type="checkbox" className="accent-[#FF4655]"
                              checked={r.plant}
                              disabled={r.side !== 'attack'}
                              onChange={e => {
                                updateRound(i, 'plant', e.target.checked)
                                if (!e.target.checked) {
                                  updateRound(i, 'site', '')
                                  setMapOpenIdx(prev => { const n = new Set(prev); n.delete(i); return n })
                                } else {
                                  setMapOpenIdx(prev => new Set([...prev, i]))
                                }
                              }} />
                            {r.plant && r.side === 'attack' && (
                              <button
                                type="button"
                                title={mapOpenIdx.has(i) ? 'マップを閉じる' : 'プラント位置を設定'}
                                onClick={() => setMapOpenIdx(prev => {
                                  const n = new Set(prev)
                                  n.has(i) ? n.delete(i) : n.add(i)
                                  return n
                                })}
                                className={cn('p-0.5 rounded transition-colors',
                                  r.plant_x !== null ? 'text-[#00D4A0]' : mapOpenIdx.has(i) ? 'text-[#6C63FF]' : 'text-muted-foreground hover:text-white'
                                )}
                              >
                                <MapPin className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <div className="flex gap-1">
                            {['A','B','C'].map(s => (
                              <button key={s} type="button"
                                onClick={() => updateRound(i, 'site', r.site === s ? '' : s)}
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors',
                                  r.site === s
                                    ? 'bg-[#6C63FF]/20 border-[#6C63FF]/40 text-[#6C63FF]'
                                    : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground'
                                )}
                              >{s}</button>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          {/* ATK: retake disabled / DEF: retake enabled */}
                          <input type="checkbox" className="accent-[#6C63FF]"
                            checked={r.retake}
                            disabled={r.side !== 'defense'}
                            onChange={e => {
                              updateRound(i, 'retake', e.target.checked)
                            }} />
                        </td>
                        <td className="px-2 py-1">
                          <div className="flex gap-1">
                            {[
                              { value: 'us',   label: '味方', color: 'text-[#00D4A0]', bg: 'bg-[#00D4A0]/20 border-[#00D4A0]/40' },
                              { value: 'them', label: '相手', color: 'text-[#FF4655]', bg: 'bg-[#FF4655]/20 border-[#FF4655]/40' },
                            ].map(opt => {
                              const cur = r.fb_team === '' ? '' : r.fb_team ? 'us' : 'them'
                              return (
                                <button key={opt.value} type="button"
                                  onClick={() => updateRound(i, 'fb_team',
                                    cur === opt.value ? '' : opt.value === 'us')}
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
                        {/* 注目ラウンドフラグ */}
                        <td className="px-2 py-1">
                          <button
                            type="button"
                            onClick={() => updateRound(i, 'notable', !r.notable)}
                            className={cn(
                              'p-1 rounded transition-colors',
                              r.notable
                                ? 'text-[#FF4655] bg-[#FF4655]/10'
                                : 'text-muted-foreground hover:text-white'
                            )}
                          >
                            <Flag className="w-3.5 h-3.5" fill={r.notable ? 'currentColor' : 'none'} />
                          </button>
                        </td>
                        {/* メモボタン */}
                        <td className="px-2 py-1">
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
                      </tr>
                      {/* メモ展開行 */}
                      {memoOpenIdx.has(i) && (
                        <tr className="border-b border-border">
                          <td colSpan={12} className="px-3 py-2 bg-[#3498DB]/5">
                            <div className="flex items-start gap-2">
                              <Bookmark className="w-3.5 h-3.5 text-[#3498DB] mt-1.5 flex-shrink-0" fill={r.memo ? 'currentColor' : 'none'} />
                              <textarea
                                rows={2}
                                autoFocus
                                value={r.memo}
                                onChange={e => updateRound(i, 'memo', e.target.value)}
                                placeholder={`R${r.round_number} のメモ（気づき・改善点）`}
                                className="flex-1 bg-muted/30 border border-[#3498DB]/30 rounded px-2.5 py-1.5 text-xs text-white placeholder-muted-foreground/50 focus:border-[#3498DB] outline-none resize-none"
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* 展開マップ行 — ATK+プラントチェック+mapOpenIdx */}
                      {r.plant && r.side === 'attack' && mapOpenIdx.has(i) && (
                        <tr className="border-b border-border">
                          <td colSpan={12} className="px-3 py-3 bg-muted/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> R{r.round_number} プラント位置
                              </span>
                              <button
                                type="button"
                                onClick={() => setMapOpenIdx(prev => { const n = new Set(prev); n.delete(i); return n })}
                                className="text-muted-foreground hover:text-white transition-colors"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                            </div>
                            <InlineMapPin
                              mapName={map}
                              x={r.plant_x}
                              y={r.plant_y}
                              roundNumber={r.round_number}
                              onPinSet={(x, y, site) => {
                                updateRound(i, 'plant_x', x)
                                updateRound(i, 'plant_y', y)
                                if (site) updateRound(i, 'site', site)
                              }}
                            />
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
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
          {t('matchInput.reset')}
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
            ? <><Check className="w-4 h-4" />{t('matchInput.saved')}</>
            : saving
            ? <><Loader2 className="w-4 h-4 animate-spin" />{t('common.saving')}</>
            : <><Save className="w-4 h-4" />{t('matchInput.saveAll')}</>
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

function InlineMapPin({ mapName, x, y, roundNumber, onPinSet }: {
  mapName: string
  x: number | null
  y: number | null
  roundNumber: number
  onPinSet: (x: number, y: number, site: string | null) => void
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [imgError, setImgError] = useState(false)
  const [hoverScreen, setHoverScreen] = useState<{ x: number; y: number } | null>(null)

  const mapKey   = normalizeMapKey(mapName)
  const imageUrl = MAP_IMAGES[mapKey] ? `/api/map-image?key=${mapKey}` : null
  const polygons = MAP_POLYGONS[mapKey] ?? {}
  const rotation = MAP_ROTATION[mapKey] ?? 0

  // 画面座標 → マップ座標（クリック時に使用）
  function screenToMap(sx: number, sy: number) {
    if (!rotation) return { x: sx, y: sy }
    const θ = rotation * Math.PI / 180
    const cx = sx - 0.5, cy = sy - 0.5
    return {
      x: Math.min(1, Math.max(0, cx * Math.cos(θ) + cy * Math.sin(θ) + 0.5)),
      y: Math.min(1, Math.max(0, -cx * Math.sin(θ) + cy * Math.cos(θ) + 0.5)),
    }
  }

  // マップ座標 → 画面座標（ピン表示用: 回転の逆変換）
  function toScreenPos(mx: number, my: number) {
    if (!rotation) return { x: mx, y: my }
    const θ = rotation * Math.PI / 180
    const cx = mx - 0.5, cy = my - 0.5
    return {
      x: cx * Math.cos(θ) - cy * Math.sin(θ) + 0.5,
      y: cx * Math.sin(θ) + cy * Math.cos(θ) + 0.5,
    }
  }

  function getScreenCoords(e: React.MouseEvent<HTMLDivElement>) {
    const rect = outerRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    }
  }

  const pinScreen = x !== null && y !== null ? toScreenPos(x, y) : null

  return (
    <div className="flex items-start gap-4">
      <div
        ref={outerRef}
        onClick={e => {
          const sc = getScreenCoords(e)
          if (!sc) return
          const mp = screenToMap(sc.x, sc.y)
          onPinSet(mp.x, mp.y, detectSite(mp.x, mp.y, polygons))
        }}
        onMouseMove={e => setHoverScreen(getScreenCoords(e))}
        onMouseLeave={() => setHoverScreen(null)}
        className="relative rounded-xl overflow-hidden border border-[#FF4655]/50 cursor-crosshair flex-shrink-0 bg-muted"
        style={{ width: 320, height: 320 }}
      >
        {/* 回転 div: 画像のみ */}
        <div
          className="absolute inset-0"
          style={rotation ? { transform: `rotate(${rotation}deg)`, transformOrigin: 'center center' } : undefined}
        >
          {imageUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={mapName}
              className="w-full h-full object-cover select-none"
              draggable={false}
              onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">{mapName || 'マップ未選択'}</span>
            </div>
          )}
        </div>

        {/* SVG は回転 div の外 — ピンと十字線が回転しない */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {hoverScreen && (
            <circle cx={`${hoverScreen.x * 100}%`} cy={`${hoverScreen.y * 100}%`}
              r={3} fill="#FF4655" fillOpacity={0.9} stroke="white" strokeWidth={0.8} />
          )}
          {pinScreen && (
            <g>
              <circle cx={`${pinScreen.x * 100}%`} cy={`${pinScreen.y * 100}%`} r={7}
                fill="#FF4655" fillOpacity={0.95} stroke="white" strokeWidth={1.5} />
              <text x={`${pinScreen.x * 100}%`} y={`${pinScreen.y * 100}%`} dy="0.35em"
                textAnchor="middle" fill="white" fontSize={7} fontWeight="bold"
                style={{ userSelect: 'none' }}>
                {roundNumber}
              </text>
            </g>
          )}
        </svg>

        <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-center pointer-events-none">
          <span className="text-[10px] text-white">クリックしてプラント位置を設定</span>
        </div>
      </div>
      <div className="text-xs space-y-1.5 pt-1 min-w-[80px]">
        <p className="text-white font-semibold">R{roundNumber} プラント位置</p>
        {x !== null && y !== null ? (
          <p className="text-[#00D4A0] font-medium">✓ 設定済み</p>
        ) : (
          <p className="text-muted-foreground/60">未設定</p>
        )}
      </div>
    </div>
  )
}
