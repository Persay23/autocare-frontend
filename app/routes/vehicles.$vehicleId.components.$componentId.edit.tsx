import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getComponentById, updateComponent, deleteComponent } from '@/features/components/api'
import { LoadingText, ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import FormInput from '@/ui/FormInput'
import { COMPONENT_DEFAULTS } from '@/lib/componentDefaults'
import { COMPONENT_TYPES, COMPONENT_STATES } from '@/lib/enums'
import { formatEnumLabel } from '@/lib/formatters'

export default function EditComponent() {
  const { vehicleId, componentId } = useParams()
  const navigate = useNavigate()
  interface ComponentForm { componentType: string; vehicleComponentName: string; vehicleComponentBrand: string; state: string; installationDate: string; currentMileage: string | number; expectedLifetimeKm: string | number; expectedLifetimeYears: string | number; notes: string }

  const [form, setForm] = useState<ComponentForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getComponentById(componentId!).then((res) => {
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

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    setError(null)
    setSaving(true)
    const defaults = COMPONENT_DEFAULTS[form.componentType] ?? COMPONENT_DEFAULTS.Other
    try {
      await updateComponent(componentId!, {
        vehicleId: Number.parseInt(vehicleId!, 10),
        componentType: form.componentType,
        vehicleComponentName: form.vehicleComponentName || null,
        vehicleComponentBrand: form.vehicleComponentBrand || null,
        state: form.state,
        installationDate: new Date(form.installationDate).toISOString(),
        currentMileage: form.currentMileage ? Number.parseInt(String(form.currentMileage), 10) : 0,
        expectedLifetimeKm: defaults.lifetimeKm,
        expectedLifetimeYears: defaults.lifetimeYears,
        notes: form.notes || null,
      })
      navigate(`/vehicles/${vehicleId}/components/${componentId}`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to update component.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this component?')) return
    await deleteComponent(componentId!)
    navigate(`/vehicles/${vehicleId}/components`)
  }

  if (loading || !form) return <PageShell><LoadingText /></PageShell>

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
