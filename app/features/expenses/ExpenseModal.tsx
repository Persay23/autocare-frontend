import { useState, useEffect, useRef, type ElementType } from 'react'
import {
  getGeneralExpenseById,
  createGeneralExpense,
  updateGeneralExpense,
  deleteGeneralExpense,
} from '@/features/expenses/api'
import { useExpensesStore } from '@/features/expenses/expenseStore'
import { useVehiclesStore } from '@/features/vehicles/vehicleStore'
import { dedupFetch } from '@/shared/dedup'
import { useCurrencyStore, formatMoney, SYMBOLS, RATES, toPLN, convertCurrency, isSupportedCurrency } from '@/features/currency/currencyStore'
import { EXPENSE_CATEGORIES, RECURRENCE_INTERVALS } from '@/shared/enums'
import { EXPENSE_CATEGORY_ICONS } from '@/shared/icons'
import SmartFillButton from '@/features/ai/SmartFillButton'
import type { GeneralExpense, ExpenseParseResult } from '@/shared/types'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'

// ── constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  Insurance:   'Insurance',
  Tax:         'Tax',
  Parking:     'Parking',
  Tolls:       'Toll / vignette',
  Fines:       'Fines',
  CarWash:     'Car wash',
  Accessories: 'Accessories',
  Other:       'Other',
}

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

type FreqPreset = 'Monthly' | 'Yearly' | 'Quarterly' | 'Custom'

function inferPreset(interval: string, every: string): FreqPreset {
  if (interval === 'Months' && every === '1') return 'Monthly'
  if (interval === 'Years'  && every === '1') return 'Yearly'
  if (interval === 'Months' && every === '3') return 'Quarterly'
  return 'Custom'
}

// ── sub-components ────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: on ? 'var(--accent)' : 'var(--surface3)',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: on ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
      }} />
    </div>
  )
}

// ── form type ─────────────────────────────────────────────────────────────────

interface ExpenseForm {
  vehicleId: string
  expenseCategory: string
  cost: string
  date: string
  description: string
  notes: string
  isRecurring: boolean
  recurrenceInterval: string
  recurrenceEvery: string
  recurrenceEndDate: string
}

const emptyForm = (): ExpenseForm => ({
  vehicleId:          '',
  expenseCategory:    '',
  cost:               '',
  date:               new Date().toISOString().split('T')[0],
  description:        '',
  notes:              '',
  isRecurring:        false,
  recurrenceInterval: 'Years',
  recurrenceEvery:    '1',
  recurrenceEndDate:  '',
})

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  expenseId: number | null   // null = create mode
  onClose: () => void
  onSaved: () => void
}

export default function ExpenseModal({ expenseId, onClose, onSaved }: Props) {
  const isCreate = expenseId === null
  const { currency } = useCurrencyStore()
  const { vehicles, fetch: fetchVehicles } = useVehiclesStore()
  const { invalidate, removeGeneralExpense } = useExpensesStore()

  const [mode, setMode]                   = useState<'detail' | 'form'>(isCreate ? 'form' : 'detail')
  const [expense, setExpense]             = useState<GeneralExpense | null>(null)
  const [loadingEntry, setLoadingEntry]   = useState(!isCreate)
  const [form, setForm]                   = useState<ExpenseForm>(emptyForm())
  const [freqPreset, setFreqPreset]       = useState<FreqPreset>('Yearly')
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [submitError, setSubmitError]     = useState<string | null>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Ensure vehicles are loaded for vehicle picker in create mode
  useEffect(() => {
    if (isCreate) fetchVehicles()
  }, [isCreate, fetchVehicles])

  // Auto-select when there is only one vehicle (create mode)
  useEffect(() => {
    if (!isCreate || !vehicles.length || form.vehicleId) return
    if (vehicles.length === 1) setForm((p) => ({ ...p, vehicleId: String(vehicles[0].vehicleId) }))
  }, [isCreate, vehicles, form.vehicleId])

  // Load existing expense for detail / edit mode
  useEffect(() => {
    if (isCreate) return
    let cancelled = false
    setLoadingEntry(true)
    dedupFetch(`expense-modal-${expenseId}`, () => getGeneralExpenseById(expenseId!))
      .then((res) => {
        if (cancelled) return
        const e = res.data as GeneralExpense
        setExpense(e)
        const interval = e.recurrenceInterval ?? 'Years'
        const every    = e.recurrenceEvery != null ? String(e.recurrenceEvery) : '1'
        setFreqPreset(e.isRecurring ? inferPreset(interval, every) : 'Yearly')
        setForm({
          vehicleId:          String(e.vehicleId ?? ''),
          expenseCategory:    e.expenseCategory ?? '',
          cost:               e.cost != null ? String(parseFloat((e.cost * RATES[currency]).toFixed(2))) : '',
          date:               e.date ? e.date.split('T')[0] : '',
          description:        e.description ?? '',
          notes:              e.notes ?? '',
          isRecurring:        e.isRecurring ?? false,
          recurrenceInterval: interval,
          recurrenceEvery:    every,
          recurrenceEndDate:  e.recurrenceEndDate ? e.recurrenceEndDate.split('T')[0] : '',
        })
      })
      .finally(() => { if (!cancelled) setLoadingEntry(false) })
    return () => { cancelled = true }
  }, [expenseId, isCreate])

  const set = (field: keyof ExpenseForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))

  // Pre-fill from a scanned expense receipt; amount converted to the display currency.
  const handleExpenseParsed = (d: ExpenseParseResult): string => {
    const detectedRaw = d.currency?.trim().toUpperCase() ?? ''
    const detected = isSupportedCurrency(detectedRaw) ? detectedRaw : null
    const needsConvert = detected !== null && detected !== currency
    const conv = (a: number) => needsConvert ? convertCurrency(a, detected!, currency) : a
    const round2 = (n: number) => parseFloat(n.toFixed(2))

    setForm((p) => ({
      ...p,
      expenseCategory: d.expenseCategory && (EXPENSE_CATEGORIES as readonly string[]).includes(d.expenseCategory)
        ? d.expenseCategory : p.expenseCategory,
      cost:        d.cost != null ? String(round2(conv(d.cost))) : p.cost,
      date:        d.date ? d.date.split('T')[0] : p.date,
      description: d.description ?? p.description,
      notes:       d.notes ?? p.notes,
    }))

    if (needsConvert) return `Amounts converted from ${detected}.`
    if (detectedRaw && !detected) return `Couldn't recognise currency (${detectedRaw}).`
    return ''
  }

  const applyPreset = (preset: FreqPreset) => {
    setFreqPreset(preset)
    if (preset === 'Monthly')        setForm((p) => ({ ...p, recurrenceInterval: 'Months', recurrenceEvery: '1' }))
    else if (preset === 'Yearly')    setForm((p) => ({ ...p, recurrenceInterval: 'Years',  recurrenceEvery: '1' }))
    else if (preset === 'Quarterly') setForm((p) => ({ ...p, recurrenceInterval: 'Months', recurrenceEvery: '3' }))
  }

  const handleSave = async () => {
    if (isCreate && !form.vehicleId)  { setSubmitError('Please select a vehicle.'); return }
    if (!form.expenseCategory)        { setSubmitError('Please select a category.'); return }
    if (!form.cost)                   { setSubmitError('Please enter an amount.'); return }
    setSubmitError(null)
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        expenseCategory: form.expenseCategory,
        cost:            toPLN(parseFloat(form.cost), currency),
        date:            new Date(form.date).toISOString(),
        description:     form.description || null,
        notes:           form.notes || null,
        isRecurring:     form.isRecurring,
      }
      if (!form.isRecurring) {
        body.recurrenceInterval = null
        body.recurrenceEvery    = null
        body.recurrenceEndDate  = null
      } else {
        body.recurrenceInterval = form.recurrenceInterval
        body.recurrenceEvery    = parseInt(form.recurrenceEvery, 10) || 1
        body.recurrenceEndDate  = form.recurrenceEndDate
          ? new Date(form.recurrenceEndDate).toISOString()
          : null
      }
      if (isCreate) {
        body.vehicleId = parseInt(form.vehicleId, 10)
        await createGeneralExpense(body)
      } else {
        await updateGeneralExpense(expenseId!, body)
      }
      invalidate()
      onSaved()
    } catch {
      // global ErrorSnackbar handles it
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!expense) return
    setDeleting(true)
    try {
      await deleteGeneralExpense(expenseId!)
      removeGeneralExpense(expense.generalExpenseId)
      onSaved()
    } finally {
      setDeleting(false)
    }
  }

  // ── derived display values ────────────────────────────────────────────────────

  const vehicle      = vehicles.find((v) => v.vehicleId === expense?.vehicleId)
  const vehicleName  = vehicle ? `${vehicle.brand} ${vehicle.model}` : null
  const catColor     = CATEGORY_COLORS[expense?.expenseCategory ?? ''] ?? 'var(--text2)'
  const catLabel     = CATEGORY_LABELS[expense?.expenseCategory ?? ''] ?? (expense?.expenseCategory ?? 'Expense')
  const CatIcon: ElementType = EXPENSE_CATEGORY_ICONS[expense?.expenseCategory ?? ''] ?? EXPENSE_CATEGORY_ICONS.Other

  const formattedDate = expense?.date
    ? new Date(expense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  const nextDate = expense?.nextOccurrenceDate
    ? new Date(expense.nextOccurrenceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null
  const endDate = expense?.recurrenceEndDate
    ? new Date(expense.recurrenceEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const title = isCreate ? 'Add Expense' : mode === 'form' ? 'Edit Expense' : catLabel

  // ── shared style helpers ──────────────────────────────────────────────────────

  const monoLabel = (text: string, optional?: boolean) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)',
      textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 5,
    }}>
      {text}
      {optional && (
        <span style={{
          fontSize: 8, color: 'var(--text3)', background: 'var(--surface)',
          border: '1px solid var(--border)', padding: '1px 4px', borderRadius: 3,
        }}>
          opt
        </span>
      )}
    </div>
  )

  const inputCss: React.CSSProperties = {
    width: '100%', padding: '9px 11px', borderRadius: 10, boxSizing: 'border-box',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
  }

  const divider = <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 12px' }} />

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300 }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(480px, 92vw)', maxHeight: '90vh',
        background: 'var(--surface)', borderRadius: 20,
        border: '1px solid var(--border)', zIndex: 301,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '15px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'form' && !isCreate && (
              <button
                onClick={() => { setMode('detail'); setSubmitError(null); setConfirmDelete(false) }}
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
                  padding: '3px 5px', display: 'flex', alignItems: 'center',
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 15 }} />
              </button>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
              {mode === 'detail' && expense && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                  color: 'var(--text3)', marginTop: 1,
                }}>
                  {formattedDate}{vehicleName ? ` · ${vehicleName}` : ''}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
              padding: '4px 6px', display: 'flex', alignItems: 'center',
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

          {loadingEntry ? (
            <div style={{
              textAlign: 'center', padding: '48px 0',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)',
            }}>
              Loading…
            </div>

          ) : mode === 'detail' && expense ? (
            // ─── DETAIL MODE ────────────────────────────────────────────────────
            <>
              {/* Hero card — cost + category + recurring */}
              <div style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '14px 16px', marginBottom: 14,
              }}>
                {/* Date + vehicle */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
                  }}>
                    {formattedDate}
                  </div>
                  {vehicleName && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
                    }}>
                      <DirectionsCarIcon sx={{ fontSize: 12 }} />
                      {vehicleName}
                    </div>
                  )}
                </div>

                {/* Category pill + amount */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: `color-mix(in srgb, ${catColor} 18%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${catColor} 35%, transparent)`,
                    borderRadius: 999, padding: '6px 12px',
                  }}>
                    <CatIcon sx={{ fontSize: 14, color: catColor }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: catColor }}>{catLabel}</span>
                  </div>
                  <span style={{
                    fontSize: 32, fontWeight: 800, lineHeight: 1,
                    color: 'var(--text)', letterSpacing: '-0.02em',
                  }}>
                    {formatMoney(expense.cost, currency)}
                  </span>
                </div>

                {/* Recurring / one-off badge */}
                {expense.isRecurring ? (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600,
                    color: 'var(--accent4)',
                    background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
                    padding: '3px 8px', borderRadius: 4, letterSpacing: '0.06em',
                  }}>
                    ↻ RECURRING · every {expense.recurrenceEvery} {(expense.recurrenceInterval ?? '').toLowerCase()}
                  </div>
                ) : (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600,
                    color: 'var(--text3)',
                    background: 'rgba(123,128,168,0.08)', border: '1px solid rgba(123,128,168,0.2)',
                    padding: '3px 8px', borderRadius: 4, letterSpacing: '0.06em',
                  }}>
                    ONE-OFF
                  </div>
                )}
              </div>

              {/* Details rows */}
              {(expense.description || expense.notes || (expense.isRecurring && nextDate) || (expense.isRecurring && endDate)) && (
                <div style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 14, overflow: 'hidden', marginBottom: 14,
                }}>
                  {expense.description && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: '12px 14px', borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{ color: 'var(--text3)', fontSize: 12, flexShrink: 0, paddingRight: 14 }}>
                        Description
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', textAlign: 'right' }}>
                        {expense.description}
                      </span>
                    </div>
                  )}
                  {expense.notes && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: '12px 14px', borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{ color: 'var(--text3)', fontSize: 12, flexShrink: 0, paddingRight: 14 }}>
                        Notes
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', fontStyle: 'italic', textAlign: 'right' }}>
                        {expense.notes}
                      </span>
                    </div>
                  )}
                  {expense.isRecurring && nextDate && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 14px', borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{ color: 'var(--text3)', fontSize: 12 }}>Next occurrence</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{nextDate}</span>
                    </div>
                  )}
                  {expense.isRecurring && endDate && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 14px',
                    }}>
                      <span style={{ color: 'var(--text3)', fontSize: 12 }}>Ends on</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{endDate}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm delete (inline) */}
              {confirmDelete && (
                <div style={{
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                  borderRadius: 12, padding: '12px',
                }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                    color: 'var(--red)', marginBottom: 10, textAlign: 'center',
                  }}>
                    Delete this expense? Cannot be undone.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 10,
                        background: 'var(--surface2)', border: '1px solid var(--border)',
                        color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete} disabled={deleting}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 10,
                        background: 'var(--red)', border: 'none',
                        color: '#fff', fontSize: 12, fontWeight: 600,
                        cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
                      }}
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                  </div>
                </div>
              )}
            </>

          ) : (
            // ─── FORM MODE (create OR edit) ──────────────────────────────────────
            <>
              {submitError && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--red)',
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 8, padding: '8px 12px', marginBottom: 12,
                }}>
                  {submitError}
                </div>
              )}

              {/* Expense receipt scan */}
              <SmartFillButton<ExpenseParseResult>
                target="expense"
                label="Scan receipt to autofill"
                onParsed={handleExpenseParsed}
              />

              {/* Amount — tap-to-enter hero */}
              <div
                onClick={() => amountRef.current?.focus()}
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '14px 16px', marginBottom: 12,
                  textAlign: 'center', cursor: 'text', position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700,
                  color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8,
                }}>
                  Amount
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700,
                    color: form.cost ? 'var(--text2)' : 'var(--text3)',
                  }}>
                    {SYMBOLS[currency]}
                  </span>
                  <span style={{
                    fontSize: 46, fontWeight: 800, lineHeight: 1,
                    color: form.cost ? 'var(--text)' : 'var(--text3)',
                  }}>
                    {form.cost ? parseFloat(form.cost).toLocaleString() : '0'}
                  </span>
                </div>
                {!form.cost && (
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                    color: 'var(--text3)', marginTop: 6,
                  }}>
                    tap to enter
                  </div>
                )}
                <input
                  ref={amountRef}
                  type="text"
                  inputMode="decimal"
                  value={form.cost}
                  onChange={set('cost')}
                  style={{ position: 'absolute', opacity: 0, width: 1, height: 1, top: 0, left: 0 }}
                />
              </div>

              {/* Category grid */}
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700,
                  color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10,
                }}>
                  Category
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const Icon: ElementType = EXPENSE_CATEGORY_ICONS[cat] ?? EXPENSE_CATEGORY_ICONS.Other
                    const active = form.expenseCategory === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, expenseCategory: cat }))}
                        style={{
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          gap: 6, padding: '11px 6px',
                          background: active ? 'var(--accent)' : 'var(--surface2)',
                          border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <Icon sx={{ fontSize: 17, color: active ? '#fff' : 'var(--text3)' }} />
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 8, fontWeight: active ? 600 : 400,
                          color: active ? '#fff' : 'var(--text2)',
                          textAlign: 'center', lineHeight: 1.3,
                        }}>
                          {CATEGORY_LABELS[cat] ?? cat}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {divider}

              {/* Vehicle picker — create mode + more than one vehicle */}
              {isCreate && vehicles.length > 1 && (
                <div style={{ marginBottom: 12 }}>
                  {monoLabel('Vehicle')}
                  <select
                    value={form.vehicleId}
                    onChange={set('vehicleId')}
                    style={{
                      ...inputCss,
                      color: form.vehicleId ? 'var(--text)' : 'var(--text3)',
                    }}
                  >
                    <option value="">Select a vehicle…</option>
                    {vehicles.map((v) => (
                      <option key={v.vehicleId} value={String(v.vehicleId)}>
                        {v.brand} {v.model} ({v.yearOfProduction})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date + Description */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div>
                  {monoLabel('Date')}
                  <input type="date" value={form.date} onChange={set('date')} style={inputCss} />
                </div>
                <div>
                  {monoLabel('Description', true)}
                  <input
                    type="text" value={form.description} onChange={set('description')}
                    placeholder="OC annual…" style={inputCss}
                  />
                </div>
              </div>

              {/* Recurring toggle */}
              <div style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: form.isRecurring ? '14px 14px 0 0' : 14,
                padding: '12px 14px', marginBottom: form.isRecurring ? 0 : 12,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Recurring expense</div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                    color: 'var(--text3)', marginTop: 2,
                  }}>
                    Insurance, tax, subscriptions...
                  </div>
                </div>
                <Toggle
                  on={form.isRecurring}
                  onToggle={() => setForm((p) => ({ ...p, isRecurring: !p.isRecurring }))}
                />
              </div>

              {/* Recurrence options */}
              {form.isRecurring && (
                <div style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)', borderTop: 'none',
                  borderRadius: '0 0 14px 14px', padding: '10px 14px 12px', marginBottom: 12,
                }}>
                  {/* Preset chips */}
                  <div style={{
                    display: 'flex', gap: 6, flexWrap: 'wrap',
                    marginBottom: freqPreset === 'Custom' ? 10 : 0,
                  }}>
                    {(['Monthly', 'Yearly', 'Quarterly', 'Custom'] as FreqPreset[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => applyPreset(p)}
                        style={{
                          padding: '5px 12px', borderRadius: 999,
                          background: freqPreset === p ? 'var(--accent)' : 'transparent',
                          border: `1px solid ${freqPreset === p ? 'var(--accent)' : 'var(--border)'}`,
                          color: freqPreset === p ? '#fff' : 'var(--text2)',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9, fontWeight: freqPreset === p ? 600 : 400,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {p === 'Custom' ? 'Custom…' : p}
                      </button>
                    ))}
                  </div>

                  {freqPreset === 'Custom' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        {monoLabel('Every')}
                        <input
                          type="number" min="1" max="365"
                          value={form.recurrenceEvery}
                          onChange={set('recurrenceEvery')}
                          placeholder="1"
                          style={inputCss}
                        />
                      </div>
                      <div>
                        {monoLabel('Interval')}
                        <select value={form.recurrenceInterval} onChange={set('recurrenceInterval')} style={inputCss}>
                          {RECURRENCE_INTERVALS.map((ri) => (
                            <option key={ri} value={ri}>{ri}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div style={{ marginBottom: 4 }}>
                {monoLabel('Notes', true)}
                <textarea
                  value={form.notes}
                  onChange={set('notes')}
                  placeholder="Any extra info..."
                  rows={3}
                  style={{ ...inputCss, resize: 'none', lineHeight: 1.5 }}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!loadingEntry && (
          <div style={{ padding: '10px 18px 18px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {mode === 'form' ? (
              <button
                onClick={handleSave} disabled={saving}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s',
                }}
              >
                {saving ? 'Saving…' : isCreate ? 'Save Expense' : 'Save Changes'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setMode('form'); setConfirmDelete(false) }}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 12,
                    background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)',
                    color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Edit expense
                </button>
                {!confirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      padding: '11px 16px', borderRadius: 12,
                      background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                      color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
