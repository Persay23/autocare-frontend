import { create } from 'zustand'
import { getVehicleCostSummary } from './api'
import type { MonthlyCostSummary } from '@/lib/types'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface ExpensesState {
  summaries: Record<number, MonthlyCostSummary[]>
  loading: boolean
  lastFetched: number | null
  /** Fetch cost summaries for all provided vehicle IDs. Skips if cache is fresh. */
  fetchAll: (vehicleIds: number[]) => Promise<void>
  invalidate: () => void
}

export const useExpensesStore = create<ExpensesState>((set, get) => ({
  summaries: {},
  loading: false,
  lastFetched: null,

  fetchAll: async (vehicleIds: number[]) => {
    const { loading, lastFetched } = get()
    if (loading || !vehicleIds.length) return
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL) return

    set({ loading: true })
    try {
      const to = new Date()
      const from = new Date()
      from.setMonth(from.getMonth() - 6)

      const results = await Promise.allSettled(
        vehicleIds.map((id) =>
          getVehicleCostSummary(id, from.toISOString(), to.toISOString())
            .then((res) => ({ vehicleId: id, data: res.data as MonthlyCostSummary[] }))
        )
      )

      const summaries: Record<number, MonthlyCostSummary[]> = {}
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          summaries[r.value.vehicleId] = r.value.data
        }
      })

      set({ summaries, loading: false, lastFetched: Date.now() })
    } catch {
      set({ loading: false })
    }
  },

  invalidate: () => set({ lastFetched: null }),
}))
