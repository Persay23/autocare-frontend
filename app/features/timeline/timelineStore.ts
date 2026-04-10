import { create } from 'zustand'
import { getVehicleTimeline } from './api'
import type { TimelineEvent, Vehicle } from '@/lib/types'

const CACHE_TTL = 2 * 60 * 1000 // 2 minutes (timeline changes more often than expenses)

interface TimelineState {
  /** All events per vehicle, each event already tagged with vehicleName + vehicleId */
  eventsByVehicle: Record<number, TimelineEvent[]>
  loading: boolean
  lastFetched: number | null
  /** Fetch timeline for all vehicles. Skips if cache is fresh. */
  fetchAll: (vehicles: Vehicle[]) => Promise<void>
  invalidate: () => void
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  eventsByVehicle: {},
  loading: false,
  lastFetched: null,

  fetchAll: async (vehicles: Vehicle[]) => {
    const { loading, lastFetched } = get()
    if (loading || !vehicles.length) return
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL) return

    set({ loading: true })
    try {
      const results = await Promise.allSettled(
        vehicles.map((v) =>
          getVehicleTimeline(v.vehicleId).then((res) => ({
            vehicleId: v.vehicleId,
            events: (Array.isArray(res.data) ? res.data as TimelineEvent[] : []).map((e) => ({
              ...e,
              vehicleName: `${v.brand} ${v.model}`,
              vehicleId: v.vehicleId,
            })),
          }))
        )
      )

      const eventsByVehicle: Record<number, TimelineEvent[]> = {}
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          eventsByVehicle[r.value.vehicleId] = r.value.events
        }
      })

      set({ eventsByVehicle, loading: false, lastFetched: Date.now() })
    } catch {
      set({ loading: false })
    }
  },

  invalidate: () => set({ lastFetched: null }),
}))
