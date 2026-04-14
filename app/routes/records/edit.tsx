import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getRecordById, updateRecord, deleteRecord, createRecordComponent, updateRecordComponent, deleteRecordComponent } from '@/features/records/api'
import { getComponentsByVehicle, updateComponent } from '@/features/components/api'
import { dedupFetch } from '@/lib/dedup'
import { LoadingText, ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle, labelStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import FormInput from '@/ui/FormInput'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'
import { SERVICE_TYPES } from '@/lib/enums'
import { formatEnumLabel } from '@/lib/formatters'
import RecordComponentPicker from '@/ui/RecordComponentPicker'
import RecordComponentRow from '@/ui/RecordComponentRow'
import { makeEmptyEntry, entryTotal } from '@/features/records/componentEntry'
import type { ComponentEntry, SelectedComponent } from '@/features/records/componentEntry'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import type { MaintenanceRecord, VehicleComponent } from '@/lib/types'

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

interface ExistingEntry {
  recordComponentId: number
  comp: VehicleComponent
  entry: ComponentEntry
}

export default function EditRecord() {
  const { vehicleId, recordId } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState<RecordForm | null>(null)
  const [allComponents, setAllComponents] = useState<VehicleComponent[]>([])
  const [existingEditable, setExistingEditable] = useState<ExistingEntry[]>([])
  const [deletedExistingIds, setDeletedExistingIds] = useState<Set<number>>(new Set())
  const [newComponents, setNewComponents] = useState<SelectedComponent[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Track original backend values so we can tell "user cleared it" from "backend never returned it"
  const [origCompletedAt, setOrigCompletedAt] = useState<string | null | undefined>(undefined)
  const [origMileage, setOrigMileage] = useState<number | null | undefined>(undefined)

  useEffect(() => {
    if (!vehicleId || !recordId) return
    let cancelled = false
    Promise.all([
      dedupFetch(`record-${recordId}`, () => getRecordById(recordId)),
      dedupFetch(`components-vehicle-${vehicleId}`, () => getComponentsByVehicle(vehicleId)),
    ]).then(([recordRes, compRes]) => {
      if (cancelled) return
      const r = recordRes.data as MaintenanceRecord
      const allComps: VehicleComponent[] = Array.isArray(compRes.data) ? compRes.data : []
      setAllComponents(allComps)
      setOrigCompletedAt(r.completedAt ?? null)
      setOrigMileage(r.mileage ?? null)
      const dateStr = r.startedAt ?? r.serviceDate ?? ''
      setForm({
        serviceName: r.serviceName ?? '',
        serviceType: r.serviceType ?? '',
        startedAt: dateStr ? dateStr.split('T')[0] : '',
        completedAt: r.completedAt ? r.completedAt.split('T')[0] : '',
        mileage: r.mileage ?? '',
        cost: r.cost ?? '',
        description: r.description ?? '',
        notes: r.notes ?? '',
        technicianName: r.technicianName ?? '',
        vendor: r.vendorOrShop ?? '',
        invoiceNumber: r.invoiceNumber ?? '',
        invoiceImageUrl: r.invoiceImageUrl ?? '',
      })

      const compMap = new Map(allComps.map((c) => [c.vehicleComponentId ?? c.componentId, c]))
      setExistingEditable((r.maintenanceRecordComponents ?? []).map((c) => {
        const matched = compMap.get(c.componentId)
        const comp = (matched ?? {
          vehicleComponentId: c.componentId,
          componentId: c.componentId,
          componentType: c.componentType ?? '',
          name: c.vehicleComponentName ?? '',
          brand: '',
          currentState: 'Good',
        }) as VehicleComponent
        return {
          recordComponentId: c.maintenanceRecordComponentId,
          comp,
          entry: {
            changeType: c.componentChangeType ?? c.changeType ?? 'Replaced',
            workDescription: c.workDescription ?? '',
            changedParts: c.changedParts ?? '',
            customerComplaint: c.customerComplaint ?? '',
            brand: matched?.vehicleComponentBrand ?? matched?.brand ?? '',
            partNumber: matched?.partNumber ?? '',
            expectedLifetimeKm: c.expectedLifetimeKm != null ? String(c.expectedLifetimeKm) : (matched?.expectedLifetimeKm != null ? String(matched.expectedLifetimeKm) : ''),
            expectedLifetimeYears: c.expectedLifetimeYears != null ? String(c.expectedLifetimeYears) : (matched?.expectedLifetimeYears != null ? String(matched.expectedLifetimeYears) : ''),
            warrantyKm: matched?.warrantyKm != null ? String(matched.warrantyKm) : '',
            warrantyDate: matched?.warrantyDate ? String(matched.warrantyDate).split('T')[0] : '',
            laborCost: c.laborCost != null ? String(c.laborCost) : '',
            partsCost: c.partsCost != null ? String(c.partsCost) : '',
            otherCost: c.otherCost != null ? String(c.otherCost) : '',
            newState: matched?.currentState ?? 'Good',
          },
        }
      }))
    }).catch(() => setError('Failed to load record.'))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [recordId, vehicleId])

  const storeVehicles = useVehiclesStore((s) => s.vehicles)
  const vehicle = storeVehicles.find((v) => v.vehicleId === parseInt(vehicleId ?? '0', 10))
  const minMileage = vehicle && vehicle.mileage > 0 ? vehicle.mileage : undefined
  const mileageError =
    minMileage !== undefined &&
    form?.mileage !== '' &&
    form?.mileage != null &&
    parseInt(String(form.mileage), 10) < minMileage
      ? `Min ${minMileage.toLocaleString()} km · current vehicle odometer`
      : undefined

  const startedAtVal = form?.startedAt ?? ''
  const completedAtVal = form?.completedAt ?? ''
  const laborDays = (() => {
    if (!startedAtVal || !completedAtVal) return null
    const diff = new Date(completedAtVal).getTime() - new Date(startedAtVal).getTime()
    const days = Math.round(diff / (1000 * 60 * 60 * 24))
    return days >= 0 ? days : null
  })()

  const existingNonDeletedIds = useMemo(
    () => new Set(
      existingEditable
        .filter((e) => !deletedExistingIds.has(e.recordComponentId))
        .map((e) => e.comp.vehicleComponentId ?? e.comp.componentId)
    ),
    [existingEditable, deletedExistingIds]
  )

  const addedNewIds = useMemo(
    () => new Set(newComponents.map((s) => s.comp.vehicleComponentId ?? s.comp.componentId)),
    [newComponents]
  )

  const pickerExcludedIds = useMemo(
    () => new Set([...existingNonDeletedIds, ...addedNewIds]),
    [existingNonDeletedIds, addedNewIds]
  )

  const newComponentsTotal = useMemo(
    () => newComponents.length === 0
      ? null
      : newComponents.reduce((sum, { entry }) => sum + entryTotal(entry), 0),
    [newComponents]
  )

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev)

  const addComponent = (comp: VehicleComponent) =>
    setNewComponents((p) => [...p, { comp, entry: makeEmptyEntry(comp) }])

  const removeNew = (id: number | undefined) =>
    setNewComponents((p) => p.filter((s) => (s.comp.vehicleComponentId ?? s.comp.componentId) !== id))

  const updateNew = (id: number | undefined, field: string, value: string) =>
    setNewComponents((p) =>
      p.map((s) =>
        (s.comp.vehicleComponentId ?? s.comp.componentId) === id
          ? { ...s, entry: { ...s.entry, [field]: value } }
          : s
      )
    )

  const removeExisting = (recordComponentId: number) =>
    setDeletedExistingIds((p) => new Set([...p, recordComponentId]))

  const updateExisting = (recordComponentId: number, field: string, value: string) =>
    setExistingEditable((p) =>
      p.map((e) =>
        e.recordComponentId === recordComponentId
          ? { ...e, entry: { ...e.entry, [field]: value } }
          : e
      )
    )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    if (mileageError) { setError(mileageError); return }
    setError(null)
    setSaving(true)
    try {
      // For completedAt and mileage: only include in PATCH when the form has a value,
      // OR when the original had a value and the user cleared it (explicit clear).
      // This prevents the edit form from wiping stored values when the backend's GET
      // omits these optional fields (returning null even though a value is stored).
      const completedAtPatch = form.completedAt
        ? { completedAt: new Date(form.completedAt).toISOString() }
        : origCompletedAt != null ? { completedAt: null } : {}

      const mileagePatch = form.mileage !== '' && form.mileage != null
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
        cost: form.cost ? parseFloat(String(form.cost)) : 0,
        description: form.description || null,
        notes: form.notes || null,
        technicianName: form.technicianName || null,
        vendorOrShop: form.vendor || null,
        invoiceNumber: form.invoiceNumber || null,
        invoiceImageUrl: form.invoiceImageUrl || null,
      })

      for (const id of deletedExistingIds) {
        await deleteRecordComponent(id)
      }

      for (const { recordComponentId, comp, entry } of existingEditable) {
        if (deletedExistingIds.has(recordComponentId)) continue
        const compTotal = entryTotal(entry)
        await updateRecordComponent(recordComponentId, {
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
          const compId = comp.vehicleComponentId ?? comp.componentId
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

      for (const { comp, entry } of newComponents) {
        const compTotal = entryTotal(entry)
        const compId = comp.vehicleComponentId ?? comp.componentId
        await createRecordComponent({
          maintenanceRecordId: parseInt(recordId!, 10),
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

      navigate(`/vehicles/${vehicleId}/records/${recordId}`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to update record.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    await deleteRecord(recordId!)
    navigate(`/vehicles/${vehicleId}/records`)
  }

  if (loading || !form) return <PageShell><LoadingText /></PageShell>

  const visibleExisting = existingEditable.filter((e) => !deletedExistingIds.has(e.recordComponentId))

  return (
    <PageShell>
      <button onClick={() => navigate(`/vehicles/${vehicleId}/records/${recordId}`)} style={backBtnStyle}>
        {'<-'} Record
      </button>
      <VehicleLabel vehicleId={vehicleId} />
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Edit Record</div>
        {form.serviceName && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
            {form.serviceName}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>
          <FormInput label="Service Type" value={form.serviceType} onChange={set('serviceType')}>
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>{formatEnumLabel(t)}</option>
            ))}
          </FormInput>

          <FormInput label="Service Name" type="text" value={form.serviceName} onChange={set('serviceName')} placeholder="e.g., Oil Change" required />

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
            min="0"
            error={mileageError}
          />
          <FormInput label="Cost (zł)" type="number" value={form.cost} onChange={set('cost')} placeholder="320.00" min="0" />

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <FormInput label="Technician" type="text" value={form.technicianName} onChange={set('technicianName')} placeholder="Jan Kowalski" />
            <FormInput label="Vendor / Shop" type="text" value={form.vendor} onChange={set('vendor')} placeholder="AutoSerwis..." />
          </div>

          <FormInput label="Invoice №" type="text" value={form.invoiceNumber} onChange={set('invoiceNumber')} placeholder="FV/2024/001" />
          <FormInput label="Invoice Image URL" type="url" value={form.invoiceImageUrl} onChange={set('invoiceImageUrl')} placeholder="https://..." />
        </div>

        {/* Existing components — editable */}
        <div style={{ padding: '0 22px', marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 8 }}>
            Components
            {visibleExisting.length > 0 && (
              <span style={{ color: 'var(--text2)', marginLeft: 6 }}>· {visibleExisting.length}</span>
            )}
          </label>

          {visibleExisting.map(({ recordComponentId, comp, entry }) => (
            <RecordComponentRow
              key={recordComponentId}
              comp={comp}
              entry={entry}
              onChange={(field, value) => updateExisting(recordComponentId, field, value)}
              onRemove={() => removeExisting(recordComponentId)}
            />
          ))}

          {visibleExisting.length === 0 && newComponents.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '14px 0',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text2)',
            }}>
              No components logged
            </div>
          )}
        </div>

        {/* Add new components */}
        <div style={{ padding: '0 22px', marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 8 }}>
            Add Components
            {newComponents.length > 0 && (
              <span style={{ color: 'var(--accent)', marginLeft: 6 }}>· {newComponents.length} new</span>
            )}
          </label>

          <button
            type="button"
            onClick={() => setShowPicker((p) => !p)}
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
              addedIds={pickerExcludedIds}
              onAdd={addComponent}
              onClose={() => setShowPicker(false)}
            />
          )}

          {newComponents.map(({ comp, entry }) => (
            <RecordComponentRow
              key={comp.vehicleComponentId ?? comp.componentId}
              comp={comp}
              entry={entry}
              onChange={(field, value) => updateNew(comp.vehicleComponentId ?? comp.componentId, field, value)}
              onRemove={() => removeNew(comp.vehicleComponentId ?? comp.componentId)}
            />
          ))}

          {newComponentsTotal !== null && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)',
              borderRadius: 10, padding: '10px 12px', marginTop: 4,
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)' }}>
                NEW COMPONENTS TOTAL
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent3)' }}>
                {newComponentsTotal.toFixed(2)} zł
              </span>
            </div>
          )}
        </div>

        <ActionButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/records/${recordId}`)}>
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
