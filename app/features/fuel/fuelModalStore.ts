import { create } from 'zustand'

interface FuelModalStore {
  isOpen:    boolean
  vehicleId: string | null
  entryId:   number | null   // null = create mode
  openFor:   (vehicleId: string, entryId: number) => void
  openCreate:(vehicleId: string | null) => void
  close:     () => void
}

export const useFuelModal = create<FuelModalStore>((set) => ({
  isOpen:    false,
  vehicleId: null,
  entryId:   null,
  openFor:    (vehicleId, entryId) => set({ isOpen: true, vehicleId, entryId }),
  openCreate: (vehicleId) => set({ isOpen: true, vehicleId, entryId: null }),
  close:      () => set({ isOpen: false, vehicleId: null, entryId: null }),
}))
