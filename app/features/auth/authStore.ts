import { create } from 'zustand'
import { getMe, login as apiLogin, logout as apiLogout } from '@/features/auth/api'
import type { User } from '@/lib/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const checkSession = (set: (partial: Partial<AuthState>) => void) => {
  getMe()
    .then((res) => set({ user: res.data as User, loading: false }))
    .catch(() => set({ user: null, loading: false }))
}

export const useAuthStore = create<AuthState>((set) => {
  checkSession(set)
  setInterval(() => checkSession(set), 300000)

  return {
    user: null,
    loading: true,

    login: async (email: string, password: string): Promise<void> => {
      await apiLogin(email, password)
      const res = await getMe()
      set({ user: res.data as User })
    },

    logout: async (): Promise<void> => {
      await apiLogout()
      set({ user: null })
    },
  }
})
