import { create } from 'zustand'
import { getVehicles } from './api'
import { getComponentHealth } from '@/features/components/api'
import type { Vehicle, ComponentHealth } from '@/lib/types'

const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

interface VehiclesState {
  vehicles: Vehicle[]
  healthMap: Record<number, ComponentHealth[]>
  loading: boolean
  lastFetched: number | null
  /** Fetch vehicles + all health data. Skips if cache is fresh. */
  fetch: () => Promise<void>
  /** Force next fetch to bypass the cache (call after adding/deleting a vehicle or component). */
  invalidate: () => void
}

export const useVehiclesStore = create<VehiclesState>((set, get) => ({
  vehicles: [],
  healthMap: {},
  loading: false,
  lastFetched: null,

  fetch: async () => {
    const { loading, lastFetched } = get()
    if (loading) return
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL) return

    set({ loading: true })
    try {
      const vehicles: Vehicle[] = (await getVehicles()).data

      const healthResults = await Promise.allSettled(
        vehicles.map((v) =>
          getComponentHealth(v.vehicleId).then((r) => ({
            vehicleId: v.vehicleId,
            health: r.data as ComponentHealth[],
          }))
        )
      )

      const healthMap: Record<number, ComponentHealth[]> = {}
      healthResults.forEach((r) => {
        if (r.status === 'fulfilled') {
          healthMap[r.value.vehicleId] = r.value.health
        }
      })

      set({ vehicles, healthMap, loading: false, lastFetched: Date.now() })
    } catch {
      set({ loading: false })
    }
  },

  invalidate: () => set({ lastFetched: null }),
}))
