import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getFuelById, updateFuelEntry, deleteFuelEntry } from '@/features/fuel/api'
import { dedupFetch } from '@/lib/dedup'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { LoadingText, ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
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
  const [confirmDelete, setConfirmDelete] = useState(false)

  const storeVehicles = useVehiclesStore((s) => s.vehicles)
  const vehicle = storeVehicles.find((v) => v.vehicleId === parseInt(vehicleId ?? '0', 10))
  const minMileage = vehicle && vehicle.mileage > 0 ? vehicle.mileage : undefined
  const mileageError =
    minMileage !== undefined &&
    form?.mileage !== '' &&
    form?.mileage != null &&
    parseInt(String(form.mileage), 10) < minMileage
      ? `Min ${minMileage.toLocaleString()} km · current vehicle odometer`
      : undefined

  useEffect(() => {
    let cancelled = false
    dedupFetch(`fuel-entry-${entryId}`, () => getFuelById(entryId!)).then((res) => {
      if (cancelled) return
      const e = res.data
      setForm({
        fuelType: e.fuelType ?? '',
        refillDate: e.refillDate ? e.refillDate.split('T')[0] : '',
        amount: e.amount ?? '',
        cost: e.cost ?? '',
        mileage: e.mileage ?? '',
        notes: e.notes ?? '',
      })
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [entryId])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev)

  const pricePerL = form?.amount && form?.cost
    ? (parseFloat(String(form.cost)) / parseFloat(String(form.amount))).toFixed(2)
    : null

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form) return
    if (mileageError) { setError(mileageError); return }
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
    await deleteFuelEntry(entryId!)
    navigate(`/vehicles/${vehicleId}/fuel`)
  }

  if (loading || !form) return <PageShell><LoadingText /></PageShell>

  return (
    <PageShell>
      <button onClick={() => navigate(`/vehicles/${vehicleId}/fuel/${entryId}`)} style={backBtnStyle}>
        ← Fuel Entry
      </button>
      <VehicleLabel vehicleId={vehicleId} />
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Edit Fuel Entry</div>
        {form.fuelType && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
            {form.fuelType}{form.refillDate ? ` · ${new Date(form.refillDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
          </div>
        )}
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
          <FormInput label="Mileage (km)" type="number" value={form.mileage} onChange={set('mileage')} min={minMileage ?? 0} error={mileageError} />
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
        {confirmDelete ? (
          <div style={{ padding: '0 22px', marginBottom: 0 }}>
            <div style={{
              background: 'rgba(248,113,113,0.06)',
              border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 12, padding: '14px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 12, textAlign: 'center' }}>
                Delete this fuel entry? This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionButton variant="ghost" style={{ flex: 1, width: 'auto', margin: 0 }} onClick={() => setConfirmDelete(false)}>
                  Cancel
                </ActionButton>
                <ActionButton variant="danger" style={{ flex: 1, width: 'auto', margin: 0 }} onClick={handleDelete}>
                  Yes, Delete
                </ActionButton>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              display: 'block', margin: '0 auto',
              background: 'none', border: 'none',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: 'var(--red)',
              textDecoration: 'underline', cursor: 'pointer',
            }}
          >
            Delete entry
          </button>
        )}
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}
