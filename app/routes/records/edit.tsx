import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getRecordById, updateRecord, deleteRecord, getRecordsByVehicle } from '@/features/records/api'
import { getFuelByVehicle } from '@/features/fuel/api'
import { dedupFetch } from '@/lib/dedup'
import { LoadingText, ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'
import { formatEnumLabel } from '@/lib/formatters'
import { useTimelineStore } from '@/features/timeline/timelineStore'
import { useCurrencyStore, SYMBOLS, toPLN, RATES } from '@/features/currency/currencyStore'
import { getPrecedingMinMileage, isMileageValid, mileageHint, type EventEntry } from '@/lib/mileageBounds'
import type { MaintenanceRecord } from '@/lib/types'

const SERVICE_TYPES = [
  'Inspection',
  'RoutineService',
  'Repair',
  'TyreService',
  'BodyAndPaint',
  'Electrical',
  'Other',
] as const

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

interface RecordForm {
  serviceName: string
  serviceType: string
  startedAt: string
  completedAt: string
  mileage: string | number
  cost: string | number
  description: string
  notes: string
  technicianName: string
  vendor: string
  invoiceNumber: string
  invoiceImageUrl: string
}

export default function EditRecord() {
  const { vehicleId, recordId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => location.key !== 'default' ? navigate(-1) : navigate(`/vehicles/${vehicleId}/records/${recordId}`)
  const { currency } = useCurrencyStore()
  const invalidateTimeline = useTimelineStore((s) => s.invalidate)

  const [form, setForm] = useState<RecordForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [mileageUnknown, setMileageUnknown] = useState(false)
  const [siblingEvents, setSiblingEvents] = useState<EventEntry[]>([])
  const [origCompletedAt, setOrigCompletedAt] = useState<string | null | undefined>(undefined)
  const [origMileage, setOrigMileage] = useState<number | null | undefined>(undefined)
  const [showMoreDetails, setShowMoreDetails] = useState(false)

  useEffect(() => {
    if (!vehicleId || !recordId) return
    let cancelled = false
    Promise.allSettled([
      dedupFetch(`record-${recordId}`, () => getRecordById(recordId)),
      getRecordsByVehicle(vehicleId),
      getFuelByVehicle(vehicleId),
    ]).then(([recordRes, siblingsRes, fuelRes]) => {
      if (cancelled) return
      if (recordRes.status === 'rejected') { setError('Failed to load record.'); return }

      const r = recordRes.value.data as MaintenanceRecord
      const records: EventEntry[] = siblingsRes.status === 'fulfilled'
        ? (Array.isArray(siblingsRes.value.data) ? siblingsRes.value.data : []).map(
            (x: { maintenanceRecordId: number; serviceDate: string; mileage?: number | null }) => ({
              id: x.maintenanceRecordId, date: x.serviceDate, mileage: x.mileage,
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
      setSiblingEvents([...records, ...fuel])
      setMileageUnknown(r.mileage == null)
      setOrigCompletedAt(r.completedAt ?? null)
      setOrigMileage(r.mileage ?? null)

      const loadedServiceType = r.serviceType ?? ''
      const loadedServiceName = r.serviceName ?? ''
      if (r.invoiceNumber || r.notes || r.invoiceImageUrl) setShowMoreDetails(true)

      const dateStr = r.startedAt ?? r.serviceDate ?? ''
      setForm({
        serviceName: loadedServiceName,
        serviceType: loadedServiceType,
        startedAt: dateStr ? dateStr.split('T')[0] : '',
        completedAt: r.completedAt ? r.completedAt.split('T')[0] : '',
        mileage: r.mileage ?? '',
        cost: r.cost != null ? parseFloat((r.cost * RATES[currency]).toFixed(2)) : '',
        description: r.description ?? '',
        notes: r.notes ?? '',
        technicianName: r.technicianName ?? '',
        vendor: r.vendorOrShop ?? '',
        invoiceNumber: r.invoiceNumber ?? '',
        invoiceImageUrl: r.invoiceImageUrl ?? '',
      })
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [recordId, vehicleId])

  const currentRecordId = parseInt(recordId ?? '0', 10)
  const minMileage = getPrecedingMinMileage(
    siblingEvents.filter((e) => e.id !== currentRecordId),
    form?.startedAt ?? '',
  )
  const mileageParsed = form?.mileage !== '' && form?.mileage != null ? parseInt(String(form.mileage), 10) : null
  const mileageError = !mileageUnknown && !isMileageValid(mileageParsed, minMileage)
    ? `Must be at least ${minMileage.toLocaleString()} km`
    : undefined

  const startedAtVal = form?.startedAt ?? ''
  const completedAtVal = form?.completedAt ?? ''
  const laborDays = (() => {
    if (!startedAtVal || !completedAtVal) return null
    const diff = new Date(completedAtVal).getTime() - new Date(startedAtVal).getTime()
    const days = Math.round(diff / (1000 * 60 * 60 * 24))
    return days >= 0 ? days : null
  })()

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    if (!mileageUnknown && mileageError) { setError(mileageError); return }
    setError(null)
    setSaving(true)
    try {
      const completedAtPatch = form.completedAt
        ? { completedAt: new Date(form.completedAt).toISOString() }
        : origCompletedAt != null ? { completedAt: null } : {}

      const mileagePatch = mileageUnknown
        ? (origMileage != null ? { mileage: null } : {})
        : form.mileage !== '' && form.mileage != null
          ? { mileage: parseInt(String(form.mileage), 10) }
          : origMileage != null ? { mileage: null } : {}

      await updateRecord(recordId!, {
        serviceName: form.serviceName || null,
        serviceType: form.serviceType,
        serviceDate: form.startedAt ? new Date(form.startedAt).toISOString() : undefined,
        startedAt: form.startedAt ? new Date(form.startedAt).toISOString() : null,
        ...completedAtPatch,
        laborDays: laborDays,
        ...mileagePatch,
        cost: form.cost ? toPLN(parseFloat(String(form.cost)), currency) : 0,
        description: form.description || null,
        notes: form.notes || null,
        technicianName: form.technicianName || null,
        vendorOrShop: form.vendor || null,
        invoiceNumber: form.invoiceNumber || null,
        invoiceImageUrl: form.invoiceImageUrl || null,
      })

      invalidateTimeline()
      goBack()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to update record.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    await deleteRecord(recordId!)
    invalidateTimeline()
    navigate(`/vehicles/${vehicleId}/records`, { replace: true })
  }

  if (loading || !form) return <PageShell><LoadingText /></PageShell>

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '8px 13px', borderRadius: 999,
    background: active ? 'var(--accent)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    color: active ? '#fff' : 'var(--text2)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, fontWeight: active ? 600 : 400,
    cursor: 'pointer', transition: 'all 0.15s',
  })

  return (
    <PageShell>
      <button onClick={goBack} style={backBtnStyle}>← Record</button>
      <VehicleLabel vehicleId={vehicleId} />

      <div style={{ padding: '0 22px 16px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Edit record</div>
        {form.serviceName && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
            {form.serviceName}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>

          {/* Service type */}
          <div style={cardStyle}>
            {fieldLbl('Service name')}
            <input
              value={form.serviceName}
              onChange={set('serviceName')}
              placeholder="e.g. Oil change, Timing belt replacement..."
              style={{ ...inputStyle, marginBottom: 12 }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
              color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.14em',
              marginBottom: 10,
            }}>
              Service type
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SERVICE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => p ? { ...p, serviceType: t } : p)}
                  style={chip(form.serviceType === t)}
                >
                  {formatEnumLabel(t)}
                </button>
              ))}
            </div>
          </div>

          {/* When & where */}
          <div style={cardStyle}>
            <SectionHead title="When & where" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div style={{ minWidth: 0 }}>
                {fieldLbl('Started')}
                <input type="date" value={form.startedAt} onChange={set('startedAt')} required style={{ ...inputStyle, boxSizing: 'border-box', width: '100%' }} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div style={{ minWidth: 0 }}>
                {fieldLbl('Completed', true)}
                <input type="date" value={form.completedAt} onChange={set('completedAt')} style={{ ...inputStyle, boxSizing: 'border-box', width: '100%' }} onFocus={onFocus} onBlur={onBlur} />
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
                  onClick={() => {
                    setMileageUnknown((p) => !p)
                    if (!mileageUnknown) setForm((p) => p ? { ...p, mileage: '' } : p)
                  }}
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
                type="number"
                value={form.mileage}
                onChange={set('mileage')}
                disabled={mileageUnknown}
                placeholder={minMileage > 0 ? String(minMileage) : '190 500'}
                min="0"
                style={{ ...inputStyle, borderColor: mileageError ? 'var(--red)' : undefined, opacity: mileageUnknown ? 0.4 : 1 }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              {mileageError && !mileageUnknown && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--red)', marginTop: 4 }}>
                  {mileageError}
                </div>
              )}
              {!mileageUnknown && minMileage > 0 && !mileageError && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                  {mileageHint(minMileage)}
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
                  value: laborDays !== null ? `${laborDays}d` : '—',
                  sub: laborDays === 0 ? '(auto)' : undefined,
                  color: laborDays != null && laborDays > 0 ? 'var(--accent)' : 'var(--text3)',
                },
              ].map(({ label, value, sub, color }) => (
                <div key={label} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 12px',
                }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                    color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 4,
                  }}>
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
            <div style={{
              width: 18, height: 18, borderRadius: 6, flexShrink: 0,
              background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)',
            }} />
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

        <ActionButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="ghost" onClick={goBack}>Cancel</ActionButton>
        <div style={{ height: 8 }} />
        {confirmDelete ? (
          <div style={{ padding: '0 22px', marginBottom: 0 }}>
            <div style={{
              background: 'rgba(248,113,113,0.06)',
              border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 12, padding: '14px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 12, textAlign: 'center' }}>
                Delete this record? This cannot be undone.
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
            type="button"
            onClick={() => setConfirmDelete(true)}
            style={{
              display: 'block', margin: '0 auto',
              background: 'none', border: 'none',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: 'var(--red)',
              textDecoration: 'underline', cursor: 'pointer',
            }}
          >
            Delete record
          </button>
        )}
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}
