import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import ActionButton from '../components/shared/ActionButton'
import { createComponent } from '../api/components'
import { ErrorBanner } from '../components/shared/AsyncStates'
import { backBtnStyle } from '../styles/pageStyles'
import FormInput from '../components/shared/FormInput'
import { COMPONENT_DEFAULTS } from '../data/componentDefaults'
import { COMPONENT_TYPES, COMPONENT_STATES } from '../constants/enums'
import { formatEnumLabel } from '../utils/formatters'

export default function CreateComponent() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    componentType: '',
    vehicleComponentName: '',
    vehicleComponentBrand: '',
    state: '',
    installationDate: new Date().toISOString().split('T')[0],
    currentMileage: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const defaults = COMPONENT_DEFAULTS[form.componentType] ?? COMPONENT_DEFAULTS.Other
    try {
      await createComponent({
        vehicleId: Number.parseInt(vehicleId!, 10),
        componentType: form.componentType,
        vehicleComponentName: form.vehicleComponentName || null,
        vehicleComponentBrand: form.vehicleComponentBrand || null,
        state: form.state,
        installationDate: new Date(form.installationDate).toISOString(),
        currentMileage: form.currentMileage ? Number.parseInt(form.currentMileage, 10) : 0,
        expectedLifetimeKm: defaults.lifetimeKm,
        expectedLifetimeYears: defaults.lifetimeYears,
        notes: form.notes || null,
      })
      navigate(`/vehicles/${vehicleId}/components`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to add component.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <button onClick={() => navigate(`/vehicles/${vehicleId}/components`)} style={backBtnStyle}>
        ← Components
      </button>
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Add Component</div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>

          <FormInput label="Name" type="text" value={form.vehicleComponentName} onChange={set('vehicleComponentName')} placeholder="Front Axle, Brake Pads..." />
          <FormInput label="Brand (optional)" type="text" value={form.vehicleComponentBrand} onChange={set('vehicleComponentBrand')} placeholder="Brembo, Gates..." />

          <FormInput label="Component Type" value={form.componentType} onChange={set('componentType')}>
            <option value="">Select a component type...</option>
            {COMPONENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatEnumLabel(t)}
              </option>
            ))}
          </FormInput>

          

          <FormInput label="State" value={form.state} onChange={set('state')}>
            <option value="">Select a state...</option>
            {COMPONENT_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </FormInput>

          <FormInput label="Installation Date" type="date" value={form.installationDate} onChange={set('installationDate')} required />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <FormInput
              label="Km used since install"
              type="number"
              value={form.currentMileage}
              onChange={set('currentMileage')}
              placeholder="0"
              min="0"
              hint="km driven since this was installed"
            />
            {/* <FormInput
              label="Lifetime (km)"
              type="number"
              value={form.expectedLifetimeKm}
              onChange={set('expectedLifetimeKm')}
              placeholder="50000"
              min="0"
            /> */}
          </div>

          {/* <FormInput
            label="Lifetime (years)"
            type="number"
            value={form.expectedLifetimeYears}
            onChange={set('expectedLifetimeYears')}
            placeholder="5"
            min="0"
          /> */}

          <FormInput label="Notes" type="text" value={form.notes} onChange={set('notes')} placeholder="Any notes..." />

          <div style={{
            background: 'rgba(108,99,255,0.06)',
            border: '1px solid rgba(108,99,255,0.15)',
            borderRadius: 8,
            padding: '9px 12px',
            marginBottom: 10,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--text2)',
            }}>
            Service intervals are set automatically based on manufacturer recommendations
            for {formatEnumLabel(form.componentType)}.
          </div>
        </div>

        <ActionButton type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Add Component'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="secondary" onClick={() => navigate(`/vehicles/${vehicleId}/components`)}>
          Cancel
        </ActionButton>
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}
