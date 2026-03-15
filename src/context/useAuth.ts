import { useAuthStore } from '../stores/authStore'
import type { AuthContextValue } from '../types'

export const useAuth = (): AuthContextValue => useAuthStore()