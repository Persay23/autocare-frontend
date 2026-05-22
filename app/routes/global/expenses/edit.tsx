import { useState, useEffect, useRef, type ElementType } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getGeneralExpenseById, updateGeneralExpense } from '@/features/expenses/api'
import { useExpensesStore } from '@/features/expenses/expensesStore'
import { LoadingText, ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'
import { useCurrencyStore, SYMBOLS, toPLN, RATES } from '@/features/currency/currencyStore'
import { EXPENSE_CATEGORIES, RECURRENCE_INTERVALS } from '@/lib/enums'
import { EXPENSE_CATEGORY_ICONS } from '@/lib/icons'
import type { GeneralExpense } from '@/lib/types'

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

type FreqPreset = 'Monthly' | 'Yearly' | 'Quarterly' | 'Custom'

function inferPreset(interval: string, every: string): FreqPreset {
  if (interval === 'Months' && every === '1') return 'Monthly'
  if (interval === 'Years'  && every === '1') return 'Yearly'
  if (interval === 'Months' && every === '3') return 'Quarterly'
  return 'Custom'
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: on ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
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

interface ExpenseForm {
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

export default function EditExpense() {
  const { expenseId } = useParams()
  const navigate      = useNavigate()
  const location      = useLocation()
  const goBack        = () => location.key !== 'default' ? navigate(-1) : navigate('/expenses')
  const amountRef     = useRef<HTMLInputElement>(null)
  const invalidate    = useExpensesStore((s) => s.invalidate)
  const { currency }  = useCurrencyStore()

  const [form, setForm]         = useState<ExpenseForm | null>(null)
  const [freqPreset, setFreqPreset] = useState<FreqPreset>('Yearly')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!expenseId) return
    let cancelled = false
    getGeneralExpenseById(expenseId)
      .then((res) => {
        if (cancelled) return
        const e = res.data as GeneralExpense
        const interval = e.recurrenceInterval ?? 'Years'
        const every    = e.recurrenceEvery != null ? String(e.recurrenceEvery) : '1'
        setFreqPreset(e.isRecurring ? inferPreset(interval, every) : 'Yearly')
        setForm({
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
      .catch(() => { if (!cancelled) setError('Failed to load expense.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [expenseId])

  const set = (field: keyof ExpenseForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => p ? { ...p, [field]: e.target.value } : p)

  const applyPreset = (preset: FreqPreset) => {
    setFreqPreset(preset)
    if (preset === 'Monthly')        setForm((p) => p ? { ...p, recurrenceInterval: 'Months', recurrenceEvery: '1' } : p)
    else if (preset === 'Yearly')    setForm((p) => p ? { ...p, recurrenceInterval: 'Years',  recurrenceEvery: '1' } : p)
    else if (preset === 'Quarterly') setForm((p) => p ? { ...p, recurrenceInterval: 'Months', recurrenceEvery: '3' } : p)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    setError(null)
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
      if (form.isRecurring) {
        body.recurrenceInterval = form.recurrenceInterval
        body.recurrenceEvery    = parseInt(form.recurrenceEvery, 10) || 1
        body.recurrenceEndDate  = form.recurrenceEndDate
          ? new Date(form.recurrenceEndDate).toISOString()
          : null
      } else {
        body.recurrenceInterval = null
        body.recurrenceEvery    = null
        body.recurrenceEndDate  = null
      }
      await updateGeneralExpense(expenseId!, body)
      invalidate()
      goBack()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to update expense.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !form) return <PageShell><LoadingText /></PageShell>

  return (
    <PageShell>
      <button onClick={goBack} style={backBtnStyle}>← Expenses</button>

      {/* Header */}
      <div style={{ padding: '0 22px 16px' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>Edit expense</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>General car cost</div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>

          {/* Amount tap-to-enter */}
          <div
            onClick={() => amountRef.current?.focus()}
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '18px 16px 16px', marginBottom: 12,
              textAlign: 'center', cursor: 'text', position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
              color: 'var(--text3)', textTransform: 'uppercase' as const,
              letterSpacing: '0.14em', marginBottom: 10,
            }}>
              Amount
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700,
                color: form.cost ? 'var(--text2)' : 'var(--text3)',
              }}>
                {SYMBOLS[currency]}
              </span>
              <span style={{
                fontSize: 52, fontWeight: 800, lineHeight: 1,
                color: form.cost ? 'var(--text)' : 'var(--text3)',
              }}>
                {form.cost ? parseFloat(form.cost).toLocaleString() : '0'}
              </span>
            </div>
            {!form.cost && (
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: 'var(--text3)', marginTop: 8,
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
              style={{
                position: 'absolute', opacity: 0,
                width: 1, height: 1, top: 0, left: 0,
              }}
            />
          </div>

          {/* Category grid */}
          <div style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 14, marginBottom: 12,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
              color: 'var(--text3)', textTransform: 'uppercase' as const,
              letterSpacing: '0.14em', marginBottom: 12,
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
                    onClick={() => setForm((p) => p ? { ...p, expenseCategory: cat } : p)}
                    style={{
                      display: 'flex', flexDirection: 'column' as const,
                      alignItems: 'center', justifyContent: 'center',
                      gap: 7, padding: '13px 6px',
                      background: active ? 'var(--accent)' : 'var(--surface)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 14, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <Icon sx={{ fontSize: 18, color: active ? '#fff' : 'var(--text3)' }} />
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9, fontWeight: active ? 600 : 400,
                      color: active ? '#fff' : 'var(--text2)',
                      textAlign: 'center' as const, lineHeight: 1.3,
                    }}>
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date + Description — side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                color: 'var(--text3)', textTransform: 'uppercase' as const,
                letterSpacing: '0.1em', marginBottom: 6,
              }}>
                Date
              </div>
              <input
                type="date"
                value={form.date}
                onChange={set('date')}
                required
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                color: 'var(--text3)', textTransform: 'uppercase' as const,
                letterSpacing: '0.1em', marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                Description
                <span style={{
                  fontSize: 8, color: 'var(--text3)', background: 'var(--surface)',
                  border: '1px solid var(--border)', padding: '1px 4px', borderRadius: 3,
                }}>
                  opt
                </span>
              </div>
              <input
                type="text"
                value={form.description}
                onChange={set('description')}
                placeholder="e.g. OC annual..."
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>

          {/* Recurring toggle card */}
          <div style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: form.isRecurring ? '16px 16px 0 0' : 16,
            padding: '14px 16px', marginBottom: form.isRecurring ? 0 : 12,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Recurring expense</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: 'var(--text3)', marginTop: 2,
              }}>
                Insurance, tax, subscriptions...
              </div>
            </div>
            <Toggle
              on={form.isRecurring}
              onToggle={() => setForm((p) => p ? { ...p, isRecurring: !p.isRecurring } : p)}
            />
          </div>

          {form.isRecurring && (
            <div style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)', borderTop: 'none',
              borderRadius: '0 0 16px 16px', padding: '12px 16px 14px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: freqPreset === 'Custom' ? 12 : 0 }}>
                {(['Monthly', 'Yearly', 'Quarterly', 'Custom'] as FreqPreset[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => applyPreset(p)}
                    style={{
                      padding: '7px 14px', borderRadius: 999,
                      background: freqPreset === p ? 'var(--accent)' : 'transparent',
                      border: `1px solid ${freqPreset === p ? 'var(--accent)' : 'var(--border)'}`,
                      color: freqPreset === p ? '#fff' : 'var(--text2)',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10, fontWeight: freqPreset === p ? 600 : 400,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {p === 'Custom' ? 'Custom...' : p}
                  </button>
                ))}
              </div>

              {freqPreset === 'Custom' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
                      textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6,
                    }}>
                      Every
                    </div>
                    <input
                      type="number" min="1" max="365"
                      value={form.recurrenceEvery}
                      onChange={set('recurrenceEvery')}
                      placeholder="1"
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>
                  <div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
                      textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6,
                    }}>
                      Interval
                    </div>
                    <select
                      value={form.recurrenceInterval}
                      onChange={set('recurrenceInterval')}
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    >
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
          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
              color: 'var(--text3)', textTransform: 'uppercase' as const,
              letterSpacing: '0.1em', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              Notes
              <span style={{
                fontSize: 8, color: 'var(--text3)', background: 'var(--surface)',
                border: '1px solid var(--border)', padding: '1px 4px', borderRadius: 3,
              }}>
                opt
              </span>
            </div>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="Any extra info..."
              rows={3}
              style={{ ...inputStyle, resize: 'none' as const, lineHeight: 1.5 }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

        </div>

        <ActionButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="ghost" onClick={goBack}>Cancel</ActionButton>
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}
