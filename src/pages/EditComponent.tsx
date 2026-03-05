import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import ActionButton from '../components/shared/ActionButton'
import { getComponentById, updateComponent, deleteComponent } from '../api/components'
import { LoadingText, ErrorBanner } from '../components/shared/AsyncStates'
import { backBtnStyle } from '../styles/pageStyles'
import FormInput from '../components/shared/FormInput'
import { COMPONENT_DEFAULTS } from '../data/componentDefaults'
import { COMPONENT_TYPES, COMPONENT_STATES } from '../constants/enums'
import { formatEnumLabel } from '../utils/formatters'

export default function EditComponent() {
  const { vehicleId, componentId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getComponentById(componentId).then((res) => {
      const c = res.data
      setForm({
        componentType: c.componentType ?? '--',
        vehicleComponentName: c.vehicleComponentName ?? '',
        vehicleComponentBrand: c.vehicleComponentBrand ?? '',
        state: c.state ?? '',
        installationDate: c.installationDate ? c.installationDate.split('T')[0] : '',
        currentMileage: c.currentMileage ?? '',
        expectedLifetimeKm: c.expectedLifetimeKm ?? '',
        expectedLifetimeYears: c.expectedLifetimeYears ?? '',
        notes: c.notes ?? '',
      })
    }).finally(() => setLoading(false))
  }, [componentId])

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const defaults = COMPONENT_DEFAULTS[form.componentType] ?? COMPONENT_DEFAULTS.Other
    try {
      await updateComponent(componentId, {
        vehicleId: Number.parseInt(vehicleId, 10),
        componentType: form.componentType,
        vehicleComponentName: form.vehicleComponentName || null,
        vehicleComponentBrand: form.vehicleComponentBrand || null,
        state: form.state,
        installationDate: new Date(form.installationDate).toISOString(),
        currentMileage: form.currentMileage ? Number.parseInt(form.currentMileage, 10) : 0,
        expectedLifetimeKm: defaults.lifetimeKm,       // ← auto from defaults
        expectedLifetimeYears: defaults.lifetimeYears,  // ← auto from defaults
        notes: form.notes || null,
      })
      navigate(`/vehicles/${vehicleId}/components/${componentId}`)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to update component.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this component?')) return
    await deleteComponent(componentId)
    navigate(`/vehicles/${vehicleId}/components`)
  }

  if (loading) return <PageShell><LoadingText /></PageShell>

  return (
    <PageShell>
      <button onClick={() => navigate(`/vehicles/${vehicleId}/components/${componentId}`)} style={backBtnStyle}>
        ← Component
      </button>
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Edit Component</div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>

          
          <FormInput label="Name" type="text" value={form.vehicleComponentName} onChange={set('vehicleComponentName')} placeholder="Front Axle..." />
          <FormInput label="Brand (optional)" type="text" value={form.vehicleComponentBrand} onChange={set('vehicleComponentBrand')} placeholder="Brembo..." />

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
          <FormInput label="Installation Date" type="date" value={form.installationDate} onChange={set('installationDate')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <FormInput label="Km used" type="number" value={form.currentMileage} onChange={set('currentMileage')} min="0" />
            {/* <FormInput label="Lifetime (km)" type="number" value={form.expectedLifetimeKm} onChange={set('expectedLifetimeKm')} min="0" /> */}
          </div>
          {/* <FormInput label="Lifetime (years)" type="number" value={form.expectedLifetimeYears} onChange={set('expectedLifetimeYears')} min="0" /> */}
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
          <FormInput label="Notes" type="text" value={form.notes} onChange={set('notes')} />
        </div>

        <ActionButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/components/${componentId}`)}>
          Cancel
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="danger" onClick={handleDelete}>
          Delete Component
        </ActionButton>
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}
