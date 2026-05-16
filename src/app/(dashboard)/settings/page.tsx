'use client'
import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus, Check, X, KeyRound, Mail, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouter } from 'next/navigation'

const ROLES = ['duelist', 'sub_duelist', 'initiator', 'controller', 'sentinel', 'flex', 'igl'] as const
type Role = typeof ROLES[number]

const ROLE_LABELS: Record<Role, string> = {
  duelist:     'デュエリスト',
  sub_duelist: 'サブデュエリスト',
  initiator:   'イニシエーター',
  controller:  'コントローラー',
  sentinel:    'センチネル',
  flex:        'フレックス',
  igl:         'IGL',
}

interface Player { id: string; ign: string; real_name?: string; role: Role; active: boolean }
interface Team   { id: string; name: string; tag: string; region: string }

export default function SettingsPage() {
  const { teamId, logout } = useAuth()
  const { t, locale } = useLanguage()
  const router = useRouter()
  const [team, setTeam]       = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // team edit
  const [editTeam, setEditTeam]     = useState(false)
  const [teamForm, setTeamForm]     = useState({ name: '', tag: '', region: 'JP' })
  const [teamSaving, setTeamSaving] = useState(false)

  // player add
  const [adding, setAdding]         = useState(false)
  const [newPlayer, setNewPlayer]   = useState({ ign: '', real_name: '', role: 'duelist' as Role })
  const [addSaving, setAddSaving]   = useState(false)

  // player edit
  const [editId, setEditId]         = useState<string | null>(null)
  const [editForm, setEditForm]     = useState({ ign: '', real_name: '', role: 'duelist' as Role })
  const [editSaving, setEditSaving] = useState(false)

  // account deletion
  const [showDeleteSection, setShowDeleteSection] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletePw, setDeletePw]       = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting]       = useState(false)

  const CONFIRM_WORD = locale === 'en' ? 'delete' : '退会'

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    if (deleteConfirmText !== CONFIRM_WORD) return
    if (!deletePw) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/auth/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePw }),
      })
      if (!res.ok) {
        const j = await res.json()
        setDeleteError(j.error ?? t('settings.deleteAccountError'))
        return
      }
      await logout()
      router.replace('/login')
    } catch {
      setDeleteError(t('settings.deleteAccountError'))
    } finally {
      setDeleting(false)
    }
  }

  // password change
  const [pwCurrent, setPwCurrent]   = useState('')
  const [pwNew, setPwNew]           = useState('')
  const [pwConfirm, setPwConfirm]   = useState('')
  const [pwShow, setPwShow]         = useState(false)
  const [pwSent, setPwSent]         = useState(false)
  const [pwSending, setPwSending]   = useState(false)
  const [pwError, setPwError]       = useState<string | null>(null)

  useEffect(() => {
    if (teamId) loadAll()
    // Get current user email from Supabase session
    createClient().auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null)
    })
  }, [teamId])

  async function loadAll() {
    setLoading(true)
    const [tRes, pRes] = await Promise.all([
      fetch('/api/teams'),
      fetch('/api/players?active=false'),
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
    const res = await fetch('/api/teams', {
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
      body: JSON.stringify({ ...newPlayer }),
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

  // ── Password change ───────────────────────────────────────
  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!userEmail) return
    if (pwNew !== pwConfirm) { setPwError('新しいパスワードが一致しません'); return }
    if (pwNew.length < 8)    { setPwError('パスワードは8文字以上にしてください'); return }
    setPwSending(true)
    setPwError(null)
    const supabase = createClient()

    // 現在のパスワードを確認
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: pwCurrent,
    })
    if (signInError) {
      setPwError('現在のパスワードが正しくありません')
      setPwSending(false)
      return
    }

    // 新しいパスワードへ変更リクエスト
    // Supabase の「Secure password change」が有効な場合、確認メールが自動送信される
    const { error: updateError } = await supabase.auth.updateUser({ password: pwNew })
    if (updateError) {
      setPwError(updateError.message)
      setPwSending(false)
      return
    }

    setPwSent(true)
    setPwCurrent('')
    setPwNew('')
    setPwConfirm('')
    setPwSending(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 rounded-full border-2 border-[#FF4655] border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>

      {/* ── Team ── */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.teamInfo')}</h2>
          {!editTeam && (
            <button onClick={openEditTeam} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
              <Pencil className="w-3.5 h-3.5" /> {t('settings.edit')}
            </button>
          )}
        </div>

        {editTeam ? (
          <div className="space-y-3">
            <Field label={t('settings.teamName')}>
              <input value={teamForm.name} onChange={e => setTeamForm(p => ({ ...p, name: e.target.value }))}
                className={inputCls} placeholder="Team Alpha" />
            </Field>
            <Field label={t('settings.teamTag')}>
              <input value={teamForm.tag} onChange={e => setTeamForm(p => ({ ...p, tag: e.target.value }))}
                className={inputCls} placeholder="ALPH" maxLength={10} />
            </Field>
            <Field label={t('settings.region')}>
              <select value={teamForm.region} onChange={e => setTeamForm(p => ({ ...p, region: e.target.value }))}
                className={inputCls}>
                {['JP','KR','NA','EU','SEA','BR','LATAM'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <div className="flex gap-2 pt-1">
              <button onClick={saveTeam} disabled={teamSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#FF4655] hover:bg-[#e03d4a] text-white text-sm rounded-lg transition-colors disabled:opacity-50">
                <Check className="w-3.5 h-3.5" /> {t('settings.save')}
              </button>
              <button onClick={() => setEditTeam(false)}
                className="flex items-center gap-1.5 px-4 py-2 bg-muted hover:bg-muted/70 text-white text-sm rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" /> {t('settings.cancel')}
              </button>
            </div>
          </div>
        ) : team ? (
          <div className="space-y-2 text-sm">
            <Row label={t('settings.teamName')} value={team.name} />
            <Row label={t('settings.teamTag')}  value={`[${team.tag}]`} />
            <Row label={t('settings.region')}   value={team.region} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('settings.noTeam')}</p>
        )}
      </section>

      {/* ── Players ── */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t('settings.players')} <span className="text-white">({players.length})</span>
          </h2>
          {!adding && (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs text-[#FF4655] hover:text-[#e03d4a] transition-colors">
              <Plus className="w-3.5 h-3.5" /> {t('settings.addPlayer')}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {players.map(p => (
            <div key={p.id} className="rounded-lg border border-border bg-muted/20 p-3">
              {editId === p.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editForm.ign} onChange={e => setEditForm(f => ({ ...f, ign: e.target.value }))}
                      className={inputCls} placeholder="IGN" />
                    <input value={editForm.real_name} onChange={e => setEditForm(f => ({ ...f, real_name: e.target.value }))}
                      className={inputCls} placeholder="読み方（任意）" />
                  </div>
                  <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}
                    className={inputCls}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(p.id)} disabled={editSaving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#FF4655] text-white text-xs rounded-lg disabled:opacity-50">
                      <Check className="w-3 h-3" /> {t('settings.save')}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-muted text-white text-xs rounded-lg">
                      <X className="w-3 h-3" /> {t('settings.cancel')}
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

        {adding && (
          <div className="rounded-lg border border-[#FF4655]/30 bg-[#FF4655]/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-[#FF4655] mb-3">{t('settings.newPlayer')}</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={newPlayer.ign} onChange={e => setNewPlayer(p => ({ ...p, ign: e.target.value }))}
                className={inputCls} placeholder="IGN *" />
              <input value={newPlayer.real_name} onChange={e => setNewPlayer(p => ({ ...p, real_name: e.target.value }))}
                className={inputCls} placeholder="読み方（任意）" />
            </div>
            <select value={newPlayer.role} onChange={e => setNewPlayer(p => ({ ...p, role: e.target.value as Role }))}
              className={inputCls}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <div className="flex gap-2 pt-1">
              <button onClick={addPlayer} disabled={addSaving || !newPlayer.ign}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#FF4655] hover:bg-[#e03d4a] text-white text-sm rounded-lg transition-colors disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" /> {t('settings.addPlayer')}
              </button>
              <button onClick={() => { setAdding(false); setNewPlayer({ ign: '', real_name: '', role: 'duelist' }) }}
                className="flex items-center gap-1.5 px-4 py-2 bg-muted text-white text-sm rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" /> {t('settings.cancel')}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Delete Account ── */}
      <section className="bg-card border border-[#FF4655]/30 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#FF4655]" />
          <h2 className="text-sm font-semibold text-[#FF4655] uppercase tracking-wider">{t('settings.deleteAccountTitle')}</h2>
        </div>

        {!showDeleteSection ? (
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
              {t('settings.deleteAccountDesc')}
            </p>
            <button
              onClick={() => setShowDeleteSection(true)}
              className="flex-shrink-0 px-4 py-2 border border-[#FF4655]/40 text-[#FF4655] text-xs font-semibold rounded-lg hover:bg-[#FF4655]/10 transition-colors"
            >
              {t('settings.deleteAccount')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('settings.deleteAccountDesc')}
            </p>

            {deleteError && (
              <p className="text-xs text-[#FF4655] bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}

            <Field label={t('settings.deleteAccountPwLabel')}>
              <input
                type="password"
                value={deletePw}
                onChange={e => setDeletePw(e.target.value)}
                required
                className={inputCls}
                autoComplete="current-password"
              />
            </Field>

            <Field label={t('settings.deleteConfirmHint').replace(
              locale === 'en' ? '"delete"' : '「退会」',
              `"${CONFIRM_WORD}"`
            )}>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={CONFIRM_WORD}
                className={inputCls}
                autoComplete="off"
              />
            </Field>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={deleting || deleteConfirmText !== CONFIRM_WORD || !deletePw}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF4655] hover:bg-[#e03d4a] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? t('settings.deleteAccountDeleting') : t('settings.deleteAccount')}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteSection(false); setDeleteConfirmText(''); setDeletePw(''); setDeleteError(null) }}
                className="px-4 py-2 bg-muted text-white text-sm rounded-lg hover:bg-muted/70 transition-colors"
              >
                {t('settings.cancel')}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── Password ── */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.password')}</h2>
        </div>

        {userEmail && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="w-3.5 h-3.5" />
            <span>確認メール送信先: <span className="text-white">{userEmail}</span></span>
          </div>
        )}

        {pwSent ? (
          <div className="flex items-center gap-2 bg-[#00D4A0]/10 border border-[#00D4A0]/30 rounded-xl px-4 py-3">
            <Check className="w-4 h-4 text-[#00D4A0] flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">パスワードを変更しました</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                確認メールを <span className="text-white">{userEmail}</span> に送信しました
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={changePassword} className="space-y-3">
            {pwError && (
              <p className="text-xs text-[#FF4655] bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg px-3 py-2">
                {pwError}
              </p>
            )}

            <Field label="現在のパスワード">
              <div className="relative">
                <input
                  type={pwShow ? 'text' : 'password'}
                  value={pwCurrent}
                  onChange={e => setPwCurrent(e.target.value)}
                  required
                  className={inputCls}
                  placeholder="現在のパスワード"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setPwShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors">
                  {pwShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            <Field label="新しいパスワード">
              <input
                type={pwShow ? 'text' : 'password'}
                value={pwNew}
                onChange={e => setPwNew(e.target.value)}
                required minLength={8}
                className={inputCls}
                placeholder="8文字以上"
                autoComplete="new-password"
              />
            </Field>

            <Field label="新しいパスワード（確認）">
              <input
                type={pwShow ? 'text' : 'password'}
                value={pwConfirm}
                onChange={e => setPwConfirm(e.target.value)}
                required
                className={inputCls}
                placeholder="もう一度入力"
                autoComplete="new-password"
              />
            </Field>

            <button
              type="submit"
              disabled={pwSending || !pwCurrent || !pwNew || !pwConfirm}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF4655] hover:bg-[#e03d4a] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {pwSending ? t('settings.changingPassword') : t('settings.changePassword')}
            </button>
          </form>
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
