import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getComponentById, updateComponent, deleteComponent } from '@/features/components/api'
import { dedupFetch } from '@/lib/dedup'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { LoadingText, ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import FormInput from '@/ui/FormInput'
import { formatEnumLabel } from '@/lib/formatters'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'
import { labelStyle } from '@/styles/pageStyles'

interface ComponentForm {
  componentType: string
  vehicleComponentName: string
  vehicleComponentBrand: string
  installationDate: string
  lastServiceDate: string
  notes: string
  mileageAtInstall: string
  expectedLifetimeKm: string | number
  expectedLifetimeYears: string | number
  partNumber: string
  warrantyKm: string | number
  warrantyDate: string
  nextServiceRecommendedKm: string | number
  nextServiceRecommendedDate: string
}

function BigInput({ label, suffix, value, onChange, placeholder }: {
  label: string
  suffix?: string
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
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
        {suffix && (
          <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600, flexShrink: 0 }}>{suffix}</span>
        )}
      </div>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
      color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.14em',
      marginBottom: 12,
    }}>
      {title}
    </div>
  )
}

export default function EditComponent() {
  const { vehicleId, componentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => location.key !== 'default' ? navigate(-1) : navigate(`/vehicles/${vehicleId}/components/${componentId}`)

  const vehicle = useVehiclesStore((s) => s.vehicles.find((v) => v.vehicleId === parseInt(vehicleId!, 10)))
  const invalidate = useVehiclesStore((s) => s.invalidate)

  const [form, setForm] = useState<ComponentForm | null>(null)
  const [alertEnabled, setAlertEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    dedupFetch(`component-${componentId}`, () => getComponentById(componentId!)).then((res) => {
      if (cancelled) return
      const c = res.data
      // installedAtVehicleMileage is the vehicle odometer at install — display it directly
      const mileageAtInstall = c.installedAtVehicleMileage != null ? String(c.installedAtVehicleMileage) : ''
      setForm({
        componentType: c.componentType ?? '',
        vehicleComponentName: c.vehicleComponentName ?? '',
        vehicleComponentBrand: c.vehicleComponentBrand ?? '',
        installationDate: c.installationDate ? String(c.installationDate).split('T')[0] : '',
        lastServiceDate: c.lastServiceDate ? String(c.lastServiceDate).split('T')[0] : '',
        notes: c.notes ?? '',
        mileageAtInstall,
        expectedLifetimeKm: c.expectedLifetimeKm ?? '',
        expectedLifetimeYears: c.expectedLifetimeYears ?? '',
        partNumber: c.partNumber ?? '',
        warrantyKm: c.warrantyKm ?? '',
        warrantyDate: c.warrantyDate ? String(c.warrantyDate).split('T')[0] : '',
        nextServiceRecommendedKm: c.nextServiceRecommendedKm ?? '',
        nextServiceRecommendedDate: c.nextServiceRecommendedDate ? String(c.nextServiceRecommendedDate).split('T')[0] : '',
      })
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [componentId, vehicle?.mileage])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    setError(null)
    setSaving(true)
    // Store the vehicle odometer AT INSTALL directly as installedAtVehicleMileage
    const mileageAtInstallParsed = form.mileageAtInstall ? parseInt(form.mileageAtInstall, 10) : null
    const installedAtVehicleMileage = mileageAtInstallParsed ?? null
    try {
      await updateComponent(componentId!, {
        vehicleComponentName: form.vehicleComponentName || null,
        vehicleComponentBrand: form.vehicleComponentBrand || null,
        installationDate: form.installationDate ? new Date(form.installationDate).toISOString() : null,
        lastServiceDate: form.lastServiceDate ? new Date(form.lastServiceDate).toISOString() : null,
        notes: form.notes || null,
        installedAtVehicleMileage,
        expectedLifetimeKm: form.expectedLifetimeKm !== '' ? parseInt(String(form.expectedLifetimeKm), 10) : null,
        expectedLifetimeYears: form.expectedLifetimeYears !== '' ? parseInt(String(form.expectedLifetimeYears), 10) : null,
        partNumber: form.partNumber || null,
        warrantyKm: form.warrantyKm !== '' ? parseInt(String(form.warrantyKm), 10) : null,
        warrantyDate: form.warrantyDate ? new Date(form.warrantyDate).toISOString() : null,
        nextServiceRecommendedKm: form.nextServiceRecommendedKm !== '' ? parseInt(String(form.nextServiceRecommendedKm), 10) : null,
        nextServiceRecommendedDate: form.nextServiceRecommendedDate ? new Date(form.nextServiceRecommendedDate).toISOString() : null,
      })
      invalidate()
      goBack()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to update component.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    await deleteComponent(componentId!)
    navigate(`/vehicles/${vehicleId}/components`, { replace: true })
  }

  if (loading || !form) return <PageShell><LoadingText /></PageShell>

  const mileageAtInstallParsed = form.mileageAtInstall ? parseInt(form.mileageAtInstall, 10) : null
  const kmSinceInstall = mileageAtInstallParsed !== null && vehicle?.mileage != null
    ? Math.max(0, vehicle.mileage - mileageAtInstallParsed)
    : null

  const divider = <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 18px' }} />

  return (
    <PageShell>
      <button onClick={goBack} style={backBtnStyle}>
        ← Component
      </button>
      <VehicleLabel vehicleId={vehicleId} />
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Edit Component</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
          {form.vehicleComponentName || formatEnumLabel(form.componentType)}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>

          {/* Identity */}
          <SectionHeader title="Identity" />

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Type</label>
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '6px 14px', borderRadius: 999,
              background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
              color: 'var(--accent)', marginBottom: 6,
            }}>
              {formatEnumLabel(form.componentType) || '—'}
            </div>
          </div>

          <FormInput label="Name" type="text" value={form.vehicleComponentName} onChange={set('vehicleComponentName')} placeholder="Front Axle, Brake Pads..." />
          <FormInput label="Brand" type="text" value={form.vehicleComponentBrand} onChange={set('vehicleComponentBrand')} placeholder="Brembo, Gates..." />
          <FormInput label="Part no." type="text" value={form.partNumber} onChange={set('partNumber')} placeholder="e.g. P85 020" />

          {divider}

          {/* Service */}
          <SectionHeader title="Service" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
            <FormInput label="Install date" type="date" value={form.installationDate} onChange={set('installationDate')} />
            <FormInput
              label="Mileage at install"
              type="number"
              value={form.mileageAtInstall}
              onChange={set('mileageAtInstall')}
              placeholder={vehicle?.mileage ? String(Math.max(0, vehicle.mileage - 20000)) : '0'}
              min="0"
            />
          </div>

          {vehicle?.mileage != null && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: 'var(--text3)', marginBottom: 14,
            }}>
              {kmSinceInstall !== null
                ? `~ ${kmSinceInstall.toLocaleString()} km used since install`
                : 'km used since install is calculated automatically'}
            </div>
          )}

          <FormInput label="Last serviced" type="date" value={form.lastServiceDate} onChange={set('lastServiceDate')} />
          <FormInput label="Notes" type="text" value={form.notes} onChange={set('notes')} placeholder="Any notes..." />

          {divider}

          {/* Limits */}
          <SectionHeader title="Limits" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <BigInput
              label="KM limit"
              suffix="km"
              value={form.expectedLifetimeKm}
              onChange={set('expectedLifetimeKm') as (e: React.ChangeEvent<HTMLInputElement>) => void}
              placeholder="50000"
            />
            <BigInput
              label="Year limit"
              suffix="yr"
              value={form.expectedLifetimeYears}
              onChange={set('expectedLifetimeYears') as (e: React.ChangeEvent<HTMLInputElement>) => void}
              placeholder="5"
            />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: alertEnabled ? 'rgba(108,99,255,0.06)' : 'var(--surface2)',
            border: `1px solid ${alertEnabled ? 'rgba(108,99,255,0.25)' : 'var(--border)'}`,
            borderRadius: 12, padding: '12px 14px', marginBottom: 14,
            transition: 'all 0.2s',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                Alert before limit
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                Notify when approaching service limit
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAlertEnabled((p) => !p)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: alertEnabled ? 'var(--accent)' : 'var(--surface)',
                border: `1px solid ${alertEnabled ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3,
                left: alertEnabled ? 22 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: alertEnabled ? '#fff' : 'var(--text3)',
                transition: 'left 0.2s, background 0.2s',
              }} />
            </button>
          </div>

          {divider}

          {/* Warranty */}
          <SectionHeader title="Warranty" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
            <FormInput label="Warranty (km)" type="number" value={form.warrantyKm} onChange={set('warrantyKm')} placeholder="20000" min="0" />
            <FormInput label="Warranty until" type="date" value={form.warrantyDate} onChange={set('warrantyDate')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
            <FormInput label="Next service (km)" type="number" value={form.nextServiceRecommendedKm} onChange={set('nextServiceRecommendedKm')} placeholder="50000" min="0" />
            <FormInput label="Next service date" type="date" value={form.nextServiceRecommendedDate} onChange={set('nextServiceRecommendedDate')} />
          </div>
        </div>

        <ActionButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="ghost" onClick={goBack}>
          Cancel
        </ActionButton>
        <div style={{ height: 8 }} />
        {confirmDelete ? (
          <div style={{ padding: '0 22px' }}>
            <div style={{
              background: 'rgba(248,113,113,0.06)',
              border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 12, padding: 14,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 12, textAlign: 'center' }}>
                Delete this component? This cannot be undone.
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
            Delete component
          </button>
        )}
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}
