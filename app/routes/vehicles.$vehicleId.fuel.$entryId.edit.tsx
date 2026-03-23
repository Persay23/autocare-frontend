import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getFuelById, updateFuelEntry, deleteFuelEntry } from '@/features/fuel/api'
import { LoadingText, ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import FormInput from '@/ui/FormInput'
import { FUEL_TYPES } from '@/lib/enums'

export default function EditFuelEntry() {
  const { vehicleId, entryId } = useParams()
  const navigate = useNavigate()
  interface FuelForm { fuelType: string; refillDate: string; amount: string | number; cost: string | number; mileage: string | number; notes: string }

  const [form, setForm] = useState<FuelForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getFuelById(entryId!).then((res) => {
      const e = res.data
      setForm({
        fuelType: e.fuelType ?? '', // should be already chosen, if it was created as petrol then it should stay petrol by default, unless user wants to change it
        refillDate: e.refillDate ? e.refillDate.split('T')[0] : '',
        amount: e.amount ?? '',
        cost: e.cost ?? '',
        mileage: e.mileage ?? '',
        notes: e.notes ?? '',
      })
    }).finally(() => setLoading(false))
  }, [entryId])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev)

  const pricePerL = form?.amount && form?.cost
    ? (parseFloat(String(form.cost)) / parseFloat(String(form.amount))).toFixed(2)
    : null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    setError(null)
    setSaving(true)
    try {
      await updateFuelEntry(entryId!, {
        fuelType: form.fuelType,
        refillDate: new Date(form.refillDate).toISOString(),
        amount: parseFloat(String(form.amount)),
        cost: parseFloat(String(form.cost)),
        mileage: form.mileage ? Number.parseInt(String(form.mileage), 10) : 0,
        notes: form.notes || null,
      })
      navigate(`/vehicles/${vehicleId}/fuel/${entryId}`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to update entry.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this fuel entry?')) return
    await deleteFuelEntry(entryId!)
    navigate(`/vehicles/${vehicleId}/fuel`)
  }

  if (loading || !form) return <PageShell><LoadingText /></PageShell>

  return (
    <PageShell>
      <button onClick={() => navigate(`/vehicles/${vehicleId}/fuel/${entryId}`)} style={backBtnStyle}>
        ← Fuel Entry
      </button>
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Edit Fuel Entry</div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>
          <FormInput label="Fuel Type" value={form.fuelType} onChange={set('fuelType')}>
            {FUEL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FormInput>
          <FormInput label="Date" type="date" value={form.refillDate} onChange={set('refillDate')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <FormInput label="Amount (L)" type="number" value={form.amount} onChange={set('amount')} min="0" />
            <FormInput label="Cost (zł)" type="number" value={form.cost} onChange={set('cost')} min="0" />
          </div>
          <FormInput label="Mileage (km)" type="number" value={form.mileage} onChange={set('mileage')} min="0" />
          <FormInput label="Station / Notes" type="text" value={form.notes} onChange={set('notes')} />

          {pricePerL && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)',
              borderRadius: 8, padding: '9px 12px', marginBottom: 10,
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)' }}>
                Price / litre (calculated)
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent3)' }}>
                {pricePerL} zł/L
              </span>
            </div>
          )}
        </div>

        <ActionButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/fuel/${entryId}`)}>
          Cancel
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="danger" onClick={handleDelete}>
          Delete Entry
        </ActionButton>
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}
