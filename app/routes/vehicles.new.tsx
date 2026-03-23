import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createVehicle } from '@/features/vehicles/api'
import { ErrorBanner } from '@/ui/AsyncStates'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'
import { backBtnStyle, labelStyle } from '@/styles/pageStyles'
import {
  FUEL_TYPES,
  TRANSMISSION_TYPES,
  ENGINE_TYPES,
  VEHICLE_TYPES,
} from '@/lib/enums'

export default function AddVehicle() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    brand: '',
    model: '',
    yearOfProduction: '',
    mileage: '',
    fuelType: 'Petrol95',
    transmissionType: 'Manual',
    engineType: 'Petrol',
    vehicleType: 'Sedan',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await createVehicle({
        ...form,
        yearOfProduction: Number.parseInt(form.yearOfProduction, 10),
        mileage: Number.parseInt(form.mileage, 10),
      })
      navigate('/carpark')
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to add vehicle.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      <button onClick={() => navigate('/carpark')} style={backBtnStyle}>
        {'<-'} Car Park
      </button>

      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Add Vehicle</div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '0 22px' }}>
        {error && <ErrorBanner message={error} />}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Brand</label>
            <input
              value={form.brand}
              onChange={set('brand')}
              placeholder="BMW"
              required
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
          <div>
            <label style={labelStyle}>Model</label>
            <input
              value={form.model}
              onChange={set('model')}
              placeholder="3 Series 320d"
              required
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Year</label>
            <input
              type="number"
              value={form.yearOfProduction}
              onChange={set('yearOfProduction')}
              placeholder="2019"
              min="1900"
              max={new Date().getFullYear()}
              required
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
          <div>
            <label style={labelStyle}>Mileage (km)</label>
            <input
              type="number"
              value={form.mileage}
              onChange={set('mileage')}
              placeholder="187320"
              min="0"
              required
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Fuel Type</label>
          <select
            value={form.fuelType}
            onChange={set('fuelType')}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            {FUEL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Transmission</label>
          <select
            value={form.transmissionType}
            onChange={set('transmissionType')}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            {TRANSMISSION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Engine Type</label>
          <select
            value={form.engineType}
            onChange={set('engineType')}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            {ENGINE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Vehicle Type</label>
          <select
            value={form.vehicleType}
            onChange={set('vehicleType')}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 12,
            background: loading ? 'var(--surface3)' : 'var(--accent)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 8,
          }}
        >
          {loading ? 'Saving...' : 'Add Vehicle'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/carpark')}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 12,
            background: 'var(--surface2)',
            color: 'var(--accent)',
            fontSize: 15,
            fontWeight: 600,
            border: '1px solid rgba(108,99,255,0.3)',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </form>
    </div>
  )
}
