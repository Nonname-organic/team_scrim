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
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setTeamId(data?.teamId ?? null)
        setUserId(data?.userId ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
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
