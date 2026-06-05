import { create } from 'zustand'

interface ExpenseModalStore {
  isOpen:    boolean
  expenseId: number | null   // null = create mode, number = view/edit
  open:    () => void                    // open in create mode
  openFor: (expenseId: number) => void  // open for existing expense
  close:   () => void
}

export const useExpenseModal = create<ExpenseModalStore>((set) => ({
  isOpen:    false,
  expenseId: null,
  open:    () => set({ isOpen: true,  expenseId: null }),
  openFor: (expenseId) => set({ isOpen: true,  expenseId }),
  close:   () => set({ isOpen: false, expenseId: null }),
}))
