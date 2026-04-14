import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getComponentById, updateComponent, deleteComponent } from '@/features/components/api'
import { dedupFetch } from '@/lib/dedup'
import { LoadingText, ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle, labelStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import FormInput from '@/ui/FormInput'
import { COMPONENT_STATES } from '@/lib/enums'
import { formatEnumLabel } from '@/lib/formatters'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'

interface ComponentForm {
  state: string
  notes: string
  nextServiceRecommendedKm: string | number
  nextServiceRecommendedDate: string
  // identity — displayed read-only
  componentType: string
  vehicleComponentName: string
}

export default function EditComponent() {
  const { vehicleId, componentId } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState<ComponentForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    dedupFetch(`component-${componentId}`, () => getComponentById(componentId!)).then((res) => {
      if (cancelled) return
      const c = res.data
      setForm({
        state: c.state ?? c.currentState ?? 'Unknown',
        notes: c.notes ?? '',
        nextServiceRecommendedKm: c.nextServiceRecommendedKm ?? '',
        nextServiceRecommendedDate: c.nextServiceRecommendedDate ? String(c.nextServiceRecommendedDate).split('T')[0] : '',
        componentType: c.componentType ?? '',
        vehicleComponentName: c.vehicleComponentName ?? '',
      })
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [componentId])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    setError(null)
    setSaving(true)
    try {
      await updateComponent(componentId!, {
        state: form.state,
        notes: form.notes || null,
        nextServiceRecommendedKm: form.nextServiceRecommendedKm !== '' ? parseInt(String(form.nextServiceRecommendedKm), 10) : null,
        nextServiceRecommendedDate: form.nextServiceRecommendedDate ? new Date(form.nextServiceRecommendedDate).toISOString() : null,
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
    await deleteComponent(componentId!)
    navigate(`/vehicles/${vehicleId}/components`)
  }

  if (loading || !form) return <PageShell><LoadingText /></PageShell>

  return (
    <PageShell>
      <button onClick={() => navigate(`/vehicles/${vehicleId}/components/${componentId}`)} style={backBtnStyle}>
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

          {/* Identity — read-only */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>Type</label>
              <div style={{
                ...inputStyle,
                color: 'var(--text2)',
                pointerEvents: 'none',
                userSelect: 'none',
              }}>
                {formatEnumLabel(form.componentType) || '—'}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Name</label>
              <div style={{
                ...inputStyle,
                color: 'var(--text2)',
                pointerEvents: 'none',
                userSelect: 'none',
              }}>
                {form.vehicleComponentName || '—'}
              </div>
            </div>
          </div>

          {/* Freely editable */}
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>State</label>
            <select value={form.state} onChange={set('state')} style={{ ...inputStyle, width: '100%' }} onFocus={onFocus} onBlur={onBlur}>
              {COMPONENT_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <FormInput label="Next service (km)" type="number" value={form.nextServiceRecommendedKm} onChange={set('nextServiceRecommendedKm')} placeholder="50000" min="0" />
            <FormInput label="Next service date" type="date" value={form.nextServiceRecommendedDate} onChange={set('nextServiceRecommendedDate')} />
          </div>

          <FormInput label="Notes" type="text" value={form.notes} onChange={set('notes')} />

          <div style={{
            background: 'rgba(108,99,255,0.06)',
            border: '1px solid rgba(108,99,255,0.15)',
            borderRadius: 8, padding: '9px 12px', marginBottom: 10,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)',
          }}>
            Brand, part number, warranty, and lifetime are updated automatically when you record a Replaced service for this component.
          </div>
        </div>

        <ActionButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/components/${componentId}`)}>
          Cancel
        </ActionButton>
        <div style={{ height: 8 }} />
        {confirmDelete ? (
          <div style={{ padding: '0 22px', marginBottom: 0 }}>
            <div style={{
              background: 'rgba(248,113,113,0.06)',
              border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 12, padding: '14px',
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
