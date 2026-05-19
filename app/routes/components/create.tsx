import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { createComponent } from '@/features/components/api'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import SmartFillButton from '@/ui/SmartFillButton'
import FormInput from '@/ui/FormInput'
import { COMPONENT_DEFAULTS } from '@/lib/componentDefaults'
import { formatEnumLabel } from '@/lib/formatters'

const PRIMARY_TYPES = ['Brakes', 'Engine', 'Suspension', 'Transmission', 'Electrical']
const EXTRA_TYPES = ['Cooling', 'Fuel', 'Exhaust', 'Tyres', 'Body', 'Other']
const STEP_LABELS = ['Identity', 'Service', 'Limits', 'Warranty']

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
      {STEP_LABELS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {i > 0 && (
                <div style={{ flex: 1, height: 2, background: done || active ? 'var(--accent)' : 'var(--border)' }} />
              )}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: done ? 'var(--accent)' : active ? 'rgba(108,99,255,0.15)' : 'var(--surface2)',
                border: `2px solid ${done || active ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                color: done ? '#fff' : active ? 'var(--accent)' : 'var(--text3)',
                transition: 'all 0.2s',
              }}>
                {done ? '✓' : n}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: done ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s' }} />
              )}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
              color: active ? 'var(--accent)' : done ? 'var(--text2)' : 'var(--text3)',
              marginTop: 5, textAlign: 'center',
            }}>
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
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

export default function CreateComponent() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => location.key !== 'default' ? navigate(-1) : navigate(`/vehicles/${vehicleId}/components`)
  const invalidate = useVehiclesStore((s) => s.invalidate)
  const vehicle = useVehiclesStore((s) => s.vehicles.find((v) => v.vehicleId === parseInt(vehicleId!, 10)))

  const [step, setStep] = useState(1)
  const [showMoreTypes, setShowMoreTypes] = useState(false)
  const [alertEnabled, setAlertEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    componentType: '',
    vehicleComponentName: '',
    vehicleComponentBrand: '',
    partNumber: '',
    installationDate: new Date().toISOString().split('T')[0],
    mileageAtInstall: '',
    lastServiceDate: '',
    notes: '',
    expectedLifetimeKm: '',
    expectedLifetimeYears: '',
    warrantyKm: '',
    warrantyDate: '',
    nextServiceRecommendedKm: '',
    nextServiceRecommendedDate: '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const selectType = (t: string) => {
    const d = COMPONENT_DEFAULTS[t] ?? COMPONENT_DEFAULTS.Other
    setForm((prev) => ({
      ...prev,
      componentType: t,
      expectedLifetimeKm: prev.expectedLifetimeKm || String(d.lifetimeKm),
      expectedLifetimeYears: prev.expectedLifetimeYears || String(d.lifetimeYears),
    }))
  }

  const advance = () => {
    if (step === 1) {
      if (!form.componentType) { setError('Please select a component type.'); return }
      if (!form.vehicleComponentName.trim()) { setError('Please enter a component name.'); return }
    }
    setError(null)
    setStep((p) => p + 1)
  }

  const mileageAtInstallParsed = form.mileageAtInstall ? parseInt(form.mileageAtInstall, 10) : null
  const kmSinceInstall = mileageAtInstallParsed !== null && vehicle?.mileage != null
    ? Math.max(0, vehicle.mileage - mileageAtInstallParsed)
    : null

  const handleSave = async () => {
    setError(null)
    setLoading(true)
    const defaults = COMPONENT_DEFAULTS[form.componentType] ?? COMPONENT_DEFAULTS.Other
    // Store the vehicle odometer AT INSTALL as installedAtVehicleMileage (fixed reference point for km-used calc)
    const installedAtVehicleMileage = mileageAtInstallParsed ?? 0
    try {
      await createComponent({
        vehicleId: Number.parseInt(vehicleId!, 10),
        componentType: form.componentType,
        vehicleComponentName: form.vehicleComponentName || null,
        vehicleComponentBrand: form.vehicleComponentBrand || null,
        state: 'Unknown',
        installationDate: new Date(form.installationDate).toISOString(),
        lastServiceDate: form.lastServiceDate ? new Date(form.lastServiceDate).toISOString() : null,
        installedAtVehicleMileage,
        expectedLifetimeKm: form.expectedLifetimeKm ? parseInt(form.expectedLifetimeKm, 10) : defaults.lifetimeKm,
        expectedLifetimeYears: form.expectedLifetimeYears ? parseInt(form.expectedLifetimeYears, 10) : defaults.lifetimeYears,
        partNumber: form.partNumber || null,
        warrantyKm: form.warrantyKm ? parseInt(form.warrantyKm, 10) : null,
        warrantyDate: form.warrantyDate ? new Date(form.warrantyDate).toISOString() : null,
        nextServiceRecommendedKm: form.nextServiceRecommendedKm ? parseInt(form.nextServiceRecommendedKm, 10) : null,
        nextServiceRecommendedDate: form.nextServiceRecommendedDate ? new Date(form.nextServiceRecommendedDate).toISOString() : null,
        notes: form.notes || null,
      })
      invalidate()
      goBack()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to add component.')
    } finally {
      setLoading(false)
    }
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 999,
    background: active ? 'var(--accent)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    color: active ? '#fff' : 'var(--text2)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, fontWeight: active ? 600 : 400,
    cursor: 'pointer', transition: 'all 0.15s',
  })

  const divider = <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 18px' }} />

  return (
    <PageShell>
      <button onClick={goBack} style={backBtnStyle}>
        ← Components
      </button>
      <VehicleLabel vehicleId={vehicleId} />
      <div style={{ padding: '0 22px 16px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Add Component</div>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>
          <StepIndicator current={step} />

          {/* Step 1: Identity */}
          {step === 1 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Identity</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                  What part is this?
                </div>
              </div>

              <SmartFillButton title="Scan part / receipt" subtitle="AI fills the form automatically" />

              <FormInput
                label="Component name"
                type="text"
                value={form.vehicleComponentName}
                onChange={set('vehicleComponentName')}
                placeholder="Front brake pads, Oil filter..."
              />

              <div style={{ marginBottom: 14 }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
                }}>
                  Type <span style={{ color: 'var(--red)' }}>*</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRIMARY_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => selectType(t)} style={chipStyle(form.componentType === t)}>
                      {formatEnumLabel(t)}
                    </button>
                  ))}
                  {!showMoreTypes ? (
                    <button
                      type="button"
                      onClick={() => setShowMoreTypes(true)}
                      style={chipStyle(EXTRA_TYPES.includes(form.componentType))}
                    >
                      {EXTRA_TYPES.includes(form.componentType) ? formatEnumLabel(form.componentType) : '+ 6 more'}
                    </button>
                  ) : (
                    EXTRA_TYPES.map((t) => (
                      <button key={t} type="button" onClick={() => selectType(t)} style={chipStyle(form.componentType === t)}>
                        {formatEnumLabel(t)}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {divider}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
                <FormInput label="Brand" type="text" value={form.vehicleComponentBrand} onChange={set('vehicleComponentBrand')} placeholder="Brembo" />
                <FormInput label="Part no." type="text" value={form.partNumber} onChange={set('partNumber')} placeholder="P85 020" />
              </div>
            </>
          )}

          {/* Step 2: Service */}
          {step === 2 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Service</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                  Installation &amp; maintenance history
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
                <FormInput label="Install date" type="date" value={form.installationDate} onChange={set('installationDate')} required />
                <FormInput
                  label="Mileage at install"
                  type="number"
                  value={form.mileageAtInstall}
                  onChange={set('mileageAtInstall')}
                  placeholder={vehicle?.mileage ? String(Math.max(0, vehicle.mileage - 20000)) : '0'}
                  min="0"
                />
              </div>

              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: 'var(--text3)', marginBottom: 16,
              }}>
                {kmSinceInstall !== null
                  ? `~ ${kmSinceInstall.toLocaleString()} km used since install`
                  : 'km used since install is calculated automatically'}
              </div>

              <FormInput label="Last serviced" type="date" value={form.lastServiceDate} onChange={set('lastServiceDate')} />
              <FormInput label="Notes" type="text" value={form.notes} onChange={set('notes')} placeholder="Any notes..." />
            </>
          )}

          {/* Step 3: Limits */}
          {step === 3 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Limits</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                  When does this part typically need replacing?
                </div>
              </div>

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
                borderRadius: 12, padding: '12px 14px',
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
            </>
          )}

          {/* Step 4: Warranty */}
          {step === 4 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Warranty</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                  Optional — skip if not applicable
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
                <FormInput label="Warranty (km)" type="number" value={form.warrantyKm} onChange={set('warrantyKm')} placeholder="20000" min="0" />
                <FormInput label="Warranty until" type="date" value={form.warrantyDate} onChange={set('warrantyDate')} />
              </div>

              {divider}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
                <FormInput label="Next service (km)" type="number" value={form.nextServiceRecommendedKm} onChange={set('nextServiceRecommendedKm')} placeholder="50000" min="0" />
                <FormInput label="Next service date" type="date" value={form.nextServiceRecommendedDate} onChange={set('nextServiceRecommendedDate')} />
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          {step < 4 ? (
            <>
              <ActionButton type="button" onClick={advance}>
                {step === 1 ? 'Continue to service history →'
                  : step === 2 ? 'Continue to Limits →'
                  : 'Continue to Warranty →'}
              </ActionButton>
              <div style={{ height: 8 }} />
              {step > 1 && (
                <>
                  <ActionButton variant="ghost" onClick={() => { setError(null); setStep((p) => p - 1) }}>
                    ← Back
                  </ActionButton>
                  <div style={{ height: 8 }} />
                </>
              )}
              <ActionButton variant="ghost" onClick={goBack}>
                Save as draft
              </ActionButton>
            </>
          ) : (
            <>
              <ActionButton type="button" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Component'}
              </ActionButton>
              <div style={{ height: 8 }} />
              <ActionButton variant="ghost" onClick={() => { setError(null); setStep(3) }}>
                ← Back
              </ActionButton>
              <div style={{ height: 8 }} />
              <ActionButton variant="ghost" onClick={goBack}>
                Save as draft
              </ActionButton>
            </>
          )}
          <div style={{ height: 24 }} />
        </div>
      </form>
    </PageShell>
  )
}
