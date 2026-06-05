import { create } from 'zustand'

interface DiagnoseModalStore {
  isOpen:    boolean
  vehicleId: number | null
  open:    () => void                   // open in vehicle-picker mode
  openFor: (vehicleId: number) => void  // open straight to chat
  close:   () => void
}

export const useDiagnoseModal = create<DiagnoseModalStore>((set) => ({
  isOpen:    false,
  vehicleId: null,
  open:    () => set({ isOpen: true,  vehicleId: null }),
  openFor: (vehicleId) => set({ isOpen: true,  vehicleId }),
  close:   () => set({ isOpen: false, vehicleId: null }),
}))
