import { useExpenseModal } from '@/features/expenses/expenseModalStore'
import ExpenseModal from './ExpenseModal'

export default function GlobalExpenseModal() {
  const { isOpen, expenseId, close } = useExpenseModal()
  if (!isOpen) return null
  return (
    <ExpenseModal
      expenseId={expenseId}
      onClose={close}
      onSaved={close}
    />
  )
}
