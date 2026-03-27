'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Upload, X, Check, Loader2, AlertCircle, UserCheck, UserX, Play, Link2, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MAPS } from '@/types'

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? 'YOUR_TEAM_UUID'

// ============================================================
// Types
// ============================================================

interface OcrPlayer {
  ign: string; agent: string; kills: number; deaths: number; assists: number
  acs: number; adr: number; hs_pct: number; first_bloods: number; first_deaths: number; team: string
}
interface RegisteredPlayer { id: string; ign: string; role: string }
interface Match { id: string; opponent_name: string; match_date: string; map: string; match_type: string; team_score: number; opponent_score: number; result: string; attack_rounds_won: number; attack_rounds_played: number; defense_rounds_won: number; defense_rounds_played: number; video_url: string | null }

// ============================================================
// Helpers
// ============================================================

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
  } catch { /* ignore */ }
  return null
}
function getEmbedUrl(url: string): string | null {
  const ytId = getYouTubeId(url)
  if (ytId) return `https://www.youtube.com/embed/${ytId}`
  if (url.startsWith('http')) return url
  return null
}

// ============================================================
// Page
// ============================================================

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
  const [editVodId, setEditVodId] = useState<string | null>(null)
  const [vodInput, setVodInput] = useState('')
  const [vodSaving, setVodSaving] = useState(false)
  const [editDateId, setEditDateId] = useState<string | null>(null)
  const [dateInput, setDateInput] = useState('')
  const [dateSaving, setDateSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const vodInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/matches?team_id=${TEAM_ID}`)
      .then(r => r.json())
      .then(json => { setMatches(json.data ?? []); setLoading(false) })
  }, [])

  useEffect(() => {
    if (editVodId) vodInputRef.current?.focus()
  }, [editVodId])

  function openVodEdit(m: Match, e: React.MouseEvent) {
    e.preventDefault()
    setActiveVideoId(null)
    setEditVodId(m.id)
    setVodInput(m.video_url ?? '')
  }

  function openDateEdit(m: Match, e: React.MouseEvent) {
    e.preventDefault()
    setEditDateId(m.id)
    setDateInput(String(m.match_date ?? '').slice(0, 10))
  }

  async function saveDate(matchId: string) {
    setDateSaving(true)
    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_date: dateInput }),
    })
    if (res.ok) {
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, match_date: dateInput } : m))
    }
    setEditDateId(null)
    setDateSaving(false)
  }

  function openVideo(m: Match, e: React.MouseEvent) {
    e.preventDefault()
    setEditVodId(null)
    setActiveVideoId(prev => prev === m.id ? null : m.id)
  }

  async function deleteMatch(matchId: string) {
    setDeletingId(matchId)
    try {
      const res = await fetch(`/api/matches/${matchId}`, { method: 'DELETE' })
      if (res.ok) {
        setMatches(prev => prev.filter(m => m.id !== matchId))
        if (activeVideoId === matchId) setActiveVideoId(null)
      }
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  async function saveVodUrl(matchId: string) {
    setVodSaving(true)
    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: vodInput || null }),
    })
    if (res.ok) {
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, video_url: vodInput || null } : m))
      if (activeVideoId === matchId && !vodInput) setActiveVideoId(null)
    }
    setEditVodId(null)
    setVodSaving(false)
  }

  const activeMatch = matches.find(m => m.id === activeVideoId)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">マッチ</h1>
          <p className="text-muted-foreground text-sm mt-1">試合履歴・詳細分析</p>
        </div>
      </div>

      {/* Inline video player */}
      {activeMatch?.video_url && (() => {
        const embed = getEmbedUrl(activeMatch.video_url)
        return (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div>
                <div className="text-sm font-semibold text-white">
                  {activeMatch.map} vs {activeMatch.opponent_name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(activeMatch.match_date).toLocaleDateString('ja-JP')}
                </div>
              </div>
              <button onClick={() => setActiveVideoId(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {embed ? (
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe src={embed} className="absolute inset-0 w-full h-full"
                  allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground text-sm">
                埋め込み非対応のURLです。
                <a href={activeMatch.video_url} target="_blank" rel="noopener noreferrer"
                  className="text-[#FF4655] hover:underline ml-1">外部で開く →</a>
              </div>
            )}
          </div>
        )
      })()}

      {/* Match list */}
      {loading ? (
        <div className="text-muted-foreground text-sm p-8 text-center">読み込み中...</div>
      ) : matches.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          <MatchTableHeader />
          {matches.map(m => (
            <MatchItem
              key={m.id}
              match={m}
              isVideoActive={activeVideoId === m.id}
              isVodEdit={editVodId === m.id}
              vodInput={vodInput}
              vodSaving={vodSaving}
              vodInputRef={editVodId === m.id ? vodInputRef : undefined}
              onOpenVideo={openVideo}
              onOpenVodEdit={openVodEdit}
              onVodInputChange={setVodInput}
              onVodSave={() => saveVodUrl(m.id)}
              onVodCancel={() => setEditVodId(null)}
              isDateEdit={editDateId === m.id}
              dateInput={dateInput}
              dateSaving={dateSaving}
              onOpenDateEdit={openDateEdit}
              onDateInputChange={setDateInput}
              onDateSave={() => saveDate(m.id)}
              onDateCancel={() => setEditDateId(null)}
              isConfirmDelete={confirmDeleteId === m.id}
              isDeleting={deletingId === m.id}
              onDeleteRequest={() => setConfirmDeleteId(m.id)}
              onDeleteConfirm={() => deleteMatch(m.id)}
              onDeleteCancel={() => setConfirmDeleteId(null)}
            />
          ))}
        </div>
      )}

    </div>
  )
}

// ============================================================
// MatchTableHeader / MatchItem
// ============================================================

function MatchTableHeader() {
  return (
    <div className="grid grid-cols-8 text-[10px] text-muted-foreground uppercase tracking-wider px-4 py-2">
      <div className="col-span-2">対戦</div>
      <div>マップ</div>
      <div className="text-center">スコア</div>
      <div className="text-center">ATK%</div>
      <div className="text-center">DEF%</div>
      <div className="text-right">日付</div>
      <div className="text-right">VOD</div>
    </div>
  )
}

function MatchItem({
  match: m, isVideoActive, isVodEdit, vodInput, vodSaving, vodInputRef,
  isDateEdit, dateInput, dateSaving,
  isConfirmDelete, isDeleting,
  onOpenVideo, onOpenVodEdit, onVodInputChange, onVodSave, onVodCancel,
  onOpenDateEdit, onDateInputChange, onDateSave, onDateCancel,
  onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}: {
  match: Match
  isVideoActive: boolean
  isVodEdit: boolean
  vodInput: string
  vodSaving: boolean
  vodInputRef?: React.RefObject<HTMLInputElement | null>
  isDateEdit: boolean
  dateInput: string
  dateSaving: boolean
  isConfirmDelete: boolean
  isDeleting: boolean
  onOpenVideo: (m: Match, e: React.MouseEvent) => void
  onOpenVodEdit: (m: Match, e: React.MouseEvent) => void
  onVodInputChange: (v: string) => void
  onVodSave: () => void
  onVodCancel: () => void
  onOpenDateEdit: (m: Match, e: React.MouseEvent) => void
  onDateInputChange: (v: string) => void
  onDateSave: () => void
  onDateCancel: () => void
  onDeleteRequest: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
}) {
  const isWin = m.result === 'win'
  const isLoss = m.result === 'loss'
  const atkPct = m.attack_rounds_played > 0
    ? Math.round((m.attack_rounds_won / m.attack_rounds_played) * 100) : null
  const defPct = m.defense_rounds_played > 0
    ? Math.round((m.defense_rounds_won / m.defense_rounds_played) * 100) : null

  return (
    <div className={cn(
      'bg-card rounded-xl border transition-all',
      isVideoActive ? 'border-[#FF4655]/40' : 'border-border'
    )}>
      {/* Main row */}
      <div className="grid grid-cols-8 items-center px-4 py-3">
        {/* Match info — Link only on the left part */}
        <Link href={`/matches/${m.id}`}
          className="col-span-2 flex items-center gap-3 group">
          <div className={cn('w-2 h-2 rounded-full flex-shrink-0',
            isWin ? 'bg-[#00D4A0]' : isLoss ? 'bg-[#FF4655]' : 'bg-muted-foreground')} />
          <div>
            <div className="text-sm font-semibold text-white group-hover:text-[#FF4655] transition-colors">
              vs {m.opponent_name}
            </div>
            <div className="text-xs text-muted-foreground capitalize">{m.match_type}</div>
          </div>
        </Link>

        <Link href={`/matches/${m.id}`} className="text-sm text-muted-foreground hover:text-white transition-colors">
          {m.map}
        </Link>

        <Link href={`/matches/${m.id}`} className="text-center">
          <span className={isWin ? 'text-[#00D4A0] font-bold' : 'text-[#FF4655] font-bold'}>{m.team_score}</span>
          <span className="text-muted-foreground mx-1">:</span>
          <span className="text-white">{m.opponent_score}</span>
        </Link>

        <div className={cn('text-center text-xs font-semibold',
          atkPct === null ? 'text-muted-foreground' : atkPct >= 50 ? 'text-[#00D4A0]' : 'text-[#FF4655]')}>
          {atkPct !== null ? `${atkPct}%` : '--'}
        </div>
        <div className={cn('text-center text-xs font-semibold',
          defPct === null ? 'text-muted-foreground' : defPct >= 50 ? 'text-[#00D4A0]' : 'text-[#FF4655]')}>
          {defPct !== null ? `${defPct}%` : '--'}
        </div>

        <div className="flex items-center justify-end gap-1">
          <span className="text-xs text-muted-foreground">
            {new Date(m.match_date).toLocaleDateString('ja-JP')}
          </span>
          <button onClick={e => onOpenDateEdit(m, e)}
            className="p-1 rounded text-muted-foreground hover:text-white transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
        </div>

        {/* VOD column */}
        <div className="flex items-center justify-end gap-1.5">
          {m.video_url ? (
            <>
              <button onClick={e => onOpenVideo(m, e)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isVideoActive
                    ? 'bg-[#FF4655] text-white'
                    : 'bg-[#FF4655]/10 text-[#FF4655] hover:bg-[#FF4655]/20'
                )}>
                <Play className="w-3 h-3" />
                {isVideoActive ? '閉じる' : '再生'}
              </button>
              <button onClick={e => onOpenVodEdit(m, e)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white border border-border hover:border-white/30 transition-colors">
                <Pencil className="w-3 h-3" />
              </button>
            </>
          ) : (
            <button onClick={e => onOpenVodEdit(m, e)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white border border-border hover:border-white/30 transition-colors">
              <Link2 className="w-3 h-3" /> VOD
            </button>
          )}
          {/* Delete */}
          {isConfirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={onDeleteConfirm} disabled={isDeleting}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs bg-[#FF4655] text-white hover:bg-[#e03e4d] transition-colors disabled:opacity-50">
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : '削除'}
              </button>
              <button onClick={onDeleteCancel}
                className="px-2 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-white transition-colors">
                戻す
              </button>
            </div>
          ) : (
            <button onClick={onDeleteRequest}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-[#FF4655] border border-transparent hover:border-[#FF4655]/30 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* VOD URL input (inline) */}
      {isVodEdit && (
        <div className="px-4 pb-3 flex items-center gap-2 border-t border-border/50 pt-3">
          <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            ref={vodInputRef}
            type="url"
            value={vodInput}
            onChange={e => onVodInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onVodSave(); if (e.key === 'Escape') onVodCancel() }}
            placeholder="YouTube URL または動画URLを入力..."
            className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-muted-foreground focus:border-[#FF4655] outline-none"
          />
          <button onClick={onVodSave} disabled={vodSaving}
            className="px-3 py-1.5 rounded-lg bg-[#FF4655] text-white text-xs font-medium hover:bg-[#FF4655]/80 disabled:opacity-50 transition-colors">
            {vodSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : '保存'}
          </button>
          <button onClick={onVodCancel}
            className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-white transition-colors">
            キャンセル
          </button>
        </div>
      )}

      {/* Date edit (inline) */}
      {isDateEdit && (
        <div className="px-4 pb-3 flex items-center gap-2 border-t border-border/50 pt-3">
          <input
            type="date"
            value={dateInput}
            onChange={e => onDateInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onDateSave(); if (e.key === 'Escape') onDateCancel() }}
            className="bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#FF4655] outline-none"
          />
          <button onClick={onDateSave} disabled={dateSaving}
            className="px-3 py-1.5 rounded-lg bg-[#FF4655] text-white text-xs font-medium hover:bg-[#FF4655]/80 disabled:opacity-50 transition-colors">
            {dateSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : '保存'}
          </button>
          <button onClick={onDateCancel}
            className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-white transition-colors">
            キャンセル
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// OCR Wizard Modal
// ============================================================

type Step = 'upload' | 'review'

interface MatchForm {
  opponent_name: string; map: string; match_type: string; match_date: string
  team_score: number; opponent_score: number
  attack_rounds_won: number; attack_rounds_played: number
  defense_rounds_won: number; defense_rounds_played: number
}

function OcrWizardModal({ teamId, onClose, onSaved }: {
  teamId: string; onClose: () => void; onSaved: (m: Record<string, unknown>) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [preview, setPreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matchForm, setMatchForm] = useState<MatchForm>({
    opponent_name: '', map: 'Ascent', match_type: 'scrim',
    match_date: new Date().toISOString().slice(0, 16),
    team_score: 0, opponent_score: 0,
    attack_rounds_won: 0, attack_rounds_played: 0,
    defense_rounds_won: 0, defense_rounds_played: 0,
  })
  const [ocrPlayers, setOcrPlayers] = useState<OcrPlayer[]>([])
  const [regPlayers, setRegPlayers] = useState<RegisteredPlayer[]>([])
  const [playerMapping, setPlayerMapping] = useState<Record<number, string | null>>({})

  async function fetchRegisteredPlayers() {
    const res = await fetch(`/api/players?team_id=${teamId}`)
    const json = await res.json()
    return (json.data ?? []) as RegisteredPlayer[]
  }

  function autoMatch(ocr: OcrPlayer[], registered: RegisteredPlayer[]): Record<number, string | null> {
    const mapping: Record<number, string | null> = {}
    ocr.forEach((op, i) => {
      const hit = registered.find(r => r.ign.toLowerCase() === op.ign.toLowerCase())
      mapping[i] = hit?.id ?? null
    })
    return mapping
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setError(null)
    setOcrLoading(true)
    const fd = new FormData()
    fd.append('image', file)
    fd.append('map', matchForm.map)
    try {
      const res = await fetch('/api/ocr', { method: 'POST', body: fd })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'OCR失敗')
      setImageUrl(json.image_url ?? null)
      setMatchForm(f => ({
        ...f,
        map: json.map && json.map !== 'unknown' ? json.map : f.map,
        team_score: json.team_score ?? 0,
        opponent_score: json.opponent_score ?? 0,
      }))
      setOcrPlayers(json.players ?? [])
      const reg = await fetchRegisteredPlayers()
      setRegPlayers(reg)
      setPlayerMapping(autoMatch(json.players ?? [], reg))
      setStep('review')
    } catch (e) {
      setError(String(e))
    } finally {
      setOcrLoading(false)
    }
  }

  async function handleSave() {
    setSaveLoading(true)
    setError(null)
    try {
      const totalRounds = matchForm.team_score + matchForm.opponent_score
      const playersPayload = ocrPlayers.map((p, i) => ({
        player_id: playerMapping[i] ?? null, ign: p.ign, agent: p.agent,
        kills: p.kills, deaths: p.deaths, assists: p.assists, acs: p.acs,
        adr: p.adr ?? 0, hs_pct: p.hs_pct ?? 0,
        first_bloods: p.first_bloods ?? 0, first_deaths: p.first_deaths ?? 0,
        rounds_played: totalRounds,
      }))
      const res = await fetch('/api/ocr/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, ...matchForm, scoreboard_image_url: imageUrl, players: playersPayload }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '保存失敗')
      onSaved(json.data.match)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaveLoading(false)
    }
  }

  const mappedCount = Object.values(playerMapping).filter(v => v !== null).length

  return (
    <Modal title={step === 'upload' ? 'スコアボードOCR — Step 1/2' : 'スコアボードOCR — Step 2/2'} onClose={onClose} wide>
      <div className="flex items-center gap-2 mb-6">
        <StepDot active={step === 'upload'} done={step === 'review'} label="OCR解析" />
        <div className="flex-1 h-px bg-border" />
        <StepDot active={step === 'review'} done={false} label="確認・保存" />
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          <div onClick={() => !ocrLoading && fileRef.current?.click()}
            className={cn('border-2 border-dashed rounded-xl p-8 text-center transition-colors',
              ocrLoading ? 'border-border cursor-default' : 'border-border cursor-pointer hover:border-[#FF4655]/50')}>
            {preview
              ? <img src={preview} alt="preview" className="max-h-52 mx-auto rounded-lg" />
              : <div className="space-y-2">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-white font-medium">スコアボード画像をアップロード</p>
                  <p className="text-xs text-muted-foreground">クリックまたはドラッグ&ドロップ（PNG / JPG）</p>
                </div>
            }
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
          {ocrLoading && (
            <div className="flex items-center justify-center gap-3 py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[#FF4655]" />
              <div>
                <p className="text-sm text-white font-medium">Claude Vision で解析中...</p>
                <p className="text-xs text-muted-foreground mt-0.5">スコアボードからデータを抽出しています</p>
              </div>
            </div>
          )}
          {error && <ErrorBanner message={error} />}
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-5">
          <div className="bg-muted/20 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">試合情報</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="相手チーム名 *">
                <input className={inputCls} value={matchForm.opponent_name}
                  onChange={e => setMatchForm(f => ({ ...f, opponent_name: e.target.value }))} placeholder="Team Name" />
              </Field>
              <Field label="マップ">
                <select className={inputCls} value={matchForm.map}
                  onChange={e => setMatchForm(f => ({ ...f, map: e.target.value }))}>
                  {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="種別">
                <select className={inputCls} value={matchForm.match_type}
                  onChange={e => setMatchForm(f => ({ ...f, match_type: e.target.value }))}>
                  <option value="scrim">スクリム</option>
                  <option value="official">公式</option>
                  <option value="practice">練習</option>
                </select>
              </Field>
              <Field label="日時">
                <input type="datetime-local" className={inputCls} value={matchForm.match_date}
                  onChange={e => setMatchForm(f => ({ ...f, match_date: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Field label="自チーム点">
                <input type="number" min={0} max={25} className={inputCls} value={matchForm.team_score}
                  onChange={e => setMatchForm(f => ({ ...f, team_score: Number(e.target.value) }))} />
              </Field>
              <Field label="相手点">
                <input type="number" min={0} max={25} className={inputCls} value={matchForm.opponent_score}
                  onChange={e => setMatchForm(f => ({ ...f, opponent_score: Number(e.target.value) }))} />
              </Field>
              <Field label="ATK勝">
                <input type="number" min={0} max={25} className={inputCls} value={matchForm.attack_rounds_won}
                  onChange={e => setMatchForm(f => ({ ...f, attack_rounds_won: Number(e.target.value) }))} />
              </Field>
              <Field label="ATK計">
                <input type="number" min={0} max={25} className={inputCls} value={matchForm.attack_rounds_played}
                  onChange={e => setMatchForm(f => ({ ...f, attack_rounds_played: Number(e.target.value) }))} />
              </Field>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">プレイヤーデータ</div>
              <div className="text-xs text-muted-foreground">
                <span className="text-[#00D4A0] font-semibold">{mappedCount}</span> / {ocrPlayers.length} 人紐付け済み
              </div>
            </div>
            <div className="bg-[#6C63FF]/10 border border-[#6C63FF]/20 rounded-lg p-3 flex gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-[#6C63FF] flex-shrink-0 mt-0.5" />
              <p className="text-muted-foreground">「プレイヤー選択」でOCRのIGNと登録済み選手を紐付けてください。紐付けた選手のスタッツのみDBに保存されます。</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {['OCR IGN', '紐付け先', 'Agent', 'K', 'D', 'A', 'ACS', 'HS%', 'FB', 'FD'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ocrPlayers.map((p, i) => {
                    const mapped = playerMapping[i] ?? null
                    const mappedName = regPlayers.find(r => r.id === mapped)?.ign
                    return (
                      <tr key={i} className={cn('border-b border-border last:border-0 transition-colors', mapped ? 'bg-[#00D4A0]/5' : '')}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {mapped ? <UserCheck className="w-3 h-3 text-[#00D4A0]" /> : <UserX className="w-3 h-3 text-muted-foreground" />}
                            <span className="text-white font-medium">{p.ign}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <select className="bg-muted border border-border rounded px-2 py-1 text-xs text-white focus:border-[#FF4655] outline-none w-28"
                            value={mapped ?? ''}
                            onChange={e => setPlayerMapping(prev => ({ ...prev, [i]: e.target.value || null }))}>
                            <option value="">-- スキップ --</option>
                            {regPlayers.map(r => <option key={r.id} value={r.id}>{r.ign}</option>)}
                          </select>
                          {mappedName && <div className="text-[10px] text-[#00D4A0] mt-0.5">→ {mappedName}</div>}
                        </td>
                        {(['agent','kills','deaths','assists','acs','hs_pct','first_bloods','first_deaths'] as const).map(key => (
                          <td key={key} className="px-2 py-1.5">
                            <input type={key === 'agent' ? 'text' : 'number'} min={0}
                              className="w-full bg-muted border border-transparent hover:border-border focus:border-[#FF4655] rounded px-1.5 py-1 text-xs text-white outline-none text-center transition-colors"
                              value={(p as unknown as Record<string, unknown>)[key] as string ?? ''}
                              onChange={e => {
                                const val = key === 'agent' ? e.target.value : Number(e.target.value)
                                setOcrPlayers(prev => prev.map((op, idx) => idx === i ? { ...op, [key]: val } : op))
                              }} />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => { setStep('upload'); setError(null) }}
              className="text-sm text-muted-foreground hover:text-white transition-colors">
              ← 画像を撮り直す
            </button>
            <button onClick={handleSave} disabled={saveLoading || !matchForm.opponent_name}
              className={cn('flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
                saveLoading || !matchForm.opponent_name ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-[#FF4655] hover:bg-[#e03e4d] text-white')}>
              {saveLoading ? <><Loader2 className="w-4 h-4 animate-spin" />保存中...</> : <><Check className="w-4 h-4" />試合とスタッツを保存（{mappedCount}人）</>}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ============================================================
// AddMatchModal
// ============================================================

function AddMatchModal({ teamId, onClose, onAdded }: {
  teamId: string; onClose: () => void; onAdded: (m: Record<string, unknown>) => void
}) {
  const [form, setForm] = useState({
    opponent_name: '', map: 'Ascent', match_type: 'scrim',
    match_date: new Date().toISOString().slice(0, 16),
    team_score: '', opponent_score: '',
    attack_rounds_won: '', attack_rounds_played: '',
    defense_rounds_won: '', defense_rounds_played: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/matches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId, ...form,
          team_score: Number(form.team_score), opponent_score: Number(form.opponent_score),
          attack_rounds_won: Number(form.attack_rounds_won) || 0, attack_rounds_played: Number(form.attack_rounds_played) || 0,
          defense_rounds_won: Number(form.defense_rounds_won) || 0, defense_rounds_played: Number(form.defense_rounds_played) || 0,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      onAdded(json.data)
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="試合を手動追加" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="相手チーム名 *">
            <input className={inputCls} value={form.opponent_name} required
              onChange={e => setForm(f => ({ ...f, opponent_name: e.target.value }))} />
          </Field>
          <Field label="マップ">
            <select className={inputCls} value={form.map} onChange={e => setForm(f => ({ ...f, map: e.target.value }))}>
              {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="種別">
            <select className={inputCls} value={form.match_type} onChange={e => setForm(f => ({ ...f, match_type: e.target.value }))}>
              <option value="scrim">スクリム</option>
              <option value="official">公式</option>
              <option value="practice">練習</option>
            </select>
          </Field>
          <Field label="日時">
            <input type="datetime-local" className={inputCls} value={form.match_date}
              onChange={e => setForm(f => ({ ...f, match_date: e.target.value }))} />
          </Field>
          <Field label="自チーム点 *">
            <input type="number" min={0} max={25} className={inputCls} required value={form.team_score}
              onChange={e => setForm(f => ({ ...f, team_score: e.target.value }))} />
          </Field>
          <Field label="相手点 *">
            <input type="number" min={0} max={25} className={inputCls} required value={form.opponent_score}
              onChange={e => setForm(f => ({ ...f, opponent_score: e.target.value }))} />
          </Field>
        </div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ラウンド詳細（任意）</div>
        <div className="grid grid-cols-4 gap-2">
          {(['attack_rounds_won','attack_rounds_played','defense_rounds_won','defense_rounds_played'] as const).map(k => (
            <Field key={k} label={{ attack_rounds_won:'ATK勝', attack_rounds_played:'ATK計', defense_rounds_won:'DEF勝', defense_rounds_played:'DEF計' }[k]}>
              <input type="number" min={0} max={25} className={inputCls} value={form[k]}
                onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
            </Field>
          ))}
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-white">キャンセル</button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-[#FF4655] hover:bg-[#e03e4d] text-white text-sm font-semibold rounded-lg disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} 保存
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ============================================================
// Shared UI
// ============================================================

const inputCls = 'w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF4655] outline-none'

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
        done ? 'bg-[#00D4A0] border-[#00D4A0] text-white' :
        active ? 'bg-[#FF4655] border-[#FF4655] text-white' : 'bg-muted border-border text-muted-foreground')}>
        {done ? <Check className="w-3.5 h-3.5" /> : active ? '●' : '○'}
      </div>
      <span className={cn('text-[10px] font-medium whitespace-nowrap',
        active ? 'text-white' : done ? 'text-[#00D4A0]' : 'text-muted-foreground')}>{label}</span>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg p-3">
      <AlertCircle className="w-4 h-4 text-[#FF4655] flex-shrink-0 mt-0.5" />
      <p className="text-xs text-[#FF4655]">{message}</p>
    </div>
  )
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className={cn('bg-card border border-border rounded-2xl max-h-[92vh] overflow-y-auto', wide ? 'w-full max-w-4xl' : 'w-full max-w-2xl')}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-bold text-white text-sm">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-card rounded-xl border border-border p-12 text-center">
      <div className="text-muted-foreground text-sm mb-4">試合データがありません</div>
      <Link href="/scrim-input"
        className="px-5 py-2 bg-[#FF4655] hover:bg-[#e03e4d] text-white text-sm font-semibold rounded-lg transition-colors inline-block">
        スクリム入力へ
      </Link>
    </div>
  )
}
