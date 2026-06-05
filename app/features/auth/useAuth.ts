import { useAuthStore } from '@/features/auth/authStore'
import type { AuthContextValue } from '@/shared/types'

export const useAuth = (): AuthContextValue => useAuthStore()