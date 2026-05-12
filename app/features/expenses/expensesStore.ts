import { create } from 'zustand'
import { getVehicleCostSummary, getGeneralExpensesByVehicle } from './api'
import type { MonthlyCostSummary, GeneralExpense } from '@/lib/types'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface ExpensesState {
  summaries: Record<number, MonthlyCostSummary[]>
  generalExpenses: GeneralExpense[]
  loading: boolean
  generalLoading: boolean
  lastFetched: number | null
  lastGeneralFetched: number | null
  fetchAll: (vehicleIds: number[]) => Promise<void>
  fetchGeneralExpenses: (vehicleIds: number[]) => Promise<void>
  removeGeneralExpense: (id: number) => void
  invalidate: () => void
}

export const useExpensesStore = create<ExpensesState>((set, get) => ({
  summaries: {},
  generalExpenses: [],
  loading: false,
  generalLoading: false,
  lastFetched: null,
  lastGeneralFetched: null,

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
        if (r.status === 'fulfilled') summaries[r.value.vehicleId] = r.value.data
      })

      set({ summaries, loading: false, lastFetched: Date.now() })
    } catch {
      set({ loading: false })
    }
  },

  fetchGeneralExpenses: async (vehicleIds: number[]) => {
    const { generalLoading, lastGeneralFetched } = get()
    if (generalLoading || !vehicleIds.length) return
    if (lastGeneralFetched && Date.now() - lastGeneralFetched < CACHE_TTL) return

    set({ generalLoading: true })
    try {
      const results = await Promise.allSettled(
        vehicleIds.map((id) =>
          getGeneralExpensesByVehicle(id).then((res) => res.data as GeneralExpense[])
        )
      )

      const generalExpenses: GeneralExpense[] = results.flatMap((r) =>
        r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []
      )

      set({ generalExpenses, generalLoading: false, lastGeneralFetched: Date.now() })
    } catch {
      set({ generalLoading: false })
    }
  },

  removeGeneralExpense: (id: number) =>
    set((s) => ({ generalExpenses: s.generalExpenses.filter((e) => e.generalExpenseId !== id) })),

  invalidate: () => set({ lastFetched: null, lastGeneralFetched: null }),
}))
