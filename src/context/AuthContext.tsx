import { createContext, useState, useEffect, type ReactNode } from 'react'
import { getMe, login as apiLogin, logout as apiLogout } from '../api/auth'
import type { AuthContextValue, User } from '../types'

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      getMe()
        .then((res) => setUser(res.data as User))
        .catch(() => setUser(null))
        .finally(() => setLoading(false))
    }

    checkAuth()

    const interval = setInterval(checkAuth, 300000)
    return () => clearInterval(interval)
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    await apiLogin(email, password)
    const res = await getMe()
    setUser(res.data as User)
  }

  const logout = async (): Promise<void> => {
    await apiLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}