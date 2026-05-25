import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getFuelById, updateFuelEntry, deleteFuelEntry, getFuelByVehicle } from '@/features/fuel/api'
import { getRecordsByVehicle } from '@/features/records/api'
import { dedupFetch } from '@/lib/dedup'
import { useTimelineStore } from '@/features/timeline/timelineStore'
import { getPrecedingMinMileage, isMileageValid, type EventEntry } from '@/lib/mileageBounds'
import { backBtnStyle } from '@/styles/pageStyles'
import { LoadingText, ErrorBanner } from '@/ui/AsyncStates'
import VehicleLabel from '@/ui/VehicleLabel'
import FormInput from '@/ui/FormInput'
import { FUEL_TYPES } from '@/lib/enums'
import { formatEnumLabel } from '@/lib/formatters'
import { useCurrencyStore, SYMBOLS, toPLN, RATES } from '@/features/currency/currencyStore'

const FUEL_LABELS: Record<string, string> = { Petrol95: 'Petrol 95', Petrol98: 'Petrol 98' }
const fuelLabel = (t: string) => FUEL_LABELS[t] ?? formatEnumLabel(t)

function BigInput({ label, value, onChange }: {
  label: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
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
        type="number" value={value} onChange={onChange} min="0"
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

export default function EditFuelEntry() {
  const { vehicleId, entryId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { currency } = useCurrencyStore()
  const goBack = () => location.key !== 'default' ? navigate(-1) : navigate(`/vehicles/${vehicleId}/fuel/${entryId}`)
  interface FuelForm { name: string; fuelType: string; refillDate: string; amount: string | number; cost: string | number; mileage: string | number; notes: string }

  const [form, setForm] = useState<FuelForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [mileageUnknown, setMileageUnknown] = useState(false)
  const [siblingEvents, setSiblingEvents] = useState<EventEntry[]>([])

  const invalidateTimeline = useTimelineStore((s) => s.invalidate)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      dedupFetch(`fuel-entry-${entryId}`, () => getFuelById(entryId!)),
      vehicleId ? getFuelByVehicle(vehicleId) : Promise.resolve({ data: [] }),
      vehicleId ? getRecordsByVehicle(vehicleId) : Promise.resolve({ data: [] }),
    ]).then(([entryRes, fuelRes, recordRes]) => {
      if (cancelled) return
      if (entryRes.status === 'rejected') return
      const e = entryRes.value.data
      setForm({
        name: e.name ?? '',
        fuelType: e.fuelType ?? '',
        refillDate: e.refillDate ? e.refillDate.split('T')[0] : '',
        amount: e.amount ?? '',
        cost: e.cost != null ? parseFloat((e.cost * RATES[currency]).toFixed(2)) : '',
        mileage: e.mileage ?? '',
        notes: e.notes ?? e.brand ?? '',
      })
      setMileageUnknown(e.mileage == null)
      const fuel: EventEntry[] = fuelRes.status === 'fulfilled'
        ? (Array.isArray(fuelRes.value.data) ? fuelRes.value.data : []).map(
            (x: { liquidEntryId?: number; fuelEntryId?: number; refillDate: string; mileage?: number | null }) => ({
              id: x.liquidEntryId ?? x.fuelEntryId ?? 0, date: x.refillDate, mileage: x.mileage,
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
      setSiblingEvents([...fuel, ...records])
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [entryId, vehicleId])

  const currentEntryId = parseInt(entryId ?? '0', 10)
  const minMileage = getPrecedingMinMileage(
    siblingEvents.filter((e) => e.id !== currentEntryId),
    form?.refillDate ?? '',
  )
  const mileageParsed = form?.mileage !== '' && form?.mileage != null ? parseInt(String(form.mileage), 10) : null
  const mileageError = !mileageUnknown && !isMileageValid(mileageParsed, minMileage)
    ? `Must be at least ${minMileage.toLocaleString()} km`
    : undefined

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev)

  const pricePerL = form?.amount && form?.cost
    ? (parseFloat(String(form.cost)) / parseFloat(String(form.amount))).toFixed(2)
    : null

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form) return
    if (!mileageUnknown && mileageError) { setError(mileageError); return }
    setError(null)
    setSaving(true)
    try {
      await updateFuelEntry(entryId!, {
        name: form.name || null,
        brand: null,
        fuelType: form.fuelType,
        refillDate: new Date(form.refillDate).toISOString(),
        amount: parseFloat(String(form.amount)),
        cost: toPLN(parseFloat(String(form.cost)), currency),
        mileage: mileageUnknown || !form.mileage ? null : Number.parseInt(String(form.mileage), 10),
        notes: form.notes || null,
      })
      invalidateTimeline()
      goBack()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to update entry.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    await deleteFuelEntry(entryId!)
    invalidateTimeline()
    navigate(`/vehicles/${vehicleId}/fuel`, { replace: true })
  }

  if (loading || !form) return <PageShell><LoadingText /></PageShell>

  const divider = <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 18px' }} />

  return (
    <PageShell>
      <button onClick={goBack} style={backBtnStyle}>← Fuel Entry</button>
      <VehicleLabel vehicleId={vehicleId} />
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Edit Fuel Entry</div>
        {form.fuelType && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
            {fuelLabel(form.fuelType)}{form.refillDate ? ` · ${new Date(form.refillDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>

          {/* Name + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
            <FormInput label="Entry name" type="text" value={form.name} onChange={set('name')} placeholder="Full tank" />
            <FormInput label="Date" type="date" value={form.refillDate} onChange={set('refillDate')} />
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
                  <button key={t} type="button" onClick={() => setForm((p) => p ? { ...p, fuelType: t } : p)} style={{
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
            />
            <BigInput
              label={`Total cost (${SYMBOLS[currency]})`}
              value={form.cost}
              onChange={set('cost') as (e: React.ChangeEvent<HTMLInputElement>) => void}
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
                onClick={() => { setMileageUnknown((p) => !p); if (!mileageUnknown) setForm((p) => p ? { ...p, mileage: '' } : p) }}
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

        <ActionButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="ghost" onClick={goBack}>Cancel</ActionButton>
        <div style={{ height: 8 }} />

        {confirmDelete ? (
          <div style={{ padding: '0 22px', marginBottom: 0 }}>
            <div style={{
              background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 12, padding: 14,
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
