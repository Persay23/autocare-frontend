import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getVehicleById, updateVehicle } from '@/features/vehicles/api'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { LoadingText, ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'
import { FUEL_TYPES, TRANSMISSION_TYPES, ENGINE_TYPES, VEHICLE_TYPES } from '@/lib/enums'
import { formatEnumLabel } from '@/lib/formatters'

const LABEL_OVERRIDES: Record<string, string> = {
  Petrol95: 'Petrol 95', Petrol98: 'Petrol 98', PremiumDiesel: 'Premium Diesel',
  SemiAutomatic: 'Semi-auto', FullElectric: 'Electric', PlugInHybrid: 'Plug-in',
  LPG: 'LPG', CNG: 'CNG', E85: 'E85', CVT: 'CVT', DCT: 'DCT', SUV: 'SUV', MPV: 'MPV',
}
const eLabel = (t: string) => LABEL_OVERRIDES[t] ?? formatEnumLabel(t)

const FUEL_ALL = Array.from(FUEL_TYPES) as string[]
const FUEL_PRI = ['Petrol95', 'Petrol98', 'Diesel', 'LPG', 'Electric', 'Hybrid']
const FUEL_EXT = FUEL_ALL.filter((t) => !FUEL_PRI.includes(t))

const TRANS_PRI = ['Manual', 'Automatic', 'SemiAutomatic']
const TRANS_EXT = TRANSMISSION_TYPES.filter((t) => !TRANS_PRI.includes(t))

const ENGINE_PRI = ['Petrol', 'Diesel', 'FullElectric', 'Hybrid']
const ENGINE_EXT = ENGINE_TYPES.filter((t) => !ENGINE_PRI.includes(t))

const VEHICLE_PRI = ['Sedan', 'Hatchback', 'SUV', 'Estate']
const VEHICLE_EXT = VEHICLE_TYPES.filter((t) => !VEHICLE_PRI.includes(t))

interface VehicleForm {
  brand: string; model: string
  yearOfProduction: string | number; mileage: string | number
  fuelType: string; transmissionType: string
  engineType: string; vehicleType: string
}

const fieldLabel = (text: string) => (
  <div style={{
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
    textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6,
  }}>
    {text}
  </div>
)

function BigInput({ value, onChange, placeholder }: {
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{
      background: 'var(--surface2)',
      border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
      boxShadow: focused ? '0 0 0 3px rgba(108,99,255,0.12)' : 'none',
      borderRadius: 14, padding: '14px 16px',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      display: 'flex', alignItems: 'baseline', gap: 6,
    }}>
      <input
        type="number" value={value} onChange={onChange} placeholder={placeholder} min="0"
        style={{
          background: 'none', border: 'none', outline: 'none',
          color: 'var(--text)', fontSize: 28, fontWeight: 700,
          width: '100%', padding: 0,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 600, flexShrink: 0 }}>km</span>
    </div>
  )
}

export default function EditVehicle() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => location.key !== 'default' ? navigate(-1) : navigate(`/vehicles/${vehicleId}`)
  const invalidate = useVehiclesStore((s) => s.invalidate)

  const [form, setForm] = useState<VehicleForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMoreFuel, setShowMoreFuel] = useState(false)
  const [showMoreTrans, setShowMoreTrans] = useState(false)
  const [showMoreEngine, setShowMoreEngine] = useState(false)
  const [showMoreVehicle, setShowMoreVehicle] = useState(false)

  useEffect(() => {
    let cancelled = false
    getVehicleById(vehicleId!)
      .then((res) => {
        if (cancelled) return
        const v = res.data
        setForm({
          brand: v.brand ?? '',
          model: v.model ?? '',
          yearOfProduction: v.yearOfProduction ?? '',
          mileage: v.mileage ?? '',
          fuelType: v.fuelType ?? 'Petrol95',
          transmissionType: v.transmissionType ?? 'Manual',
          engineType: v.engineType ?? 'Petrol',
          vehicleType: v.vehicleType ?? 'Sedan',
        })
      })
      .catch(() => { if (!cancelled) setError('Failed to load vehicle.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [vehicleId])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev)
  const pick = (field: string) => (v: string) =>
    setForm((prev) => prev ? { ...prev, [field]: v } : prev)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    setError(null)
    setSaving(true)
    try {
      await updateVehicle(vehicleId!, {
        brand: form.brand,
        model: form.model,
        yearOfProduction: Number.parseInt(String(form.yearOfProduction), 10),
        mileage: Number.parseInt(String(form.mileage), 10),
        fuelType: form.fuelType,
        transmissionType: form.transmissionType,
        engineType: form.engineType,
        vehicleType: form.vehicleType,
      })
      invalidate()
      goBack()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to update vehicle.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageShell><LoadingText /></PageShell>
  if (!form) return <PageShell><div style={{ padding: 22, color: 'var(--text2)' }}>Vehicle not found.</div></PageShell>

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '8px 13px', borderRadius: 999,
    background: active ? 'var(--accent)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    color: active ? '#fff' : 'var(--text2)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, fontWeight: active ? 600 : 400,
    cursor: 'pointer', transition: 'all 0.15s',
  })

  const chipGroup = (
    all: string[], pri: string[], ext: string[],
    value: string, onPick: (v: string) => void,
    showMore: boolean, setMore: (b: boolean) => void,
  ) => {
    const showAll = showMore || ext.includes(value)
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(showAll ? all : pri).map((o) => (
          <button key={o} type="button" onClick={() => onPick(o)} style={chip(value === o)}>
            {eLabel(o)}
          </button>
        ))}
        {!showAll && ext.length > 0 && (
          <button type="button" onClick={() => setMore(true)} style={chip(false)}>
            + {ext.length} more
          </button>
        )}
      </div>
    )
  }

  const heroSub = [
    form.yearOfProduction ? String(form.yearOfProduction) : null,
    form.fuelType ? eLabel(form.fuelType) : null,
    form.transmissionType ? eLabel(form.transmissionType) : null,
  ].filter(Boolean).join(' · ')

  const sectionHead = (title: string) => (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
      color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.14em',
      marginBottom: 12,
    }}>
      {title}
    </div>
  )

  const divider = <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 18px' }} />

  return (
    <PageShell>
      <button onClick={goBack} style={backBtnStyle}>← Back</button>

      {/* Hero */}
      <div style={{ padding: '4px 22px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 14, flexShrink: 0,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
        }}>
          🚗
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
            {form.brand} {form.model}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: 'var(--text2)', marginBottom: 6,
          }}>
            {heroSub}
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
            □ Add photo
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '0 22px' }}>
        {error && <ErrorBanner message={error} />}

        {sectionHead('Identity')}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div>
            {fieldLabel('Brand')}
            <input value={form.brand} onChange={set('brand')} placeholder="BMW" required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>
          <div>
            {fieldLabel('Model')}
            <input value={form.model} onChange={set('model')} placeholder="3 Series 320d" required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div>
            {fieldLabel('Year')}
            <input
              type="number" value={form.yearOfProduction} onChange={set('yearOfProduction')}
              placeholder="2019" min="1900" max={new Date().getFullYear()}
              required style={inputStyle} onFocus={onFocus} onBlur={onBlur}
            />
          </div>
          <div>
            {fieldLabel('Vehicle type')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(showMoreVehicle || VEHICLE_EXT.includes(form.vehicleType) ? VEHICLE_TYPES : VEHICLE_PRI).map((t) => (
                <button key={t} type="button" onClick={() => pick('vehicleType')(t)} style={{ ...chip(form.vehicleType === t), padding: '6px 10px', fontSize: 10 }}>
                  {eLabel(t)}
                </button>
              ))}
              {!showMoreVehicle && !VEHICLE_EXT.includes(form.vehicleType) && (
                <button type="button" onClick={() => setShowMoreVehicle(true)} style={{ ...chip(false), padding: '6px 10px', fontSize: 10 }}>···</button>
              )}
            </div>
          </div>
        </div>

        {divider}
        {sectionHead('Drivetrain')}

        <div style={{ marginBottom: 12 }}>
          {fieldLabel('Fuel type')}
          {chipGroup(FUEL_ALL, FUEL_PRI, FUEL_EXT, form.fuelType, pick('fuelType'), showMoreFuel, setShowMoreFuel)}
        </div>

        <div style={{ marginBottom: 12 }}>
          {fieldLabel('Transmission')}
          {chipGroup(TRANSMISSION_TYPES, TRANS_PRI, TRANS_EXT, form.transmissionType, pick('transmissionType'), showMoreTrans, setShowMoreTrans)}
        </div>

        <div style={{ marginBottom: 14 }}>
          {fieldLabel('Engine type')}
          {chipGroup(ENGINE_TYPES, ENGINE_PRI, ENGINE_EXT, form.engineType, pick('engineType'), showMoreEngine, setShowMoreEngine)}
        </div>

        {divider}
        {sectionHead('Current Mileage')}

        <BigInput
          value={form.mileage}
          onChange={set('mileage')}
          placeholder="190 500"
        />

        <div style={{ height: 20 }} />

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
