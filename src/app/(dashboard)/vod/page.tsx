'use client'
import { useEffect, useState, useRef } from 'react'
import { Play, Link2, X, Check, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? 'YOUR_TEAM_UUID'

interface Match {
  id: string
  opponent_name: string
  match_date: string
  map: string
  match_type: string
  team_score: number
  opponent_score: number
  result: string
  video_url: string | null
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
  } catch { /* not a URL */ }
  return null
}

function getEmbedUrl(url: string): string | null {
  const ytId = getYouTubeId(url)
  if (ytId) return `https://www.youtube.com/embed/${ytId}`
  if (url.startsWith('http')) return url
  return null
}

const RESULT_COLOR = { win: '#00D4A0', loss: '#FF4655', draw: '#9B9BA4' } as const

export default function VodPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/matches?team_id=${TEAM_ID}&limit=100`)
      .then(r => r.json())
      .then(j => { setMatches(j.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (editId && inputRef.current) inputRef.current.focus()
  }, [editId])

  async function handleSaveUrl(matchId: string) {
    setSaving(true)
    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: editUrl || null }),
    })
    if (res.ok) {
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, video_url: editUrl || null } : m))
      setSaved(matchId)
      setTimeout(() => setSaved(null), 2000)
    }
    setEditId(null)
    setSaving(false)
  }

  const withVod = matches.filter(m => m.video_url)
  const withoutVod = matches.filter(m => !m.video_url)

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">読み込み中...</div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">VOD <span className="text-[#FF4655]">レビュー</span></h1>
        <p className="text-muted-foreground text-sm mt-1">試合映像の登録・レビュー</p>
      </div>

      {/* Active video player */}
      {activeId && (() => {
        const m = matches.find(x => x.id === activeId)
        if (!m?.video_url) return null
        const embed = getEmbedUrl(m.video_url)
        return (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div>
                <div className="text-sm font-semibold text-white">
                  {m.map} vs {m.opponent_name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(m.match_date).toLocaleDateString('ja-JP')}
                </div>
              </div>
              <button
                onClick={() => setActiveId(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {embed ? (
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={embed}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground text-sm">
                埋め込み非対応のURLです。
                <a href={m.video_url} target="_blank" rel="noopener noreferrer"
                  className="text-[#FF4655] hover:underline ml-1">
                  外部で開く →
                </a>
              </div>
            )}
          </div>
        )
      })()}

      {/* Matches with VOD */}
      <Section title="VOD登録済み" count={withVod.length} defaultOpen>
        {withVod.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            VODが登録された試合はありません
          </div>
        ) : (
          <div className="space-y-2">
            {withVod.map(m => (
              <MatchRow
                key={m.id}
                match={m}
                isActive={activeId === m.id}
                isEdit={editId === m.id}
                editUrl={editUrl}
                saving={saving}
                saved={saved === m.id}
                inputRef={editId === m.id ? inputRef : undefined}
                onPlay={() => setActiveId(activeId === m.id ? null : m.id)}
                onEdit={() => { setEditId(m.id); setEditUrl(m.video_url ?? '') }}
                onEditUrl={setEditUrl}
                onSave={() => handleSaveUrl(m.id)}
                onCancelEdit={() => setEditId(null)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Matches without VOD */}
      <Section title="VOD未登録" count={withoutVod.length}>
        {withoutVod.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            全試合にVODが登録されています
          </div>
        ) : (
          <div className="space-y-2">
            {withoutVod.map(m => (
              <MatchRow
                key={m.id}
                match={m}
                isActive={false}
                isEdit={editId === m.id}
                editUrl={editUrl}
                saving={saving}
                saved={saved === m.id}
                inputRef={editId === m.id ? inputRef : undefined}
                onPlay={() => {}}
                onEdit={() => { setEditId(m.id); setEditUrl('') }}
                onEditUrl={setEditUrl}
                onSave={() => handleSaveUrl(m.id)}
                onCancelEdit={() => setEditId(null)}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({
  title, count, children, defaultOpen = false,
}: {
  title: string; count: number; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 border-b border-border hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{title}</span>
          <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">{count}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  )
}

function MatchRow({
  match: m, isActive, isEdit, editUrl, saving, saved,
  inputRef, onPlay, onEdit, onEditUrl, onSave, onCancelEdit,
}: {
  match: Match
  isActive: boolean
  isEdit: boolean
  editUrl: string
  saving: boolean
  saved: boolean
  inputRef?: React.RefObject<HTMLInputElement | null>
  onPlay: () => void
  onEdit: () => void
  onEditUrl: (v: string) => void
  onSave: () => void
  onCancelEdit: () => void
}) {
  const result = m.result as 'win' | 'loss' | 'draw'
  const color = RESULT_COLOR[result] ?? '#9B9BA4'
  const date = new Date(m.match_date).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })

  return (
    <div className={cn(
      'rounded-xl border transition-colors',
      isActive ? 'border-[#FF4655]/40 bg-[#FF4655]/5' : 'border-border bg-background/30'
    )}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Result badge */}
        <div
          className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0"
          style={{ color, background: `${color}15` }}
        >
          {result === 'win' ? '勝' : result === 'loss' ? '敗' : '分'}
        </div>

        {/* Match info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {m.map} <span className="text-muted-foreground font-normal">vs</span> {m.opponent_name}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {date} · {m.team_score}–{m.opponent_score}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {saved && (
            <span className="text-xs text-[#00D4A0] flex items-center gap-1">
              <Check className="w-3 h-3" /> 保存済み
            </span>
          )}
          {m.video_url && !isEdit && (
            <button
              onClick={onPlay}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                isActive
                  ? 'bg-[#FF4655] text-white'
                  : 'bg-[#FF4655]/10 text-[#FF4655] hover:bg-[#FF4655]/20'
              )}
            >
              <Play className="w-3 h-3" />
              {isActive ? '閉じる' : '再生'}
            </button>
          )}
          {!isEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white border border-border hover:border-white/30 transition-colors"
            >
              {m.video_url ? <Pencil className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
              {m.video_url ? '編集' : 'URL登録'}
            </button>
          )}
        </div>
      </div>

      {/* URL input */}
      {isEdit && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <input
            ref={inputRef}
            type="url"
            value={editUrl}
            onChange={e => onEditUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancelEdit() }}
            placeholder="YouTube URL または動画URLを入力..."
            className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:border-[#FF4655] outline-none"
          />
          <button
            onClick={onSave}
            disabled={saving}
            className="px-3 py-2 rounded-lg bg-[#FF4655] text-white text-xs font-medium hover:bg-[#FF4655]/80 disabled:opacity-50 transition-colors"
          >
            保存
          </button>
          <button
            onClick={onCancelEdit}
            className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-white transition-colors"
          >
            キャンセル
          </button>
        </div>
      )}
    </div>
  )
}
