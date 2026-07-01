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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [teamId, setTeamId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async r => {
        if (r.status === 401) return null
        if (r.status === 403) {
          router.replace('/setup')
          return null
        }
        return r.ok ? r.json() : null
      })
      .then(data => {
        setTeamId(data?.teamId ?? null)
        setUserId(data?.userId ?? null)
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
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setTeamId(null)
    setUserId(null)
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
