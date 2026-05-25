import { useEffect, useState, useMemo, useId } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import PageShell from '@/ui/layout/PageShell'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'
import ActionButton from '@/ui/ActionButton'
import { createRecord, getRecordsByVehicle } from '@/features/records/api'
import { getFuelByVehicle } from '@/features/fuel/api'
import { getPrecedingMinMileage, isMileageValid, type EventEntry } from '@/lib/mileageBounds'
import { getVehicles } from '@/features/vehicles/api'
import { useTimelineStore } from '@/features/timeline/timelineStore'
import { dedupFetch } from '@/lib/dedup'
import { ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import FormInput from '@/ui/FormInput'
import type { Vehicle } from '@/lib/types'
import { formatEnumLabel } from '@/lib/formatters'
import { useCurrencyStore, SYMBOLS, toPLN } from '@/features/currency/currencyStore'

const QUICK_TYPES = [
  { label: 'Oil service',  serviceType: 'Engine',     name: 'Oil service' },
  { label: 'Brake pads',  serviceType: 'Brakes',     name: 'Brake pads replacement' },
  { label: 'Tyre change', serviceType: 'Tyres',      name: 'Tyre change' },
  { label: 'Inspection',  serviceType: 'Inspection', name: 'Vehicle inspection' },
  { label: 'Air filter',  serviceType: 'Engine',     name: 'Air filter replacement' },
]

const fmtDate = (iso: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ width: 3, height: 16, borderRadius: 2, flexShrink: 0, background: 'var(--accent)' }} />
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
    </div>
  )
}

const fieldLbl = (text: string, opt?: boolean) => (
  <div style={{
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
    textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6,
    display: 'flex', alignItems: 'center', gap: 5,
  }}>
    {text}
    {opt && (
      <span style={{
        fontSize: 8, color: 'var(--text3)', background: 'var(--surface)',
        border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 4,
      }}>
        opt
      </span>
    )}
  </div>
)

const cardStyle: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 14, padding: 14, marginBottom: 10,
}

const BETA: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
  background: 'rgba(108,99,255,0.15)', color: 'var(--accent)',
  border: '1px solid rgba(108,99,255,0.2)', padding: '1px 5px',
  borderRadius: 4, letterSpacing: '0.08em',
}

export default function CreateRecord() {
  const uid = useId()
  const cameraId = `${uid}-cam`

  const { vehicleId: vehicleIdFromUrl } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { currency } = useCurrencyStore()
  const invalidateTimeline = useTimelineStore((s) => s.invalidate)

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    vehicleId: vehicleIdFromUrl ?? '',
    serviceType: '', serviceName: '',
    startedAt: today, completedAt: today,
    mileage: '', cost: '',
    description: '', notes: '',
    technicianName: '', vendor: '',
    invoiceNumber: '', invoiceImageUrl: '',
  })
  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const [showQuickText, setShowQuickText] = useState(false)
  const [quickText, setQuickText] = useState('')
  const [customMode, setCustomMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mileageUnknown, setMileageUnknown] = useState(false)
  const [allEvents, setAllEvents] = useState<EventEntry[]>([])

  const targetVehicleId = vehicleIdFromUrl ?? form.vehicleId

  useEffect(() => {
    if (vehicleIdFromUrl) return
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
  }, [vehicleIdFromUrl])

  useEffect(() => {
    if (!targetVehicleId) return
    let cancelled = false
    Promise.allSettled([
      getRecordsByVehicle(targetVehicleId),
      getFuelByVehicle(targetVehicleId),
    ]).then(([recordRes, fuelRes]) => {
      if (cancelled) return
      const records: EventEntry[] = recordRes.status === 'fulfilled'
        ? (Array.isArray(recordRes.value.data) ? recordRes.value.data : []).map(
            (r: { maintenanceRecordId: number; serviceDate: string; mileage?: number | null }) => ({
              id: r.maintenanceRecordId, date: r.serviceDate, mileage: r.mileage,
            })
          )
        : []
      const fuel: EventEntry[] = fuelRes.status === 'fulfilled'
        ? (Array.isArray(fuelRes.value.data) ? fuelRes.value.data : []).map(
            (e: { liquidEntryId?: number; fuelEntryId?: number; refillDate: string; mileage?: number | null }) => ({
              id: e.liquidEntryId ?? e.fuelEntryId ?? 0, date: e.refillDate, mileage: e.mileage,
            })
          )
        : []
      setAllEvents([...records, ...fuel])
    })
    return () => { cancelled = true }
  }, [targetVehicleId])

  const laborDays = useMemo(() => {
    if (!form.startedAt || !form.completedAt) return 0
    const diff = new Date(form.completedAt).getTime() - new Date(form.startedAt).getTime()
    const days = Math.round(diff / (1000 * 60 * 60 * 24))
    return days >= 0 ? days : 0
  }, [form.startedAt, form.completedAt])

  const minMileage = getPrecedingMinMileage(allEvents, form.startedAt || today)
  const mileageParsed = form.mileage !== '' ? parseInt(form.mileage, 10) : null
  const mileageError = !mileageUnknown && !isMileageValid(mileageParsed, minMileage)
    ? `Must be at least ${minMileage.toLocaleString()} km`
    : undefined

  const backPath = targetVehicleId ? `/vehicles/${targetVehicleId}/records` : '/'
  const goBack = () => location.key !== 'default' ? navigate(-1) : navigate(backPath)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }))

  const pickQuickType = (qt: typeof QUICK_TYPES[0]) => {
    setCustomMode(false)
    setForm((p) => ({ ...p, serviceType: qt.serviceType, serviceName: qt.name }))
  }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!targetVehicleId) { setError('Please select a vehicle.'); return }
    if (!form.serviceType || !form.serviceName.trim()) {
      setError('Please select a quick type or enter a service name.')
      return
    }
    if (!mileageUnknown && mileageError) { setError(mileageError); return }
    setError(null)
    setLoading(true)
    try {
      const recordRes = await createRecord({
        vehicleId: parseInt(targetVehicleId, 10),
        serviceName: form.serviceName || null,
        serviceType: form.serviceType,
        serviceDate: new Date(form.startedAt).toISOString(),
        startedAt: form.startedAt ? new Date(form.startedAt).toISOString() : null,
        completedAt: form.completedAt ? new Date(form.completedAt).toISOString() : null,
        laborDays,
        mileage: mileageUnknown || form.mileage === '' ? null : parseInt(form.mileage, 10),
        cost: form.cost ? toPLN(parseFloat(form.cost), currency) : 0,
        description: form.description || null,
        notes: form.notes || null,
        technicianName: form.technicianName || null,
        vendorOrShop: form.vendor || null,
        invoiceNumber: form.invoiceNumber || null,
        invoiceImageUrl: form.invoiceImageUrl || null,
      })
      const newRecordId = recordRes.data.maintenanceRecordId
      invalidateTimeline()
      navigate(`/vehicles/${targetVehicleId}/records/${newRecordId}/components`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to save record.')
    } finally {
      setLoading(false)
    }
  }

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '8px 13px', borderRadius: 999,
    background: active ? 'var(--accent)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    color: active ? '#fff' : 'var(--text2)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, fontWeight: active ? 600 : 400,
    cursor: 'pointer', transition: 'all 0.15s',
  })

  const activeQT = QUICK_TYPES.find(
    (qt) => qt.name === form.serviceName && qt.serviceType === form.serviceType
  )

  return (
    <PageShell>
      <button onClick={goBack} style={backBtnStyle}>
        {targetVehicleId ? '← Records' : '← Home'}
      </button>
      {vehicleIdFromUrl && <VehicleLabel vehicleId={vehicleIdFromUrl} />}

      <div style={{ padding: '0 22px 16px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>New record</div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>

          {/* AI entry points */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <label
              htmlFor={cameraId}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CameraAltIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Scan invoice</span>
                  <span style={BETA}>BETA</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                  Autofill from photo
                </div>
              </div>
            </label>
            <input id={cameraId} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={() => {}} />

            <button
              type="button"
              onClick={() => setShowQuickText((p) => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                background: showQuickText ? 'rgba(108,99,255,0.08)' : 'var(--surface2)',
                border: `1px solid ${showQuickText ? 'rgba(108,99,255,0.3)' : 'var(--border)'}`,
                borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AutoAwesomeIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Quick fill</span>
                  <span style={BETA}>BETA</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                  Describe in text
                </div>
              </div>
            </button>
          </div>

          {showQuickText && (
            <div style={{ marginBottom: 10 }}>
              <textarea
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="e.g. Oil change at AutoSerwis, 320zł, today"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, marginBottom: 6 }}
                onFocus={onFocus}
                onBlur={onBlur}
                autoFocus
              />
              <button
                type="button"
                disabled={!quickText.trim()}
                style={{
                  width: '100%', padding: '9px 14px', borderRadius: 9,
                  background: quickText.trim() ? 'var(--accent)' : 'var(--surface)',
                  border: 'none', color: quickText.trim() ? '#fff' : 'var(--text3)',
                  fontSize: 12, fontWeight: 600,
                  cursor: quickText.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}
              >
                Use this text →
              </button>
            </div>
          )}

          {/* Quick type */}
          <div style={cardStyle}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
              color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.14em',
              marginBottom: 10,
            }}>
              Quick type
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_TYPES.map((qt) => (
                <button key={qt.label} type="button" onClick={() => pickQuickType(qt)} style={chip(activeQT?.label === qt.label)}>
                  {qt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setCustomMode(true)
                  setForm((p) => ({ ...p, serviceType: 'Other', serviceName: '' }))
                }}
                style={chip(customMode)}
              >
                + custom
              </button>
            </div>
            {customMode && (
              <div style={{ marginTop: 10 }}>
                <input
                  value={form.serviceName}
                  onChange={set('serviceName')}
                  placeholder="e.g. Timing belt, AC service..."
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  autoFocus
                />
              </div>
            )}
            {activeQT && (
              <div style={{ marginTop: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--accent)' }}>
                ✓ {form.serviceName} · {formatEnumLabel(form.serviceType)}
              </div>
            )}
          </div>

          {/* Vehicle selector */}
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

          {/* When & where */}
          <div style={cardStyle}>
            <SectionHead title="When & where" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                {fieldLbl('Started')}
                <input type="date" value={form.startedAt} onChange={set('startedAt')} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                {fieldLbl('Completed', true)}
                <input type="date" value={form.completedAt} onChange={set('completedAt')} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
                  textTransform: 'uppercase' as const, letterSpacing: '0.1em',
                }}>
                  Mileage (km)
                </div>
                <button
                  type="button"
                  onClick={() => { setMileageUnknown((p) => !p); if (!mileageUnknown) setForm((p) => ({ ...p, mileage: '' })) }}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                    background: mileageUnknown ? 'rgba(108,99,255,0.15)' : 'transparent',
                    border: `1px solid ${mileageUnknown ? 'rgba(108,99,255,0.35)' : 'var(--border)'}`,
                    color: mileageUnknown ? 'var(--accent)' : 'var(--text3)',
                    padding: '2px 7px', borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {mileageUnknown ? '✓ unknown' : 'unknown?'}
                </button>
              </div>
              <input
                type="number" value={form.mileage} onChange={set('mileage')}
                disabled={mileageUnknown}
                placeholder={minMileage > 0 ? String(minMileage) : '190 500'}
                min="0"
                style={{ ...inputStyle, borderColor: mileageError ? 'var(--red)' : undefined, opacity: mileageUnknown ? 0.4 : 1 }}
                onFocus={onFocus} onBlur={onBlur}
              />
              {mileageError && !mileageUnknown && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--red)', marginTop: 4 }}>
                  {mileageError}
                </div>
              )}
              {!mileageUnknown && minMileage > 0 && !mileageError && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                  Last logged: {minMileage.toLocaleString()} km
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                {fieldLbl('Vendor / shop', true)}
                <input value={form.vendor} onChange={set('vendor')} placeholder="AutoSerwis..." style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                {fieldLbl('Technician', true)}
                <input value={form.technicianName} onChange={set('technicianName')} placeholder="Jan K..." style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>
          </div>

          {/* Cost */}
          <div style={cardStyle}>
            <SectionHead title="Cost" />
            <div style={{
              display: 'flex', alignItems: 'stretch',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden', marginBottom: 10,
            }}>
              <div style={{
                padding: '0 16px', flexShrink: 0,
                background: 'rgba(108,99,255,0.15)',
                borderRight: '1px solid rgba(108,99,255,0.25)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700,
                color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {SYMBOLS[currency]}
              </div>
              <input
                type="number"
                value={form.cost}
                onChange={set('cost')}
                placeholder="0.00"
                min="0"
                step="0.01"
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text)', fontSize: 24, fontWeight: 700,
                  padding: '14px 16px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Started', value: fmtDate(form.startedAt) },
                {
                  label: 'Labour days',
                  value: `${laborDays}d`,
                  sub: laborDays === 0 ? '(auto)' : undefined,
                  color: laborDays > 0 ? 'var(--accent)' : 'var(--text3)',
                },
              ].map(({ label, value, sub, color }) => (
                <div key={label} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 12px',
                }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: color ?? 'var(--text)', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    {value}
                    {sub && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)' }}>{sub}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What was done? */}
          <div style={cardStyle}>
            <SectionHead title="What was done?" />
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Describe the work..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* More details */}
          <button
            type="button"
            onClick={() => setShowMoreDetails((p) => !p)}
            style={{
              width: '100%', padding: '14px 16px', textAlign: 'left' as const,
              background: showMoreDetails ? 'rgba(108,99,255,0.05)' : 'var(--surface2)',
              border: `1px solid ${showMoreDetails ? 'rgba(108,99,255,0.2)' : 'var(--border)'}`,
              borderRadius: showMoreDetails ? '14px 14px 0 0' : 14,
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', marginBottom: showMoreDetails ? 0 : 10,
              transition: 'all 0.15s',
            }}
          >
            <div style={{ width: 3, height: 16, borderRadius: 2, flexShrink: 0, background: showMoreDetails ? 'var(--accent)' : 'var(--border)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>More details</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              Invoice no., notes, image URL...
            </span>
            <span style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: 11 }}>
              {showMoreDetails ? '▲' : '▼'}
            </span>
          </button>

          {showMoreDetails && (
            <div style={{
              padding: 14,
              background: 'rgba(108,99,255,0.02)',
              border: '1px solid rgba(108,99,255,0.15)', borderTop: 'none',
              borderRadius: '0 0 14px 14px', marginBottom: 10,
            }}>
              <div style={{ marginBottom: 10 }}>
                {fieldLbl('Invoice no.')}
                <input value={form.invoiceNumber} onChange={set('invoiceNumber')} placeholder="FV/2024/001" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div style={{ marginBottom: 10 }}>
                {fieldLbl('Additional notes')}
                <textarea
                  value={form.notes}
                  onChange={set('notes')}
                  placeholder="Any additional notes..."
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
              {fieldLbl('Invoice image URL')}
              <input type="url" value={form.invoiceImageUrl} onChange={set('invoiceImageUrl')} placeholder="https://..." style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          )}
        </div>

        <ActionButton type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Next: Components →'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="ghost" onClick={goBack}>Cancel</ActionButton>
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}
