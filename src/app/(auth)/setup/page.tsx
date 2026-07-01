'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'needsInput' | 'success' | 'error'>('loading')
  const [error, setError]   = useState<string | null>(null)
  const [teamName, setTeamName] = useState('')
  const [teamTag,  setTeamTag]  = useState('')
  const [saving,   setSaving]   = useState(false)

  // 初回：user_metadata からの自動リカバリーを試みる
  useEffect(() => {
    fetch('/api/auth/recover-team', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.teamId) {
          setStatus('success')
          setTimeout(() => router.replace('/'), 1500)
        } else if (data.needsInput) {
          setStatus('needsInput')
        } else {
          setError(data.error ?? '不明なエラー')
          setStatus('error')
        }
      })
      .catch(() => {
        setError('サーバーに接続できませんでした')
        setStatus('error')
      })
  }, [router])

  // 手動入力でのリカバリー
  async function handleManualSetup(e: React.FormEvent) {
    e.preventDefault()
    if (!teamName.trim() || !teamTag.trim()) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/auth/recover-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_name: teamName, team_tag: teamTag }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.teamId) {
      setStatus('success')
      setTimeout(() => router.replace('/'), 1500)
    } else {
      setError(data.error ?? '登録に失敗しました')
    }
  }

  const inputCls = 'w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-[#FF4655] outline-none transition-colors'

  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-white">チームセットアップ</h1>
        <p className="text-sm text-muted-foreground">登録を完了しています</p>
      </div>

      {status === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-8 h-8 text-[#FF4655] animate-spin" />
          <p className="text-sm text-muted-foreground">チーム情報を復元中...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <CheckCircle className="w-8 h-8 text-[#00D4A0]" />
          <p className="text-sm text-[#00D4A0] font-semibold">セットアップ完了！ダッシュボードへ移動します</p>
        </div>
      )}

      {status === 'needsInput' && (
        <form onSubmit={handleManualSetup} className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            チーム情報が見つかりませんでした。もう一度入力してください。
          </p>
          {error && (
            <div className="flex items-center gap-2 bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-[#FF4655] flex-shrink-0" />
              <p className="text-xs text-[#FF4655]">{error}</p>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">チーム名</label>
            <input className={inputCls} placeholder="AXELIA" value={teamName}
              onChange={e => setTeamName(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">チームタグ（3〜5文字）</label>
            <input className={inputCls} placeholder="AXL" maxLength={5} value={teamTag}
              onChange={e => setTeamTag(e.target.value.toUpperCase())} required />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-[#FF4655] hover:bg-[#e03e4d] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />登録中...</> : '登録を完了する'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 text-[#FF4655] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#FF4655]">{error}</p>
          </div>
          <button onClick={() => setStatus('needsInput')}
            className="w-full bg-muted hover:bg-muted/80 text-white text-sm py-2.5 rounded-lg transition-colors">
            チーム情報を手動入力する
          </button>
        </div>
      )}
    </div>
  )
}
