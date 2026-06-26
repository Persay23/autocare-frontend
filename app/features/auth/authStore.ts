import { create } from 'zustand'
import { getMe, login as apiLogin, logout as apiLogout } from '@/features/auth/api'
import { getToken, setToken, clearToken } from '@/features/auth/token'
import type { User } from '@/shared/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email: string, password: string): Promise<void> => {
    const res = await apiLogin(email, password)
    // Store the token first so getMe() sends it as a bearer header.
    setToken(res.data.token)
    const me = await getMe()
    set({ user: me.data })
  },

  logout: async (): Promise<void> => {
    try {
      await apiLogout()
    } catch {
      // Logout is stateless server-side; ignore failures and clear locally regardless.
    }
    clearToken()
    set({ user: null })
    // Hard reload so all in-memory stores (expenses, vehicles, quota, …) are wiped —
    // otherwise the next user who logs in could see the previous user's cached data.
    window.location.href = '/login'
  },
}))

function checkSession() {
  // No token → not logged in; skip the request (avoids a guaranteed 401 on first load).
  if (!getToken()) {
    useAuthStore.setState({ user: null, loading: false })
    return
  }

  getMe()
    .then((res) => useAuthStore.setState({ user: res.data as User, loading: false }))
    .catch(() => {
      clearToken()
      useAuthStore.setState({ user: null, loading: false })
    })
}

checkSession()
setInterval(checkSession, 1_200_000)
