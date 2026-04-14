import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import FormInput from '@/ui/FormInput'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'
import ActionButton from '@/ui/ActionButton'
import { createRecord, createRecordComponent } from '@/features/records/api'
import { updateComponent } from '@/features/components/api'
import { getVehicles } from '@/features/vehicles/api'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { getComponentsByVehicle } from '@/features/components/api'
import { dedupFetch } from '@/lib/dedup'
import { ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle, labelStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import SmartFillButton from '@/ui/SmartFillButton'
import RecordComponentPicker from '@/ui/RecordComponentPicker'
import RecordComponentRow from '@/ui/RecordComponentRow'
import { makeEmptyEntry, entryTotal } from '@/features/records/componentEntry'
import type { SelectedComponent } from '@/features/records/componentEntry'
import { SERVICE_TYPES } from '@/lib/enums'
import { formatEnumLabel } from '@/lib/formatters'
import type { Vehicle, VehicleComponent } from '@/lib/types'

export default function CreateRecord() {
  const { vehicleId: vehicleIdFromUrl } = useParams()
  const navigate = useNavigate()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [allComponents, setAllComponents] = useState<VehicleComponent[]>([])
  const storeVehicles = useVehiclesStore((s) => s.vehicles)

  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    vehicleId: vehicleIdFromUrl ?? '',
    serviceType: '',
    serviceName: '',
    startedAt: today,
    completedAt: today,
    mileage: '',
    cost: '',
    description: '',
    notes: '',
    technicianName: '',
    vendor: '',
    invoiceNumber: '',
    invoiceImageUrl: '',
  })
  const [selectedComponents, setSelectedComponents] = useState<SelectedComponent[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    dedupFetch(`components-vehicle-${targetVehicleId}`, () => getComponentsByVehicle(targetVehicleId))
      .then((res) => { if (!cancelled) setAllComponents(Array.isArray(res.data) ? res.data : []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [targetVehicleId])

  const laborDays = useMemo(() => {
    if (!form.startedAt || !form.completedAt) return null
    const diff = new Date(form.completedAt).getTime() - new Date(form.startedAt).getTime()
    const days = Math.round(diff / (1000 * 60 * 60 * 24))
    return days >= 0 ? days : null
  }, [form.startedAt, form.completedAt])

  const addedIds = useMemo(
    () => new Set(selectedComponents.map((s) => s.comp.vehicleComponentId)),
    [selectedComponents]
  )

  const componentsTotal = useMemo(
    () => selectedComponents.length === 0
      ? null
      : selectedComponents.reduce((sum, { entry }) => sum + entryTotal(entry), 0),
    [selectedComponents]
  )

  const allVehicles = vehicles.length > 0 ? vehicles : storeVehicles
  const vehicle = allVehicles.find((v) => v.vehicleId === parseInt(targetVehicleId || '0', 10))
  const minMileage = vehicle && vehicle.mileage > 0 ? vehicle.mileage : undefined
  const mileageError =
    minMileage !== undefined && form.mileage !== '' && parseInt(form.mileage, 10) < minMileage
      ? `Min ${minMileage.toLocaleString()} km · current vehicle odometer`
      : undefined

  const backPath = targetVehicleId ? `/vehicles/${targetVehicleId}/records` : '/'

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }))

  const addComponent = (comp: VehicleComponent) =>
    setSelectedComponents((p) => [...p, { comp, entry: makeEmptyEntry(comp) }])

  const removeComponent = (id: number | undefined) =>
    setSelectedComponents((p) => p.filter((s) => (s.comp.vehicleComponentId ?? s.comp.componentId) !== id))

  const updateEntry = (id: number | undefined, field: string, value: string) =>
    setSelectedComponents((p) =>
      p.map((s) =>
        (s.comp.vehicleComponentId ?? s.comp.componentId) === id
          ? { ...s, entry: { ...s.entry, [field]: value } }
          : s
      )
    )

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!targetVehicleId) { setError('Please select a vehicle.'); return }
    if (mileageError) { setError(mileageError); return }

    setError(null)
    setLoading(true)
    try {
      const finalCost = componentsTotal !== null
        ? componentsTotal
        : form.cost ? parseFloat(form.cost) : 0

      const recordRes = await createRecord({
        vehicleId: parseInt(targetVehicleId, 10),
        serviceName: form.serviceName || null,
        serviceType: form.serviceType,
        serviceDate: new Date(form.startedAt).toISOString(),
        startedAt: form.startedAt ? new Date(form.startedAt).toISOString() : null,
        completedAt: form.completedAt ? new Date(form.completedAt).toISOString() : null,
        laborDays: laborDays,
        mileage: form.mileage !== '' ? parseInt(form.mileage, 10) : null,
        cost: finalCost,
        description: form.description || null,
        notes: form.notes || null,
        technicianName: form.technicianName || null,
        vendorOrShop: form.vendor || null,
        invoiceNumber: form.invoiceNumber || null,
        invoiceImageUrl: form.invoiceImageUrl || null,
      })

      const newRecordId = recordRes.data.maintenanceRecordId

      for (const { comp, entry } of selectedComponents) {
        const compTotal = entryTotal(entry)
        const compId = comp.vehicleComponentId ?? comp.componentId
        await createRecordComponent({
          maintenanceRecordId: newRecordId,
          componentId: compId,
          componentChangeType: entry.changeType,
          customerComplaint: entry.customerComplaint || null,
          workDescription: entry.workDescription || null,
          changedParts: entry.changedParts || null,
          newState: entry.newState || 'Good',
          expectedLifetimeKm: entry.changeType === 'Replaced' && entry.expectedLifetimeKm ? parseInt(entry.expectedLifetimeKm, 10) : null,
          expectedLifetimeYears: entry.changeType === 'Replaced' && entry.expectedLifetimeYears ? parseInt(entry.expectedLifetimeYears, 10) : null,
          laborCost: entry.laborCost ? parseFloat(entry.laborCost) : null,
          partsCost: entry.partsCost ? parseFloat(entry.partsCost) : null,
          otherCost: entry.otherCost ? parseFloat(entry.otherCost) : null,
          totalCost: compTotal > 0 ? compTotal : null,
        })
        if (entry.changeType === 'Replaced') {
          const patch: Record<string, unknown> = {}
          if (entry.brand) patch.vehicleComponentBrand = entry.brand
          if (entry.partNumber) patch.partNumber = entry.partNumber
          if (entry.expectedLifetimeKm) patch.expectedLifetimeKm = parseInt(entry.expectedLifetimeKm, 10)
          if (entry.expectedLifetimeYears) patch.expectedLifetimeYears = parseInt(entry.expectedLifetimeYears, 10)
          if (entry.warrantyKm) patch.warrantyKm = parseInt(entry.warrantyKm, 10)
          if (entry.warrantyDate) patch.warrantyDate = new Date(entry.warrantyDate).toISOString()
          if (Object.keys(patch).length > 0) await updateComponent(compId!, patch)
        }
      }

      navigate(backPath)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to save record.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <button onClick={() => navigate(backPath)} style={backBtnStyle}>
        {targetVehicleId ? '<- Records' : '<- Home'}
      </button>
      {vehicleIdFromUrl && <VehicleLabel vehicleId={vehicleIdFromUrl} />}

      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>New Record</div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>
          <SmartFillButton />

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

          <FormInput label="Service Type" value={form.serviceType} onChange={set('serviceType')} required>
            <option value="">Select a service type...</option>
            {SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>{formatEnumLabel(type)}</option>
            ))}
          </FormInput>

          <FormInput label="Service Name" type="text" value={form.serviceName} onChange={set('serviceName')} placeholder="e.g., Full Oil Service" required />

          {/* Date range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <FormInput label="Started At" type="date" value={form.startedAt} onChange={set('startedAt')} required />
            <FormInput label="Completed At" type="date" value={form.completedAt} onChange={set('completedAt')} />
          </div>

          {laborDays !== null && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)',
              borderRadius: 10, padding: '9px 12px', marginBottom: 10,
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)' }}>
                LABOUR DAYS (AUTO)
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                {laborDays}d
              </span>
            </div>
          )}

          <FormInput
            label="Mileage at service (km)"
            type="number"
            value={form.mileage}
            onChange={set('mileage')}
            placeholder={minMileage ? String(minMileage) : '187300'}
            min={minMileage ?? 0}
            error={mileageError}
          />

          {componentsTotal === null ? (
            <FormInput label="Cost (zł)" type="number" value={form.cost} onChange={set('cost')} placeholder="320.00" min="0" />
          ) : (
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Total Cost (zł)</label>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)',
                borderRadius: 10, padding: '10px 12px',
              }}>
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

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Notes</label>
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

          {/* Technician & Vendor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <FormInput label="Technician" type="text" value={form.technicianName} onChange={set('technicianName')} placeholder="Jan Kowalski" />
            <FormInput label="Vendor / Shop" type="text" value={form.vendor} onChange={set('vendor')} placeholder="AutoSerwis..." />
          </div>

          <FormInput label="Invoice №" type="text" value={form.invoiceNumber} onChange={set('invoiceNumber')} placeholder="FV/2024/001" />
          <FormInput label="Invoice Image URL" type="url" value={form.invoiceImageUrl} onChange={set('invoiceImageUrl')} placeholder="https://..." />
        </div>

        {/* Components section */}
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
              if (!targetVehicleId) { setError('Please select a vehicle before adding components.'); return }
              setShowPicker((p) => !p)
            }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, margin: '0 0 8px', padding: 12,
              background: showPicker ? 'rgba(108,99,255,0.2)' : 'rgba(108,99,255,0.1)',
              border: '1px solid rgba(108,99,255,0.35)', borderRadius: 12,
              color: 'var(--accent)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showPicker ? '✕ Close' : '+ Add Component'}
          </button>

          {showPicker && (
            <RecordComponentPicker
              allComponents={allComponents}
              addedIds={addedIds}
              onAdd={addComponent}
              onClose={() => setShowPicker(false)}
            />
          )}

          {selectedComponents.map(({ comp, entry }) => (
            <RecordComponentRow
              key={comp.vehicleComponentId ?? comp.componentId}
              comp={comp}
              entry={entry}
              defaultExpanded
              onChange={(field, value) => updateEntry(comp.vehicleComponentId ?? comp.componentId, field, value)}
              onRemove={() => removeComponent(comp.vehicleComponentId ?? comp.componentId)}
            />
          ))}

          {allComponents.length === 0 && targetVehicleId && (
            <div style={{
              padding: '12px 14px', background: 'var(--surface2)',
              border: '1px solid var(--border)', borderRadius: 12,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: 'var(--text3)', textAlign: 'center', lineHeight: 1.6,
            }}>
              This vehicle has no components yet.<br />
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
