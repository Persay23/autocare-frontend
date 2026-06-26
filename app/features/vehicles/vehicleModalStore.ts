import { create } from 'zustand'

interface VehicleModalStore {
  isOpen:    boolean
  vehicleId: number | null   // null = create mode
  openCreate: () => void
  openEdit:   (vehicleId: number) => void
  close:      () => void
}

export const useVehicleModal = create<VehicleModalStore>((set) => ({
  isOpen:    false,
  vehicleId: null,
  openCreate: () => set({ isOpen: true,  vehicleId: null }),
  openEdit:   (vehicleId) => set({ isOpen: true,  vehicleId }),
  close:      () => set({ isOpen: false, vehicleId: null }),
}))
