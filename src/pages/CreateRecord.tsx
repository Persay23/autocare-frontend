import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import FormInput from '../components/shared/FormInput'
import { inputStyle, onFocus, onBlur } from '../components/shared/formStyles'
import ActionButton from '../components/shared/ActionButton'
import { createRecord, createRecordComponent } from '../api/records'
import { getVehicles } from '../api/vehicles'
import { getComponentsByVehicle } from '../api/components'
import { ErrorBanner } from '../components/shared/AsyncStates'
import { backBtnStyle, labelStyle } from '../styles/pageStyles'
import { SERVICE_TYPES, COMPONENT_STATES } from '../constants/enums'
import { COMPONENT_ICONS } from '../constants/icons'
import { formatEnumLabel } from '../utils/formatters'

// Adjust to match your ComponentChangeType enum on the backend
const CHANGE_TYPES = ['Replaced', 'Repaired', 'Inspected', 'Adjusted', 'Cleaned', 'Other']

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeEmptyEntry() {
  return {
    changeType: 'Replaced',
    workDescription: '',
    newState: 'Good', // pre-filled — NewState is required on the backend
    laborCost: '',
    partsCost: '',
    otherCost: '',
  }
}

function componentLabel(comp) {
  const type = formatEnumLabel(comp.componentType)
  return comp.name ? `${type} · ${comp.name}` : type
}

function entryTotal(entry) {
  return (
    (parseFloat(entry.laborCost) || 0) +
    (parseFloat(entry.partsCost) || 0) +
    (parseFloat(entry.otherCost) || 0)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ComponentPicker
// ─────────────────────────────────────────────────────────────────────────────

function ComponentPicker({ allComponents, addedIds, onAdd, onClose }) {
  const available = allComponents.filter((c) => !addedIds.has(c.vehicleComponentId))

  return (
    <div
      style={{
        marginBottom: 8,
        background: 'var(--surface2)',
        border: '1px solid rgba(108,99,255,0.35)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border2)',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          Select Component
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}
        >
          ✕
        </button>
      </div>

      {available.length === 0 ? (
        <div
          style={{
            padding: '16px 14px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--text3)',
            textAlign: 'center',
          }}
        >
          All components have already been added.
        </div>
      ) : (
        available.map((comp, idx) => {
          const icon = COMPONENT_ICONS[comp.componentType] ?? '🔧'
          const isLast = idx === available.length - 1
          return (
            <button
              key={comp.vehicleComponentId}
              type="button"
              onClick={() => { onAdd(comp); onClose() }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '11px 14px',
                background: 'none',
                border: 'none',
                borderBottom: isLast ? 'none' : '1px solid var(--border2)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 17, flexShrink: 0 }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                  {componentLabel(comp)}
                </div>
                {comp.brand && (
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                    {comp.brand}
                  </div>
                )}
              </div>
              <span style={{ color: 'var(--accent)', fontSize: 18, flexShrink: 0 }}>+</span>
            </button>
          )
        })
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ComponentRow
// ─────────────────────────────────────────────────────────────────────────────

function ComponentRow({ comp, entry, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(true)
  const total = entryTotal(entry)
  const icon = COMPONENT_ICONS[comp.componentType] ?? '🔧'
  const set = (field) => (e) => onChange(field, e.target.value)

  return (
    <div
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        marginBottom: 8,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
        onClick={() => setExpanded((p) => !p)}
      >
        <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {componentLabel(comp)}
          </div>
          {comp.brand && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
              {comp.brand} · {entry.changeType}
            </div>
          )}
        </div>

        {total > 0 && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: 'var(--accent3)', flexShrink: 0 }}>
            {total.toFixed(2)} zł
          </span>
        )}

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 6,
            color: 'var(--red)',
            fontSize: 11,
            padding: '3px 8px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
        <span style={{ color: 'var(--text3)', fontSize: 11, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Fields */}
      {expanded && (
        <div style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Change Type</label>
              <select value={entry.changeType} onChange={set('changeType')} style={{ ...inputStyle, width: '100%' }} onFocus={onFocus} onBlur={onBlur}>
                {CHANGE_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            </div>
            <div>
              {/* Required on backend — no blank option */}
              <label style={labelStyle}>New State <span style={{ color: 'var(--red)' }}>*</span></label>
              <select value={entry.newState} onChange={set('newState')} style={{ ...inputStyle, width: '100%' }} onFocus={onFocus} onBlur={onBlur}>
                {COMPONENT_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Work Description</label>
            <textarea
              value={entry.workDescription}
              onChange={set('workDescription')}
              placeholder="What was done to this component?"
              rows={2}
              style={{ ...inputStyle, width: '100%', resize: 'vertical', lineHeight: 1.5 }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <div>
            <label style={labelStyle}>Cost Breakdown (zł)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { field: 'laborCost', label: 'Labour' },
                { field: 'partsCost', label: 'Parts' },
                { field: 'otherCost', label: 'Other' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>{label}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entry[field]}
                    onChange={set(field)}
                    placeholder="0.00"
                    style={{ ...inputStyle, width: '100%' }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              ))}
            </div>
          </div>

          {total > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(108,99,255,0.06)',
                border: '1px solid rgba(108,99,255,0.15)',
                borderRadius: 8,
                padding: '8px 12px',
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)' }}>
                COMPONENT SUBTOTAL
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent3)' }}>
                {total.toFixed(2)} zł
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function CreateRecord() {
  const { vehicleId: vehicleIdFromUrl } = useParams()
  const navigate = useNavigate()

  const [vehicles, setVehicles] = useState([])
  const [allComponents, setAllComponents] = useState([])
  const [form, setForm] = useState({
    vehicleId: vehicleIdFromUrl ?? '',
    serviceType: '',
    serviceName: '',
    serviceDate: new Date().toISOString().split('T')[0],
    cost: '',
    description: '',
  })
  const [selectedComponents, setSelectedComponents] = useState([])
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const targetVehicleId = vehicleIdFromUrl ?? form.vehicleId

  useEffect(() => {
    if (vehicleIdFromUrl) return
    getVehicles()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : []
        setVehicles(list)
        if (list.length === 1) setForm((p) => ({ ...p, vehicleId: String(list[0].vehicleId) }))
      })
      .catch(() => setError('Failed to load vehicles.'))
  }, [vehicleIdFromUrl])

  useEffect(() => {
    if (!targetVehicleId) return
    getComponentsByVehicle(targetVehicleId)
      .then((res) => setAllComponents(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
  }, [targetVehicleId])

  const addedIds = useMemo(
    () => new Set(selectedComponents.map((s) => s.comp.vehicleComponentId)),
    [selectedComponents]
  )

  const componentsTotal = useMemo(
    () =>
      selectedComponents.length === 0
        ? null
        : selectedComponents.reduce((sum, { entry }) => sum + entryTotal(entry), 0),
    [selectedComponents]
  )

  // const hasMoreComponents = allComponents.length > 0 && addedIds.size < allComponents.length

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))
  const addComponent = (comp) => setSelectedComponents((p) => [...p, { comp, entry: makeEmptyEntry() }])
  const removeComponent = (id) => setSelectedComponents((p) => p.filter((s) => s.comp.vehicleComponentId !== id))
  const updateEntry = (id, field, value) =>
    setSelectedComponents((p) =>
      p.map((s) => s.comp.vehicleComponentId === id ? { ...s, entry: { ...s.entry, [field]: value } } : s)
    )

  const backPath = targetVehicleId ? `/vehicles/${targetVehicleId}/records` : '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!targetVehicleId) { setError('Please select a vehicle.'); return }

    setError(null)
    setLoading(true)
    try {
      // ── Step 1: create the maintenance record ──────────────────────────────
      const finalCost =
        componentsTotal !== null
          ? componentsTotal
          : form.cost ? parseFloat(form.cost) : 0

      const recordRes = await createRecord({
        vehicleId: parseInt(targetVehicleId, 10),
        serviceName: form.serviceName || null,
        serviceType: form.serviceType,
        serviceDate: new Date(form.serviceDate).toISOString(),
        cost: finalCost,
        description: form.description || null,
      })

      const newRecordId = recordRes.data.maintenanceRecordId

      // ── Step 2: create each component entry with the new record's ID ───────
      // Done sequentially to avoid overwhelming the backend, but Promise.all
      // is fine too if your backend can handle concurrent inserts.
      for (const { comp, entry } of selectedComponents) {
        const compTotal = entryTotal(entry)
        await createRecordComponent({
          maintenanceRecordId: newRecordId,
          componentId: comp.vehicleComponentId,
          componentChangeType: entry.changeType,
          workDescription: entry.workDescription || null,
          newState: entry.newState,
          laborCost: entry.laborCost ? parseFloat(entry.laborCost) : null,
          partsCost: entry.partsCost ? parseFloat(entry.partsCost) : null,
          otherCost: entry.otherCost ? parseFloat(entry.otherCost) : null,
          totalCost: compTotal > 0 ? compTotal : null,
        })
      }

      navigate(`/vehicles/${targetVehicleId}/records`)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save record.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <button onClick={() => navigate(backPath)} style={backBtnStyle}>
        {targetVehicleId ? '<- Records' : '<- Home'}
      </button>

      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>New Record</div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>
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

          <FormInput label="Service Name" type="text" value={form.serviceName} onChange={set('serviceName')} placeholder="e.g., Full Oil Service" />

          <FormInput label="Service Type" value={form.serviceType} onChange={set('serviceType')} required>
            <option value="">Select a service type...</option>
            {SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>{formatEnumLabel(type)}</option>
            ))}
          </FormInput>

          <FormInput label="Service Date" type="date" value={form.serviceDate} onChange={set('serviceDate')} required />

          {componentsTotal === null ? (
            <FormInput label="Cost (zł)" type="number" value={form.cost} onChange={set('cost')} placeholder="320.00" min="0" />
          ) : (
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Total Cost (zł)</label>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(108,99,255,0.06)',
                  border: '1px solid rgba(108,99,255,0.15)',
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)' }}>
                  AUTO-CALCULATED FROM COMPONENTS
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent3)' }}>
                  {componentsTotal.toFixed(2)} zł
                </span>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="What was done?"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        </div>

        {/* ── Components section ── */}
        <div style={{ padding: '0 22px', marginBottom: 8 }}>
          
            <label style={{ ...labelStyle, marginBottom: 8 }}>
              Components
              {selectedComponents.length > 0 && (
                <span style={{ color: 'var(--accent)', marginLeft: 6 }}>· {selectedComponents.length} added</span>
              )}
            </label>

            <button
              type="button"
              onClick={() => {
                if (!targetVehicleId) {
                  setError('Please select a vehicle before adding components.')
                  return
                }
                setShowPicker((p) => !p)
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                margin: '0 0 8px',
                padding: 12,
                background: showPicker ? 'rgba(108,99,255,0.2)' : 'rgba(108,99,255,0.1)',
                border: '1px solid rgba(108,99,255,0.35)',
                borderRadius: 12,
                color: 'var(--accent)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {showPicker ? '✕ Close' : '+ Add Component'}
            </button>
          </div>

        <div style={{ padding: '0 22px', marginBottom: 8 }}>  
          {showPicker && (
            <ComponentPicker
              allComponents={allComponents}
              addedIds={addedIds}
              onAdd={addComponent}
              onClose={() => setShowPicker(false)}
            />
          )}

          {selectedComponents.map(({ comp, entry }) => (
            <ComponentRow
              key={comp.vehicleComponentId}
              comp={comp}
              entry={entry}
              onChange={(field, value) => updateEntry(comp.vehicleComponentId, field, value)}
              onRemove={() => removeComponent(comp.vehicleComponentId)}
            />
          ))}

          {allComponents.length === 0 && targetVehicleId && (
            <div
              style={{
                padding: '12px 14px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: 'var(--text3)',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              This vehicle has no components yet.
              <br />
              Add components first to track them per service.
            </div>
          )}
        </div>

        <ActionButton type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Record'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="secondary" onClick={() => navigate(backPath)}>
          Cancel
        </ActionButton>
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}