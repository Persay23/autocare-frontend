import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import ActionButton from '../components/shared/ActionButton'
import { createFuelEntry } from '../api/fuel'
import { getVehicles } from '../api/vehicles'
import { ErrorBanner } from '../components/shared/AsyncStates'
import { backBtnStyle } from '../styles/pageStyles'
import FormInput from '../components/shared/FormInput'
import { FUEL_TYPES } from '../constants/enums'
import type { Vehicle } from '../types'

export default function CreateFuelEntry() {
  const { vehicleId: vehicleIdFromUrl } = useParams()
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [form, setForm] = useState({
    vehicleId: vehicleIdFromUrl ?? '',
    fuelType: '',
    refillDate: new Date().toISOString().split('T')[0],
    amount: '',
    cost: '',
    mileage: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (vehicleIdFromUrl) return

    getVehicles()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : []
        setVehicles(list)
        if (list.length === 1) {
          setForm((prev) => ({ ...prev, vehicleId: String(list[0].vehicleId) }))
        }
      })
      .catch(() => setError('Failed to load vehicles.'))
  }, [vehicleIdFromUrl])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const targetVehicleId = vehicleIdFromUrl ?? form.vehicleId
  const backPath = targetVehicleId ? `/vehicles/${targetVehicleId}/fuel` : '/'

  const pricePerL =
    form.amount && form.cost ? (Number.parseFloat(form.cost) / Number.parseFloat(form.amount)).toFixed(2) : null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!targetVehicleId) {
      setError('Please select a vehicle.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      await createFuelEntry({
        vehicleId: Number.parseInt(targetVehicleId, 10),
        fuelType: form.fuelType,
        refillDate: new Date(form.refillDate).toISOString(),
        amount: Number.parseFloat(form.amount),
        cost: Number.parseFloat(form.cost),
        mileage: form.mileage ? Number.parseInt(form.mileage, 10) : 0,
        notes: form.notes || null,
      })
      navigate(`/vehicles/${targetVehicleId}/fuel`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to save fuel entry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <button onClick={() => navigate(backPath)} style={backBtnStyle}>
        {targetVehicleId ? '<- Fuel' : '<- Home'}
      </button>
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Log Fuel Refill</div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>
          {!vehicleIdFromUrl && (
            <FormInput label="Vehicle" value={form.vehicleId} onChange={set('vehicleId')} required>
              <option value="">Select a vehicle...</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                  {vehicle.brand} {vehicle.model} ({vehicle.yearOfProduction})
                </option>
              ))}
            </FormInput>
          )}

          <FormInput label="Fuel Type" value={form.fuelType} onChange={set('fuelType')} required>
            <option value="">Select a fuel type...</option>
            {FUEL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </FormInput>

          <FormInput
            label="Date"
            type="date"
            value={form.refillDate}
            onChange={set('refillDate')}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <FormInput
              label="Amount (L)"
              type="number"
              value={form.amount}
              onChange={set('amount')}
              placeholder="45"
              min="0"
              required
            />
            <FormInput
              label="Cost (zl)"
              type="number"
              value={form.cost}
              onChange={set('cost')}
              placeholder="280.00"
              min="0"
              required
            />
          </div>

          <FormInput
            label="Mileage at refill (km)"
            type="number"
            value={form.mileage}
            onChange={set('mileage')}
            placeholder="187300"
            min="0"
          />
          <FormInput
            label="Station / Notes"
            type="text"
            value={form.notes}
            onChange={set('notes')}
            placeholder="Orlen A4"
          />

          {pricePerL && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(108,99,255,0.06)',
                border: '1px solid rgba(108,99,255,0.15)',
                borderRadius: 8,
                padding: '9px 12px',
                marginBottom: 10,
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)' }}>
                Price / litre (calculated)
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent3)' }}>{pricePerL} zl/L</span>
            </div>
          )}
        </div>

        <ActionButton type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Refill'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="secondary" onClick={() => navigate(backPath)}>
          Cancel
        </ActionButton>
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}
