import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { createFuelEntry, getFuelByVehicle } from '@/features/fuel/api'
import { getRecordsByVehicle } from '@/features/records/api'
import { getVehicles } from '@/features/vehicles/api'
import { getPrecedingMinMileage, isMileageValid, type EventEntry } from '@/lib/mileageBounds'
import { useTimelineStore } from '@/features/timeline/timelineStore'
import { dedupFetch } from '@/lib/dedup'
import { ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import SmartFillButton from '@/ui/SmartFillButton'
import FormInput from '@/ui/FormInput'
import { FUEL_TYPES } from '@/lib/enums'
import { formatEnumLabel } from '@/lib/formatters'
import type { Vehicle } from '@/lib/types'
import { useCurrencyStore, SYMBOLS, toPLN } from '@/features/currency/currencyStore'

const FUEL_LABELS: Record<string, string> = { Petrol95: 'Petrol 95', Petrol98: 'Petrol 98' }
const fuelLabel = (t: string) => FUEL_LABELS[t] ?? formatEnumLabel(t)

function BigInput({ label, value, onChange, placeholder }: {
  label: string
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
      borderRadius: 14, padding: '12px 14px',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
        textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8,
      }}>
        {label}
      </div>
      <input
        type="number" value={value} onChange={onChange} placeholder={placeholder} min="0"
        style={{
          background: 'none', border: 'none', outline: 'none',
          color: 'var(--text)', fontSize: 22, fontWeight: 700,
          width: '100%', padding: 0,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  )
}

export default function CreateFuelEntry() {
  const { vehicleId: vehicleIdFromUrl } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { currency } = useCurrencyStore()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const invalidateTimeline = useTimelineStore((s) => s.invalidate)
  const [form, setForm] = useState({
    vehicleId: vehicleIdFromUrl ?? '',
    name: '',
    fuelType: '',
    refillDate: new Date().toISOString().split('T')[0],
    amount: '',
    cost: '',
    mileage: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mileageUnknown, setMileageUnknown] = useState(false)
  const [allEvents, setAllEvents] = useState<EventEntry[]>([])

  const resolvedVehicleId = vehicleIdFromUrl ?? form.vehicleId
  useEffect(() => {
    if (!resolvedVehicleId) return
    let cancelled = false
    Promise.allSettled([
      getFuelByVehicle(resolvedVehicleId),
      getRecordsByVehicle(resolvedVehicleId),
    ]).then(([fuelRes, recordRes]) => {
      if (cancelled) return
      const fuel: EventEntry[] = fuelRes.status === 'fulfilled'
        ? (Array.isArray(fuelRes.value.data) ? fuelRes.value.data : []).map(
            (e: { liquidEntryId?: number; fuelEntryId?: number; refillDate: string; mileage?: number | null }) => ({
              id: e.liquidEntryId ?? e.fuelEntryId ?? 0, date: e.refillDate, mileage: e.mileage,
            })
          )
        : []
      const records: EventEntry[] = recordRes.status === 'fulfilled'
        ? (Array.isArray(recordRes.value.data) ? recordRes.value.data : []).map(
            (r: { maintenanceRecordId: number; serviceDate: string; mileage?: number | null }) => ({
              id: r.maintenanceRecordId, date: r.serviceDate, mileage: r.mileage,
            })
          )
        : []
      setAllEvents([...fuel, ...records])
    })
    return () => { cancelled = true }
  }, [resolvedVehicleId])

  useEffect(() => {
    if (vehicleIdFromUrl) return
    let cancelled = false
    dedupFetch('vehicles-list', () => getVehicles())
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res.data) ? res.data : []
        setVehicles(list)
        if (list.length === 1) setForm((prev) => ({ ...prev, vehicleId: String(list[0].vehicleId) }))
      })
      .catch(() => { if (!cancelled) setError('Failed to load vehicles.') })
    return () => { cancelled = true }
  }, [vehicleIdFromUrl])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const targetVehicleId = vehicleIdFromUrl ?? form.vehicleId
  const minMileage = getPrecedingMinMileage(allEvents, form.refillDate)
  const mileageParsed = form.mileage !== '' ? parseInt(form.mileage, 10) : null
  const mileageError = !isMileageValid(mileageParsed, minMileage)
    ? `Must be at least ${minMileage.toLocaleString()} km`
    : undefined

  const backPath = targetVehicleId ? `/vehicles/${targetVehicleId}/fuel` : '/'
  const goBack = () => location.key !== 'default' ? navigate(-1) : navigate(backPath)

  const pricePerL = form.amount && form.cost
    ? (Number.parseFloat(form.cost) / Number.parseFloat(form.amount)).toFixed(2)
    : null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!targetVehicleId) { setError('Please select a vehicle.'); return }
    if (!mileageUnknown && mileageError) { setError(mileageError); return }
    setError(null)
    setLoading(true)
    try {
      await createFuelEntry({
        vehicleId: Number.parseInt(targetVehicleId, 10),
        name: form.name || null,
        brand: null,
        fuelType: form.fuelType,
        refillDate: new Date(form.refillDate).toISOString(),
        amount: Number.parseFloat(form.amount),
        cost: toPLN(Number.parseFloat(form.cost), currency),
        mileage: mileageUnknown || !form.mileage ? null : Number.parseInt(form.mileage, 10),
        notes: form.notes || null,
      })
      invalidateTimeline()
      goBack()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to save fuel entry.')
    } finally {
      setLoading(false)
    }
  }

  const divider = <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 18px' }} />

  return (
    <PageShell>
      <button onClick={goBack} style={backBtnStyle}>
        {targetVehicleId ? '← Fuel' : '← Home'}
      </button>
      <VehicleLabel vehicleId={vehicleIdFromUrl} />
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Log Fuel Refill</div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>
          <SmartFillButton />

          {!vehicleIdFromUrl && (
            <FormInput label="Vehicle" value={form.vehicleId} onChange={set('vehicleId')} required>
              <option value="">Select a vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.vehicleId} value={v.vehicleId}>
                  {v.brand} {v.model} ({v.yearOfProduction})
                </option>
              ))}
            </FormInput>
          )}

          {/* Name + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
            <FormInput label="Entry name" type="text" value={form.name} onChange={set('name')} placeholder="Full tank" />
            <FormInput label="Date" type="date" value={form.refillDate} onChange={set('refillDate')} required />
          </div>

          {divider}

          {/* Fuel type chips */}
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
            }}>
              Fuel type
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FUEL_TYPES.map((t) => {
                const active = form.fuelType === t
                return (
                  <button key={t} type="button" onClick={() => setForm((p) => ({ ...p, fuelType: t }))} style={{
                    padding: '7px 14px', borderRadius: 999,
                    background: active ? 'var(--accent)' : 'transparent',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    color: active ? '#fff' : 'var(--text2)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    {fuelLabel(t)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Station / brand */}
          <FormInput label="Station / brand" type="text" value={form.notes} onChange={set('notes')} placeholder="Orlen A4" />

          {divider}

          {/* Amount & Cost */}
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
            color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12,
          }}>
            Amount &amp; Cost
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <BigInput
              label="Litres"
              value={form.amount}
              onChange={set('amount') as (e: React.ChangeEvent<HTMLInputElement>) => void}
              placeholder="45"
            />
            <BigInput
              label={`Total cost (${SYMBOLS[currency]})`}
              value={form.cost}
              onChange={set('cost') as (e: React.ChangeEvent<HTMLInputElement>) => void}
              placeholder="280"
            />
          </div>

          {pricePerL && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 18,
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                Price per litre
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent3)' }}>
                {pricePerL} {SYMBOLS[currency]}/L
              </span>
            </div>
          )}

          {/* Mileage */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
            }}>
              Mileage at refill
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!mileageUnknown && (
                <input
                  type="number"
                  value={form.mileage}
                  onChange={set('mileage') as (e: React.ChangeEvent<HTMLInputElement>) => void}
                  placeholder={minMileage > 0 ? `${minMileage.toLocaleString()} km` : '187 300 km'}
                  min="0"
                  style={{
                    flex: 1, background: 'var(--surface2)',
                    border: `1px solid ${mileageError ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: 12, padding: '13px 14px',
                    fontSize: 15, fontWeight: 600, color: 'var(--text)',
                    outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.12)' }}
                  onBlur={(e) => { e.target.style.borderColor = mileageError ? 'var(--red)' : 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
              )}
              <button
                type="button"
                onClick={() => { setMileageUnknown((p) => !p); if (!mileageUnknown) setForm((p) => ({ ...p, mileage: '' })) }}
                style={{
                  padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
                  background: mileageUnknown ? 'rgba(108,99,255,0.15)' : 'var(--surface2)',
                  border: `1px solid ${mileageUnknown ? 'var(--accent)' : 'var(--border)'}`,
                  color: mileageUnknown ? 'var(--accent)' : 'var(--text3)',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  fontWeight: mileageUnknown ? 600 : 400,
                  flex: mileageUnknown ? 1 : 'none',
                  whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
              >
                Don't know
              </button>
            </div>
            {minMileage > 0 && !mileageUnknown && !mileageError && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>
                Last logged: {minMileage.toLocaleString()} km
              </div>
            )}
            {mileageError && !mileageUnknown && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--red)', marginTop: 6 }}>
                {mileageError}
              </div>
            )}
          </div>
        </div>

        <ActionButton type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Refill'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="ghost" onClick={goBack}>Cancel</ActionButton>
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}
