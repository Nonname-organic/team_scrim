'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  teamId: string | null
  userId: string | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  teamId: null,
  userId: null,
  loading: true,
  logout: async () => {},
})

// 前回の認証結果キャッシュ（ID のみ）。リロード時に /api/auth/me の往復を待たず
// データ取得を即開始するための楽観値で、裏で必ず再検証する
const AUTH_CACHE_KEY = 'axelia-auth-me'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [teamId, setTeamId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(AUTH_CACHE_KEY) ?? 'null')
      if (cached?.teamId) {
        setTeamId(cached.teamId)
        setUserId(cached.userId ?? null)
        setLoading(false)
      }
    } catch { /* sessionStorage 不可の環境では従来どおり待つ */ }

    fetch('/api/auth/me')
      .then(async r => {
        if (r.status === 401) return null
        if (r.status === 403) {
          const body = await r.json().catch(() => ({}))
          if (body.error === 'NeedsConsent') {
            router.replace('/consent')
          } else {
            router.replace('/setup')
          }
          return null
        }
        return r.ok ? r.json() : null
      })
      .then(data => {
        setTeamId(data?.teamId ?? null)
        setUserId(data?.userId ?? null)
        try {
          if (data?.teamId) {
            sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ teamId: data.teamId, userId: data.userId }))
          } else {
            sessionStorage.removeItem(AUTH_CACHE_KEY)
          }
        } catch { /* noop */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  // 壊れたリフレッシュトークンをクライアント側で検知してクリア
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // TOKEN_REFRESHED で session が null = リフレッシュ失敗
        // SIGNED_OUT = セッション削除（middleware が削除した場合も含む）
        setTeamId(null)
        setUserId(null)
        try { sessionStorage.removeItem(AUTH_CACHE_KEY) } catch { /* noop */ }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setTeamId(null)
    setUserId(null)
    try { sessionStorage.removeItem(AUTH_CACHE_KEY) } catch { /* noop */ }
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ teamId, userId, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
