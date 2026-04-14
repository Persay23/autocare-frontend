import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import FormInput from '@/ui/FormInput'
import ActionButton from '@/ui/ActionButton'
import { createGeneralExpense } from '@/features/expenses/api'
import { getVehicles } from '@/features/vehicles/api'
import { dedupFetch } from '@/lib/dedup'
import { ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import SmartFillButton from '@/ui/SmartFillButton'
import { EXPENSE_CATEGORIES } from '@/lib/enums'
import { formatEnumLabel } from '@/lib/formatters'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'
import { labelStyle } from '@/styles/pageStyles'
import type { Vehicle } from '@/lib/types'

export default function CreateExpense() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [form, setForm] = useState({
    vehicleId: '',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    dedupFetch('vehicles-list', () => getVehicles())
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res.data) ? res.data : []
        setVehicles(list)
        if (list.length === 1) setForm((p) => ({ ...p, vehicleId: String(list[0].vehicleId) }))
      })
      .catch(() => { if (!cancelled) setError('Failed to load vehicles.') })
    return () => { cancelled = true }
  }, [])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.vehicleId) { setError('Please select a vehicle.'); return }

    setError(null)
    setLoading(true)
    try {
      await createGeneralExpense({
        vehicleId: parseInt(form.vehicleId, 10),
        category: form.category,
        amount: parseFloat(form.amount),
        date: new Date(form.date).toISOString(),
        description: form.description || null,
      })
      navigate('/expenses')
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to save expense.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <button onClick={() => navigate('/expenses')} style={backBtnStyle}>
        {'<-'} Expenses
      </button>

      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>New Expense</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: 'var(--text3)',
          marginTop: 4,
        }}>
          parking, insurance, tolls and more
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>
          <SmartFillButton />

          <FormInput label="Vehicle" value={form.vehicleId} onChange={set('vehicleId')} required>
            <option value="">Select a vehicle...</option>
            {vehicles.map((v) => (
              <option key={v.vehicleId} value={v.vehicleId}>
                {v.brand} {v.model} ({v.yearOfProduction})
              </option>
            ))}
          </FormInput>

          <FormInput label="Category" value={form.category} onChange={set('category')} required>
            <option value="">Select a category...</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{formatEnumLabel(cat)}</option>
            ))}
          </FormInput>

          <FormInput
            label="Amount (zł)"
            type="number"
            value={form.amount}
            onChange={set('amount')}
            placeholder="250.00"
            min="0"
            required
          />

          <FormInput
            label="Date"
            type="date"
            value={form.date}
            onChange={set('date')}
            required
          />

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="e.g., Annual OC insurance renewal"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        </div>

        <ActionButton type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Expense'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="secondary" onClick={() => navigate('/expenses')}>
          Cancel
        </ActionButton>
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}
