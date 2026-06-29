import { useState, useEffect } from 'react'
import ActionButton from '@/ui/ActionButton'
import { createVehicle, getVehicleById, updateVehicle } from '@/features/vehicles/api'
import { useVehiclesStore } from '@/features/vehicles/vehicleStore'
import { LoadingText, ErrorBanner } from '@/ui/AsyncStates'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'
import { FUEL_TYPES, TRANSMISSION_TYPES, ENGINE_TYPES, VEHICLE_TYPES, ENGINE_TYPE_FOR_FUEL_TYPE } from '@/shared/enums'
import { formatEnumLabel } from '@/shared/formatters'
import SmartFillButton from '@/features/ai/SmartFillButton'
import type { VehicleParseResult } from '@/shared/types'
import CloseIcon from '@mui/icons-material/Close'

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

const EMPTY_FORM: VehicleForm = {
  brand: '', model: '',
  yearOfProduction: '', mileage: '',
  fuelType: 'Petrol95', transmissionType: 'Manual',
  engineType: 'Petrol', vehicleType: 'Sedan',
}

const fieldLabel = (text: string) => (
  <div style={{
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
    textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6,
  }}>
    {text}
  </div>
)

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

interface Props {
  vehicleId: number | null   // null = create mode
  onClose: () => void
  onSaved: () => void
}

export default function VehicleModal({ vehicleId, onClose, onSaved }: Props) {
  const isCreate = vehicleId == null
  const invalidate      = useVehiclesStore((s) => s.invalidate)
  const refetchVehicles = useVehiclesStore((s) => s.fetch)

  const [form, setForm]       = useState<VehicleForm | null>(isCreate ? EMPTY_FORM : null)
  const [loading, setLoading] = useState(!isCreate)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [showMoreFuel, setShowMoreFuel]       = useState(false)
  const [showMoreTrans, setShowMoreTrans]     = useState(false)
  const [showMoreEngine, setShowMoreEngine]   = useState(false)
  const [showMoreVehicle, setShowMoreVehicle] = useState(false)

  useEffect(() => {
    if (isCreate) return
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
  }, [vehicleId, isCreate])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev)
  const pick = (field: string) => (v: string) =>
    setForm((prev) => {
      if (!prev) return prev
      const next = { ...prev, [field]: v }
      if (field === 'fuelType') {
        const derived = ENGINE_TYPE_FOR_FUEL_TYPE[v]
        if (derived) next.engineType = derived
      }
      return next
    })

  // Pre-fill from a scanned registration document / spec sheet.
  const handleVehicleParsed = (d: VehicleParseResult): string => {
    if (d.vehicleType && VEHICLE_EXT.includes(d.vehicleType)) setShowMoreVehicle(true)
    if (d.transmissionType && TRANS_EXT.includes(d.transmissionType)) setShowMoreTrans(true)
    if (d.engineType && ENGINE_EXT.includes(d.engineType)) setShowMoreEngine(true)
    if (d.fuelType && FUEL_EXT.includes(d.fuelType)) setShowMoreFuel(true)

    setForm((prev) => {
      const p = prev ?? EMPTY_FORM
      return {
        ...p,
        brand:            d.brand ?? p.brand,
        model:            d.model ?? p.model,
        yearOfProduction: d.yearOfProduction != null ? String(d.yearOfProduction) : p.yearOfProduction,
        mileage:          d.mileage != null ? String(d.mileage) : p.mileage,
        vehicleType:      d.vehicleType && VEHICLE_TYPES.includes(d.vehicleType) ? d.vehicleType : p.vehicleType,
        transmissionType: d.transmissionType && TRANSMISSION_TYPES.includes(d.transmissionType) ? d.transmissionType : p.transmissionType,
        engineType:       d.engineType && ENGINE_TYPES.includes(d.engineType) ? d.engineType : p.engineType,
        fuelType:         d.fuelType && (FUEL_TYPES as readonly string[]).includes(d.fuelType) ? d.fuelType : p.fuelType,
      }
    })
    return ''
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    setError(null)
    setSaving(true)
    try {
      const payload = {
        brand: form.brand,
        model: form.model,
        yearOfProduction: Number.parseInt(String(form.yearOfProduction), 10),
        mileage: Number.parseInt(String(form.mileage), 10),
        fuelType: form.fuelType,
        transmissionType: form.transmissionType,
        engineType: form.engineType,
        vehicleType: form.vehicleType,
      }
      if (isCreate) await createVehicle(payload)
      else          await updateVehicle(vehicleId!, payload)
      invalidate()
      refetchVehicles()
      onSaved()
    } catch {
      // global ErrorSnackbar handles it
    } finally {
      setSaving(false)
    }
  }

  const heroName = form
    ? ([form.brand, form.model].filter(Boolean).join(' ') || 'New Vehicle')
    : ''
  const heroSub = form
    ? [
        form.yearOfProduction ? String(form.yearOfProduction) : null,
        form.fuelType ? eLabel(form.fuelType) : null,
        form.transmissionType ? eLabel(form.transmissionType) : null,
      ].filter(Boolean).join(' · ')
    : ''

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300 }}
      />

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(560px, 96vw)', maxHeight: '92vh',
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
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
            {isCreate ? 'Add Vehicle' : 'Edit Vehicle'}
          </div>
          <button onClick={onClose} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
            padding: '4px 6px', display: 'flex', alignItems: 'center',
          }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ overflowY: 'auto' }}>
          {loading && <LoadingText />}

          {!loading && !form && (
            <div style={{ padding: '20px 18px', color: 'var(--text2)' }}>
              {error ?? 'Vehicle not found.'}
            </div>
          )}

          {!loading && form && (
            <>
              {/* Hero */}
              <div style={{ padding: '16px 18px 14px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 14, flexShrink: 0,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                }}>
                  🚗
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
                    {heroName}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                    color: heroSub ? 'var(--text2)' : 'var(--text3)',
                  }}>
                    {heroSub || 'Fill in the details below'}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: '0 18px' }}>
                {error && <ErrorBanner message={error} />}

                {/* Registration document scan */}
                <SmartFillButton<VehicleParseResult>
                  target="vehicle"
                  label="Scan registration to autofill"
                  onParsed={handleVehicleParsed}
                />

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
                  {saving ? 'Saving...' : isCreate ? 'Add Vehicle' : 'Save changes'}
                </ActionButton>
                <div style={{ height: 8 }} />
                <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
                <div style={{ height: 20 }} />
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}
