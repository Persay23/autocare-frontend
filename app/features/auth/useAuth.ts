import { useAuthStore } from '@/features/auth/authStore'
import type { AuthContextValue } from '@/lib/types'

export const useAuth = (): AuthContextValue => useAuthStore()