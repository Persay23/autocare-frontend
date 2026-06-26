import { create } from 'zustand'
import { getMe, login as apiLogin, logout as apiLogout } from '@/features/auth/api'
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
    await apiLogin(email, password)
    const res = await getMe()
    set({ user: res.data })
  },

  logout: async (): Promise<void> => {
    await apiLogout()
    set({ user: null })
  },
}))

function checkSession() {
  getMe()
    .then((res) => useAuthStore.setState({ user: res.data as User, loading: false }))
    .catch(() => useAuthStore.setState({ user: null, loading: false }))
}

checkSession()
setInterval(checkSession, 1_200_000)
