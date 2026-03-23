'use client'
import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react'

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? ''

const ROLES = ['duelist', 'initiator', 'controller', 'sentinel', 'igl'] as const
type Role = typeof ROLES[number]

const ROLE_LABELS: Record<Role, string> = {
  duelist:    'デュエリスト',
  initiator:  'イニシエーター',
  controller: 'コントローラー',
  sentinel:   'センチネル',
  igl:        'IGL',
}

interface Player { id: string; ign: string; real_name?: string; role: Role; active: boolean }
interface Team   { id: string; name: string; tag: string; region: string }

export default function SettingsPage() {
  const [team, setTeam]       = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  // team edit state
  const [editTeam, setEditTeam]   = useState(false)
  const [teamForm, setTeamForm]   = useState({ name: '', tag: '', region: 'JP' })
  const [teamSaving, setTeamSaving] = useState(false)

  // player add state
  const [adding, setAdding]     = useState(false)
  const [newPlayer, setNewPlayer] = useState({ ign: '', real_name: '', role: 'duelist' as Role })
  const [addSaving, setAddSaving] = useState(false)

  // player edit state
  const [editId, setEditId]     = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ ign: '', real_name: '', role: 'duelist' as Role })
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [tRes, pRes] = await Promise.all([
      fetch(`/api/teams?team_id=${TEAM_ID}`),
      fetch(`/api/players?team_id=${TEAM_ID}&active=false`),
    ])
    if (tRes.ok) { const j = await tRes.json(); setTeam(j.data) }
    if (pRes.ok) { const j = await pRes.json(); setPlayers(j.data ?? []) }
    setLoading(false)
  }

  // ── Team ──────────────────────────────────────────────────
  function openEditTeam() {
    if (!team) return
    setTeamForm({ name: team.name, tag: team.tag, region: team.region })
    setEditTeam(true)
  }

  async function saveTeam() {
    setTeamSaving(true)
    const res = await fetch(`/api/teams?team_id=${TEAM_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamForm),
    })
    if (res.ok) { const j = await res.json(); setTeam(j.data); setEditTeam(false) }
    setTeamSaving(false)
  }

  // ── Player add ────────────────────────────────────────────
  async function addPlayer() {
    if (!newPlayer.ign || !newPlayer.role) return
    setAddSaving(true)
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: TEAM_ID, ...newPlayer }),
    })
    if (res.ok) {
      const j = await res.json()
      setPlayers(prev => [...prev, j.data])
      setNewPlayer({ ign: '', real_name: '', role: 'duelist' })
      setAdding(false)
    }
    setAddSaving(false)
  }

  // ── Player edit ───────────────────────────────────────────
  function openEdit(p: Player) {
    setEditId(p.id)
    setEditForm({ ign: p.ign, real_name: p.real_name ?? '', role: p.role })
  }

  async function saveEdit(id: string) {
    setEditSaving(true)
    const res = await fetch(`/api/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      const j = await res.json()
      setPlayers(prev => prev.map(p => p.id === id ? j.data : p))
      setEditId(null)
    }
    setEditSaving(false)
  }

  // ── Player delete ─────────────────────────────────────────
  async function deletePlayer(id: string) {
    if (!confirm('この選手を削除しますか？')) return
    const res = await fetch(`/api/players/${id}`, { method: 'DELETE' })
    if (res.ok) setPlayers(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 rounded-full border-2 border-[#FF4655] border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-white">設定</h1>

      {/* ── Team ── */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">チーム情報</h2>
          {!editTeam && (
            <button onClick={openEditTeam} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
              <Pencil className="w-3.5 h-3.5" /> 編集
            </button>
          )}
        </div>

        {editTeam ? (
          <div className="space-y-3">
            <Field label="チーム名">
              <input value={teamForm.name} onChange={e => setTeamForm(p => ({ ...p, name: e.target.value }))}
                className={inputCls} placeholder="Team Alpha" />
            </Field>
            <Field label="タグ">
              <input value={teamForm.tag} onChange={e => setTeamForm(p => ({ ...p, tag: e.target.value }))}
                className={inputCls} placeholder="ALPH" maxLength={10} />
            </Field>
            <Field label="リージョン">
              <select value={teamForm.region} onChange={e => setTeamForm(p => ({ ...p, region: e.target.value }))}
                className={inputCls}>
                {['JP','KR','NA','EU','SEA','BR','LATAM'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <div className="flex gap-2 pt-1">
              <button onClick={saveTeam} disabled={teamSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#FF4655] hover:bg-[#e03d4a] text-white text-sm rounded-lg transition-colors disabled:opacity-50">
                <Check className="w-3.5 h-3.5" /> 保存
              </button>
              <button onClick={() => setEditTeam(false)}
                className="flex items-center gap-1.5 px-4 py-2 bg-muted hover:bg-muted/70 text-white text-sm rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" /> キャンセル
              </button>
            </div>
          </div>
        ) : team ? (
          <div className="space-y-2 text-sm">
            <Row label="チーム名" value={team.name} />
            <Row label="タグ"     value={`[${team.tag}]`} />
            <Row label="リージョン" value={team.region} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">チームが見つかりません</p>
        )}
      </section>

      {/* ── Players ── */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            選手 <span className="text-white">({players.length})</span>
          </h2>
          {!adding && (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs text-[#FF4655] hover:text-[#e03d4a] transition-colors">
              <Plus className="w-3.5 h-3.5" /> 追加
            </button>
          )}
        </div>

        {/* Player list */}
        <div className="space-y-2">
          {players.map(p => (
            <div key={p.id} className="rounded-lg border border-border bg-muted/20 p-3">
              {editId === p.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editForm.ign} onChange={e => setEditForm(f => ({ ...f, ign: e.target.value }))}
                      className={inputCls} placeholder="IGN" />
                    <input value={editForm.real_name} onChange={e => setEditForm(f => ({ ...f, real_name: e.target.value }))}
                      className={inputCls} placeholder="本名（任意）" />
                  </div>
                  <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}
                    className={inputCls}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(p.id)} disabled={editSaving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#FF4655] text-white text-xs rounded-lg disabled:opacity-50">
                      <Check className="w-3 h-3" /> 保存
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-muted text-white text-xs rounded-lg">
                      <X className="w-3 h-3" /> キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-white">{p.ign}</span>
                    {p.real_name && <span className="text-xs text-muted-foreground ml-2">{p.real_name}</span>}
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-[#FF4655]/10 text-[#FF4655]">
                      {ROLE_LABELS[p.role] ?? p.role}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-white transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deletePlayer(p.id)} className="text-muted-foreground hover:text-[#FF4655] transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add form */}
        {adding && (
          <div className="rounded-lg border border-[#FF4655]/30 bg-[#FF4655]/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-[#FF4655] mb-3">新規選手</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={newPlayer.ign} onChange={e => setNewPlayer(p => ({ ...p, ign: e.target.value }))}
                className={inputCls} placeholder="IGN *" />
              <input value={newPlayer.real_name} onChange={e => setNewPlayer(p => ({ ...p, real_name: e.target.value }))}
                className={inputCls} placeholder="本名（任意）" />
            </div>
            <select value={newPlayer.role} onChange={e => setNewPlayer(p => ({ ...p, role: e.target.value as Role }))}
              className={inputCls}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <div className="flex gap-2 pt-1">
              <button onClick={addPlayer} disabled={addSaving || !newPlayer.ign}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#FF4655] hover:bg-[#e03d4a] text-white text-sm rounded-lg transition-colors disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" /> 追加
              </button>
              <button onClick={() => { setAdding(false); setNewPlayer({ ign: '', real_name: '', role: 'duelist' }) }}
                className="flex items-center gap-1.5 px-4 py-2 bg-muted text-white text-sm rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" /> キャンセル
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

const inputCls = 'w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF4655] outline-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground w-24 flex-shrink-0">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}
