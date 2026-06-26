import { useState, useEffect } from 'react'
import {
  createFuelEntry, getFuelById, updateFuelEntry,
  deleteFuelEntry, getFuelByVehicle,
} from '@/features/fuel/api'
import { getRecordsByVehicle } from '@/features/records/api'
import { dedupFetch } from '@/shared/dedup'
import { useVehiclesStore } from '@/features/vehicles/vehicleStore'
import { useTimelineStore } from '@/features/timeline/timelineStore'
import { FUEL_TYPES, FUEL_TYPES_FOR_FUEL_TYPE } from '@/shared/enums'
import { formatEnumLabel } from '@/shared/formatters'
import FieldInput from '@/ui/FieldInput'
import { getPrecedingMinMileage, isMileageValid, type EventEntry } from '@/shared/mileageBounds'
import { useCurrencyStore, formatMoney, RATES, SYMBOLS, toPLN, convertCurrency, isSupportedCurrency } from '@/features/currency/currencyStore'
import SmartFillButton from '@/features/ai/SmartFillButton'
import type { FuelEntry, FuelParseResult } from '@/shared/types'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

const FUEL_LABELS: Record<string, string> = { Petrol95: 'Petrol 95', Petrol98: 'Petrol 98' }
const fuelLabel = (t: string) => FUEL_LABELS[t] ?? formatEnumLabel(t)

interface Props {
  vehicleId: string | null  // null = no vehicle context; shows selector in form
  entryId: number | null    // null = create mode
  onClose: () => void
  onSaved: () => void
}

interface FuelForm {
  name: string
  fuelType: string
  refillDate: string
  amount: string | number
  cost: string | number
  mileage: string | number
  notes: string
}

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
      borderRadius: 12, padding: '10px 12px',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
        color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
      }}>
        {label}
      </div>
      <input
        type="number" value={value} onChange={onChange} placeholder={placeholder} min="0"
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          background: 'none', border: 'none', outline: 'none',
          color: 'var(--text)', fontSize: 20, fontWeight: 700, width: '100%', padding: 0,
        }}
      />
    </div>
  )
}

export default function FuelModal({ vehicleId, entryId, onClose, onSaved }: Props) {
  const isCreate = entryId == null
  const { currency } = useCurrencyStore()
  const invalidateTimeline = useTimelineStore((s) => s.invalidate)

  // Vehicle resolution — supports global create (vehicleId prop = null)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const { vehicles, fetch: fetchVehicles } = useVehiclesStore()
  const effectiveVehicleId = vehicleId ?? selectedVehicleId

  useEffect(() => {
    if (!vehicleId) fetchVehicles()
  }, [vehicleId, fetchVehicles])

  const vehicle = useVehiclesStore((s) =>
    s.vehicles.find((v) => String(v.vehicleId) === effectiveVehicleId)
  )

  const [mode, setMode]                   = useState<'detail' | 'form'>(isCreate ? 'form' : 'detail')
  const [entry, setEntry]                 = useState<FuelEntry | null>(null)
  const [loadingEntry, setLoadingEntry]   = useState(!isCreate)
  const [allEvents, setAllEvents]         = useState<EventEntry[]>([])
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [submitError, setSubmitError]     = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<FuelForm>({
    name: '', fuelType: '', refillDate: today,
    amount: '', cost: '', mileage: '', notes: '',
  })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Load entry (edit mode) + sibling events for mileage validation (all modes)
  useEffect(() => {
    if (!effectiveVehicleId) return
    let cancelled = false
    Promise.allSettled([
      dedupFetch(`fuel-vehicle-${effectiveVehicleId}`, () => getFuelByVehicle(effectiveVehicleId)),
      dedupFetch(`records-vehicle-${effectiveVehicleId}`, () => getRecordsByVehicle(effectiveVehicleId)),
      isCreate
        ? Promise.resolve({ data: null })
        : dedupFetch(`fuel-entry-${entryId}`, () => getFuelById(entryId!)),
    ]).then(([fuelRes, recordRes, entryRes]) => {
      if (cancelled) return
      const fuel: EventEntry[] = fuelRes.status === 'fulfilled'
        ? (Array.isArray(fuelRes.value.data) ? fuelRes.value.data : []).map(
            (x: { liquidEntryId?: number; fuelEntryId?: number; refillDate: string; mileage?: number | null }) => ({
              id: x.liquidEntryId ?? x.fuelEntryId ?? 0, date: x.refillDate, mileage: x.mileage,
            })
          ) : []
      const records: EventEntry[] = recordRes.status === 'fulfilled'
        ? (Array.isArray(recordRes.value.data) ? recordRes.value.data : []).map(
            (r: { maintenanceRecordId: number; serviceDate: string; mileage?: number | null }) => ({
              id: r.maintenanceRecordId, date: r.serviceDate, mileage: r.mileage,
            })
          ) : []
      setAllEvents([...fuel, ...records])
      if (!isCreate) {
        if (entryRes.status === 'fulfilled' && entryRes.value.data) {
          const e = entryRes.value.data as FuelEntry
          setEntry(e)
          setForm({
            name:       e.name ?? '',
            fuelType:   e.fuelType ?? '',
            refillDate: e.refillDate ? e.refillDate.split('T')[0] : today,
            amount:     e.amount ?? '',
            cost:       e.cost != null ? parseFloat((e.cost * RATES[currency]).toFixed(2)) : '',
            mileage:    e.mileage ?? '',
            notes:      e.notes ?? '',
          })
        }
        setLoadingEntry(false)
      }
    })
    return () => { cancelled = true }
  }, [entryId, effectiveVehicleId, isCreate])

  // Auto-select first allowed fuel type on create
  useEffect(() => {
    if (!isCreate || !vehicle || form.fuelType) return
    const allowed = FUEL_TYPES_FOR_FUEL_TYPE[vehicle.fuelType] ?? FUEL_TYPES
    if (allowed.length > 0) setForm((p) => ({ ...p, fuelType: allowed[0] }))
  }, [vehicle, isCreate, form.fuelType])

  const setField = (field: keyof FuelForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [field]: e.target.value }))

  // Pre-fill from a scanned fuel receipt; amounts converted to the display currency.
  const handleFuelParsed = (d: FuelParseResult): string => {
    const detectedRaw = d.currency?.trim().toUpperCase() ?? ''
    const detected = isSupportedCurrency(detectedRaw) ? detectedRaw : null
    const needsConvert = detected !== null && detected !== currency
    const conv = (a: number) => needsConvert ? convertCurrency(a, detected!, currency) : a
    const round2 = (n: number) => parseFloat(n.toFixed(2))
    const station = [d.name, d.brand].filter(Boolean).join(' · ')

    setForm((p) => ({
      ...p,
      fuelType:   d.fuelType && (FUEL_TYPES as readonly string[]).includes(d.fuelType) ? d.fuelType : p.fuelType,
      refillDate: d.refillDate ? d.refillDate.split('T')[0] : p.refillDate,
      amount:     d.amount != null ? String(d.amount) : p.amount,
      cost:       d.cost != null ? String(round2(conv(d.cost))) : p.cost,
      mileage:    d.mileage != null ? String(d.mileage) : p.mileage,
      notes:      station || d.notes || p.notes,
    }))

    if (needsConvert) return `Amounts converted from ${detected}.`
    if (detectedRaw && !detected) return `Couldn't recognise currency (${detectedRaw}).`
    return ''
  }

  const availableFuelTypes = vehicle
    ? (FUEL_TYPES_FOR_FUEL_TYPE[vehicle.fuelType] ?? FUEL_TYPES)
    : FUEL_TYPES

  const currentEntryId = isCreate ? 0 : (entryId ?? 0)
  const eventsForValidation = mode === 'form' && !isCreate
    ? allEvents.filter((e) => e.id !== currentEntryId)
    : allEvents
  const minMileage    = getPrecedingMinMileage(eventsForValidation, form.refillDate)
  const mileageParsed = form.mileage !== '' && form.mileage != null
    ? parseInt(String(form.mileage), 10) : null
  const mileageError  = !isMileageValid(mileageParsed, minMileage)
    ? `Must be ≥ ${minMileage.toLocaleString()} km` : undefined

  const pricePerL = form.amount && form.cost
    ? (parseFloat(String(form.cost)) / parseFloat(String(form.amount))).toFixed(2)
    : null

  const handleSave = async () => {
    if (!effectiveVehicleId) { setSubmitError('Please select a vehicle.'); return }
    if (mileageError) { setSubmitError(mileageError); return }
    setSubmitError(null)
    setSaving(true)
    try {
      const payload = {
        name:       form.name || null,
        brand:      null,
        fuelType:   form.fuelType,
        refillDate: new Date(form.refillDate).toISOString(),
        amount:     parseFloat(String(form.amount)),
        cost:       toPLN(parseFloat(String(form.cost)), currency),
        mileage:    !form.mileage ? null : parseInt(String(form.mileage), 10),
        notes:      form.notes || null,
      }
      if (isCreate) {
        await createFuelEntry({ vehicleId: parseInt(effectiveVehicleId, 10), ...payload })
      } else {
        await updateFuelEntry(entryId!, payload)
      }
      invalidateTimeline()
      onSaved()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setSubmitError(msg ?? 'Failed to save.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteFuelEntry(entryId!)
      invalidateTimeline()
      onSaved()
    } finally {
      setDeleting(false)
    }
  }

  const formattedDate = entry?.refillDate
    ? new Date(entry.refillDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''
  const pricePerLDisplay = entry && entry.amount > 0
    ? `${((entry.cost / entry.amount) * RATES[currency]).toFixed(2)} ${SYMBOLS[currency]}/L`
    : '—'

  const title = isCreate ? 'Log Refill' : mode === 'detail' ? 'Fuel Entry' : 'Edit Entry'
  const divider = <div style={{ height: 1, background: 'var(--border)', margin: '2px 0 12px' }} />

  const labelStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5,
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300 }}
      />

      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(460px, 88vw)',
        maxHeight: '88vh',
        background: 'var(--surface)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        zIndex: 301,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '15px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'form' && !isCreate && (
              <button
                onClick={() => { setMode('detail'); setSubmitError(null); setConfirmDelete(false) }}
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
                  padding: '3px 5px', display: 'flex', alignItems: 'center',
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 15 }} />
              </button>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
              {mode === 'detail' && entry && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>
                  {fuelLabel(entry.fuelType ?? '')} · {formattedDate}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
              padding: '4px 6px', display: 'flex', alignItems: 'center',
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          {loadingEntry ? (
            <div style={{
              textAlign: 'center', padding: '48px 0',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)',
            }}>
              Loading…
            </div>

          ) : mode === 'detail' && entry ? (
            <>
              {/* Cost hero */}
              <div style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '14px', marginBottom: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>Total cost</span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
                    background: 'var(--surface3)', border: '1px solid var(--border)',
                    borderRadius: 5, padding: '2px 8px', color: 'var(--text)',
                  }}>
                    {fuelLabel(entry.fuelType ?? '')}
                  </span>
                </div>
                <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--accent3)', lineHeight: 1, marginBottom: 12 }}>
                  {formatMoney(entry.cost ?? 0, currency)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {[
                    { label: 'Litres',    value: `${entry.amount} L` },
                    { label: 'Per litre', value: pricePerLDisplay },
                    { label: 'Mileage',   value: entry.mileage ? `${entry.mileage.toLocaleString()} km` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      background: 'var(--surface3)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '8px 4px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)' }}>{label}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {entry.notes && (
                <div style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '11px 14px', marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>⛽</span>
                  <div>
                    <div style={{ ...labelStyle, marginBottom: 2 }}>Station</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{entry.notes}</div>
                  </div>
                </div>
              )}

              {confirmDelete && (
                <div style={{
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                  borderRadius: 12, padding: '12px', marginTop: 4,
                }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                    color: 'var(--red)', marginBottom: 10, textAlign: 'center',
                  }}>
                    Delete this entry? Cannot be undone.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 10,
                        background: 'var(--surface2)', border: '1px solid var(--border)',
                        color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete} disabled={deleting}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 10,
                        background: 'var(--red)', border: 'none',
                        color: '#fff', fontSize: 12, fontWeight: 600,
                        cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
                      }}
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                  </div>
                </div>
              )}
            </>

          ) : (
            <>
              {submitError && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--red)',
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 8, padding: '8px 12px', marginBottom: 12,
                }}>
                  {submitError}
                </div>
              )}

              {/* Fuel receipt scan */}
              <SmartFillButton<FuelParseResult>
                target="fuel"
                label="Scan fuel receipt to autofill"
                onParsed={handleFuelParsed}
              />

              {/* Vehicle selector — only shown when no vehicleId is provided (global create) */}
              {!vehicleId && (
                <div style={{ marginBottom: 10 }}>
                  <div style={labelStyle}>Vehicle</div>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: selectedVehicleId ? 'var(--text)' : 'var(--text3)',
                      fontSize: 13, fontFamily: 'inherit', outline: 'none',
                    }}
                  >
                    <option value="">Select a vehicle…</option>
                    {vehicles.map((v) => (
                      <option key={v.vehicleId} value={String(v.vehicleId)}>
                        {v.brand} {v.model} ({v.yearOfProduction})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
                <FieldInput label="Entry name" value={form.name} onChange={setField('name')} placeholder="Full tank" />
                <FieldInput label="Date" value={form.refillDate} onChange={setField('refillDate')} type="date" />
              </div>

              {divider}

              <div style={{ marginBottom: 12 }}>
                <div style={labelStyle}>Fuel type</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {availableFuelTypes.map((t) => {
                    const active = form.fuelType === t
                    return (
                      <button
                        key={t} type="button"
                        onClick={() => setForm((p) => ({ ...p, fuelType: t }))}
                        style={{
                          padding: '5px 11px', borderRadius: 999,
                          background: active ? 'var(--accent)' : 'transparent',
                          border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                          color: active ? '#fff' : 'var(--text2)',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10, fontWeight: active ? 600 : 400,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {fuelLabel(t)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <FieldInput label="Station / brand" value={form.notes} onChange={setField('notes')} placeholder="Orlen A4" />

              {divider}

              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700,
                color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10,
              }}>
                Amount &amp; Cost
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <BigInput label="Litres" value={form.amount} onChange={setField('amount') as (e: React.ChangeEvent<HTMLInputElement>) => void} placeholder="45" />
                <BigInput label={`Cost (${SYMBOLS[currency]})`} value={form.cost} onChange={setField('cost') as (e: React.ChangeEvent<HTMLInputElement>) => void} placeholder="280" />
              </div>

              {pricePerL && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '8px 12px', marginBottom: 12,
                }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>Price per litre</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent3)' }}>
                    {pricePerL} {SYMBOLS[currency]}/L
                  </span>
                </div>
              )}

              <div style={{ marginBottom: 6 }}>
                <div style={labelStyle}>Mileage at refill</div>
                <input
                  type="number"
                  value={form.mileage}
                  onChange={setField('mileage') as (e: React.ChangeEvent<HTMLInputElement>) => void}
                  placeholder={minMileage > 0 ? `${minMileage.toLocaleString()} km` : '187 300'}
                  min="0"
                  style={{
                    width: '100%', background: 'var(--surface2)', boxSizing: 'border-box',
                    border: `1px solid ${mileageError ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '10px 12px',
                    fontSize: 14, fontWeight: 600, color: 'var(--text)',
                    outline: 'none', transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.12)' }}
                  onBlur={(e) => { e.target.style.borderColor = mileageError ? 'var(--red)' : 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
                {minMileage > 0 && !mileageError && (
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 5 }}>
                    Last logged: {minMileage.toLocaleString()} km
                  </div>
                )}
                {mileageError && (
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--red)', marginTop: 5 }}>
                    {mileageError}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loadingEntry && (
          <div style={{ padding: '10px 18px 18px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {mode === 'form' ? (
              <button
                onClick={handleSave} disabled={saving}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s',
                }}
              >
                {saving ? 'Saving…' : isCreate ? 'Save Refill' : 'Save Changes'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setMode('form'); setConfirmDelete(false) }}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 12,
                    background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)',
                    color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Edit entry
                </button>
                {!confirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      padding: '11px 16px', borderRadius: 12,
                      background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                      color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
