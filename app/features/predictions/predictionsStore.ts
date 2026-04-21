import { create } from 'zustand'
import { getPredictionsByVehicle } from './api'
import type { Prediction } from '@/lib/types'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface PredictionsState {
  predictions: Record<number, Prediction[]>
  loading: boolean
  lastFetched: number | null
  fetchAll: (vehicleIds: number[]) => Promise<void>
  invalidate: () => void
}

export const usePredictionsStore = create<PredictionsState>((set, get) => ({
  predictions: {},
  loading: false,
  lastFetched: null,

  fetchAll: async (vehicleIds: number[]) => {
    const { loading, lastFetched } = get()
    if (loading || !vehicleIds.length) return
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL) return

    set({ loading: true })
    try {
      const results = await Promise.allSettled(
        vehicleIds.map((id) =>
          getPredictionsByVehicle(id)
            .then((res) => ({ vehicleId: id, data: res.data as Prediction[] }))
        )
      )

      const predictions: Record<number, Prediction[]> = {}
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          predictions[r.value.vehicleId] = Array.isArray(r.value.data) ? r.value.data : []
        }
      })

      set({ predictions, loading: false, lastFetched: Date.now() })
    } catch {
      set({ loading: false })
    }
  },

  invalidate: () => set({ lastFetched: null }),
}))
