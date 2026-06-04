import { useState, useEffect, type ElementType } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import { getGeneralExpenseById, deleteGeneralExpense } from '@/features/expenses/api'
import { useExpensesStore } from '@/features/expenses/expensesStore'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { LoadingText } from '@/ui/AsyncStates'
import { EXPENSE_CATEGORY_ICONS } from '@/lib/icons'
import type { GeneralExpense } from '@/lib/types'
import EditIcon from '@mui/icons-material/Edit'
import { useCurrencyStore, formatMoney } from '@/features/currency/currencyStore'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'

const CATEGORY_COLORS: Record<string, string> = {
  Insurance:   'var(--accent2)',
  Tax:         'var(--accent3)',
  Parking:     'var(--accent)',
  Tolls:       'var(--accent2)',
  Fines:       'var(--orange)',
  CarWash:     'var(--accent4)',
  Accessories: 'var(--green)',
  Other:       'var(--text2)',
}

const CATEGORY_LABELS: Record<string, string> = {
  Insurance:   'Insurance',
  Tax:         'Tax',
  Parking:     'Parking',
  Tolls:       'Toll / vignette',
  Fines:       'Fine',
  CarWash:     'Car wash',
  Accessories: 'Accessories',
  Other:       'Other',
}

function Row({ label, value, italic }: { label: string; value: React.ReactNode; italic?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '14px 16px', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--text3)', fontSize: 13, flexShrink: 0, paddingRight: 16 }}>
        {label}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 500, textAlign: 'right' as const,
        color: 'var(--text)', fontStyle: italic ? 'italic' : 'normal',
      }}>
        {value}
      </span>
    </div>
  )
}

export default function ExpenseDetail() {
  const { expenseId } = useParams()
  const navigate      = useNavigate()
  const location      = useLocation()
  const goBack        = () => location.key !== 'default' ? navigate(-1) : navigate('/expenses')

  const removeGeneralExpense = useExpensesStore((s) => s.removeGeneralExpense)
  const { vehicles, fetch: fetchVehicles } = useVehiclesStore()

  const [expense, setExpense]               = useState<GeneralExpense | null>(null)
  const [loading, setLoading]               = useState(true)
  const [deleting, setDeleting]             = useState(false)
  const [confirmDelete, setConfirmDelete]   = useState(false)

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  useEffect(() => {
    if (!expenseId) return
    let cancelled = false
    getGeneralExpenseById(expenseId)
      .then((res) => { if (!cancelled) setExpense(res.data as GeneralExpense) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [expenseId])

  const { currency } = useCurrencyStore()

  const handleDelete = async () => {
    if (!expense) return
    setDeleting(true)
    try {
      await deleteGeneralExpense(expenseId!)
      removeGeneralExpense(expense.generalExpenseId)
      navigate('/expenses', { replace: true })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <PageShell><LoadingText /></PageShell>
  if (!expense) return (
    <PageShell>
      <div style={{ padding: 22, color: 'var(--text2)' }}>Expense not found.</div>
    </PageShell>
  )

  const vehicle     = vehicles.find((v) => v.vehicleId === expense.vehicleId)
  const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : null
  const color       = CATEGORY_COLORS[expense.expenseCategory] ?? 'var(--text2)'
  const label       = CATEGORY_LABELS[expense.expenseCategory] ?? expense.expenseCategory
  const Icon: ElementType = EXPENSE_CATEGORY_ICONS[expense.expenseCategory] ?? EXPENSE_CATEGORY_ICONS.Other

  const formattedDate = new Date(expense.date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const nextDate = expense.nextOccurrenceDate
    ? new Date(expense.nextOccurrenceDate).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null
  const endDate = expense.recurrenceEndDate
    ? new Date(expense.recurrenceEndDate).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null

  return (
    <PageShell>
      {/* Back link */}
      <div style={{ padding: '14px 22px 8px' }}>
        <button
          onClick={goBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', padding: 0,
            fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 600,
            color: 'var(--accent2)', cursor: 'pointer',
          }}
        >
          ‹ Expenses
        </button>
      </div>

      {/* Header */}
      <div style={{ padding: '6px 22px 20px' }}>
        {/* Row 1: date (left) · vehicle (right) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
            {formattedDate}
          </div>
          {vehicleName && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
              <DirectionsCarIcon sx={{ fontSize: 14 }} />
              {vehicleName}
            </div>
          )}
        </div>

        {/* Row 2+3: left col (category + recurring) · right col (price) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: `color-mix(in srgb, ${color} 18%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
              borderRadius: 999, padding: '6px 12px',
            }}>
              <Icon sx={{ fontSize: 14, color }} />
              <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
            </div>

            {expense.isRecurring ? (
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600,
                color: 'var(--accent4)',
                background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
                padding: '6px 9px', borderRadius: 4, letterSpacing: '0.06em',
                lineHeight: 1.7,
              }}>
                <div>↻ RECURRING</div>
                <div>every {expense.recurrenceEvery} {(expense.recurrenceInterval ?? '').toLowerCase()}</div>
              </div>
            ) : (
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600,
                color: 'var(--text3)',
                background: 'rgba(123,128,168,0.08)', border: '1px solid rgba(123,128,168,0.2)',
                padding: '6px 9px', borderRadius: 4, letterSpacing: '0.06em',
                lineHeight: 1.7,
              }}>
                <div>↻ NEVER</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {formatMoney(expense.cost, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Details rows */}
      <div style={{
        margin: '0 22px 20px',
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {expense.description && <Row label="Description" value={expense.description} />}
        {expense.notes       && <Row label="Notes"       value={expense.notes} italic />}
        {expense.isRecurring && nextDate && <Row label="Next occurrence" value={nextDate} />}
        {expense.isRecurring && endDate  && <Row label="Ends on"         value={endDate} />}
      </div>

      {/* Edit button */}
      <div style={{ padding: '0 22px' }}>
        <button
          onClick={() => navigate(`/expenses/${expenseId}/edit`)}
          style={{
            width: '100%', padding: '15px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 14, cursor: 'pointer',
            fontSize: 15, fontWeight: 700, color: 'var(--text)',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          <EditIcon sx={{ fontSize: 17, color: 'var(--text2)' }} />
          Edit expense
        </button>
      </div>

      {/* Delete */}
      <div style={{ padding: '16px 22px', textAlign: 'center' as const }}>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              background: 'none', border: 'none',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14, fontWeight: 600, color: 'var(--red)',
              textDecoration: 'underline', cursor: 'pointer',
            }}
          >
            Delete expense
          </button>
        ) : (
          <div style={{
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 12, padding: '14px',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: 'var(--red)', marginBottom: 12, textAlign: 'center' as const,
            }}>
              Are you sure? This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: 'var(--red)', color: '#fff', border: 'none',
                  fontSize: 13, fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: 'var(--surface2)', color: 'var(--text2)',
                  border: '1px solid var(--border)', fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ height: 24 }} />
    </PageShell>
  )
}
