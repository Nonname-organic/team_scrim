'use client'
import { useEffect, useState } from 'react'
import { ChevronUp, ChevronDown, Pencil, Check, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { tagLabel } from './RoundDetailEditor'
import type { LossTag } from '@/lib/round-detail'

/** 設定画面: 敗因タグの追加・名前変更・並べ替え・有効/無効 */
export function LossTagSettings() {
  const { t } = useLanguage()
  const [tags, setTags] = useState<LossTag[]>([])
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/loss-tags').then(r => r.json()).then(j => setTags(j.data ?? [])).catch(() => {})
  }, [])

  async function call(method: 'POST' | 'PATCH', body: unknown) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/loss-tags', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`)
      return j.data
    } catch (e) {
      setError(String(e))
      return null
    } finally {
      setBusy(false)
    }
  }

  const replace = (tag: LossTag | null) => tag && setTags(prev => prev.map(x => x.id === tag.id ? tag : x))

  async function add() {
    if (!newName.trim()) return
    const tag: LossTag | null = await call('POST', { name: newName })
    if (tag) {
      setTags(prev => prev.some(x => x.id === tag.id) ? prev.map(x => x.id === tag.id ? tag : x) : [...prev, tag])
      setNewName('')
    }
  }

  async function move(i: number, dir: -1 | 1) {
    const next = [...tags]
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    setTags(next)
    const saved: LossTag[] | null = await call('PATCH', { order: next.map(x => x.id) })
    if (saved) setTags(saved)
  }

  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('roundDetail.manageTitle')}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t('roundDetail.manageDesc')}</p>
      </div>

      <ul className="space-y-1">
        {tags.map((tag, i) => (
          <li key={tag.id} className={cn('flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2', !tag.active && 'opacity-50')}>
            <div className="flex flex-col">
              <button type="button" aria-label="up" disabled={busy || i === 0} onClick={() => move(i, -1)}
                className="text-muted-foreground hover:text-white disabled:opacity-20"><ChevronUp className="w-3.5 h-3.5" /></button>
              <button type="button" aria-label="down" disabled={busy || i === tags.length - 1} onClick={() => move(i, 1)}
                className="text-muted-foreground hover:text-white disabled:opacity-20"><ChevronDown className="w-3.5 h-3.5" /></button>
            </div>
            {editId === tag.id ? (
              <>
                <input value={editName} maxLength={40} autoFocus onChange={e => setEditName(e.target.value)}
                  className="flex-1 bg-muted border border-border rounded px-2 py-1 text-sm text-white focus:border-[#FF4655] outline-none" />
                <button type="button" disabled={busy} aria-label={t('roundDetail.rename')}
                  onClick={async () => { replace(await call('PATCH', { id: tag.id, name: editName })); setEditId(null) }}
                  className="text-[#00D4A0]"><Check className="w-4 h-4" /></button>
                <button type="button" onClick={() => setEditId(null)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-white">{tagLabel(tag, t)}</span>
                {!tag.active && <span className="text-[10px] text-muted-foreground">{t('roundDetail.disabledLabel')}</span>}
                <button type="button" aria-label={t('roundDetail.rename')}
                  onClick={() => { setEditId(tag.id); setEditName(tagLabel(tag, t)) }}
                  className="text-muted-foreground hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" disabled={busy}
                  onClick={async () => replace(await call('PATCH', { id: tag.id, active: !tag.active }))}
                  className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-white">
                  {tag.active ? t('roundDetail.disable') : t('roundDetail.enable')}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input value={newName} maxLength={40} placeholder={t('roundDetail.newTagPlaceholder')}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF4655] outline-none" />
        <button type="button" disabled={busy || !newName.trim()} onClick={add}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#FF4655] text-white text-sm disabled:opacity-40">
          <Plus className="w-4 h-4" /> {t('roundDetail.add')}
        </button>
      </div>
      {error && <p className="text-xs text-[#FF4655]">{error}</p>}
    </section>
  )
}
