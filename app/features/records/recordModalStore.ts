import { create } from 'zustand'

interface RecordModalStore {
  isOpen:    boolean
  vehicleId: string | null   // null = show vehicle picker first
  recordId:  number | null   // null = create mode
  open:        () => void                                           // open with vehicle picker
  openCreate:  (vehicleId: string) => void                         // open in create mode
  openFor:     (vehicleId: string, recordId: number) => void       // open for existing record
  close:       () => void
}

export const useRecordModal = create<RecordModalStore>((set) => ({
  isOpen:    false,
  vehicleId: null,
  recordId:  null,
  open:       () => set({ isOpen: true,  vehicleId: null, recordId: null }),
  openCreate: (vehicleId) => set({ isOpen: true,  vehicleId, recordId: null }),
  openFor:    (vehicleId, recordId) => set({ isOpen: true, vehicleId, recordId }),
  close:      () => set({ isOpen: false, vehicleId: null, recordId: null }),
}))
