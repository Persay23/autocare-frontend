import { create } from 'zustand'
import { getAiQuota, type AiQuota } from '@/features/ai/api'

interface AiQuotaState {
  quota: AiQuota | null
  refresh: () => Promise<void>
}

// Holds the current user's AI quota. Refreshed on the Profile page and after every AI action
// (the axios interceptor fires an 'ai-usage' event that AiQuotaSnackbar reacts to).
export const useAiQuotaStore = create<AiQuotaState>((set) => ({
  quota: null,
  refresh: async () => {
    try {
      const res = await getAiQuota()
      set({ quota: res.data })
    } catch {
      // Not logged in / endpoint unavailable — leave the last known value.
    }
  },
}))
