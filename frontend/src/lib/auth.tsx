import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './api'
import { demoMode, useDemoMode } from './demo-mode'
import { DEMO_USER } from './demo-data'
import { tokens } from './token-store'
import type { User } from './types'

interface AuthValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, display_name: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthValue | null>(null)

interface TokenPair {
  access_token: string
  refresh_token: string
  user: User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const demo = useDemoMode()
  const qc = useQueryClient()
  const [session, setSession] = useState<User | null>(null)
  const hasRefresh = !!tokens.refresh
  const me = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiFetch<User>('/auth/me'),
    enabled: !demo && hasRefresh && !session,
    retry: false,
    staleTime: Infinity,
  })

  const user = demo ? DEMO_USER : session ?? me.data ?? null
  const loading = !demo && hasRefresh && !session && me.isPending

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiFetch<TokenPair>('/auth/login', { method: 'POST', body: { email, password }, auth: false })
    tokens.set(r.access_token, r.refresh_token)
    demoMode.set(false)
    setSession(r.user)
  }, [])

  const signup = useCallback(async (email: string, password: string, display_name: string) => {
    const r = await apiFetch<TokenPair>('/auth/signup', { method: 'POST', body: { email, password, display_name }, auth: false })
    tokens.set(r.access_token, r.refresh_token)
    demoMode.set(false)
    setSession(r.user)
  }, [])

  const logout = useCallback(() => {
    tokens.clear()
    setSession(null)
    qc.removeQueries({ queryKey: ['auth'] })
    if (demoMode.manual) demoMode.set(false)
  }, [qc])

  const value = useMemo(() => ({ user, loading, login, signup, logout }), [user, loading, login, signup, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
