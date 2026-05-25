import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getRecordById, createRecordComponent, updateRecordComponent, deleteRecordComponent } from '@/features/records/api'
import { getComponentsByVehicle, updateComponent, getComponentHealth } from '@/features/components/api'
import { dedupFetch } from '@/lib/dedup'
import { LoadingText, ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import RecordComponentRow from '@/ui/RecordComponentRow'
import RecordComponentPicker from '@/ui/RecordComponentPicker'
import { makeEmptyEntry, entryTotal } from '@/features/records/componentEntry'
import type { ComponentEntry, SelectedComponent } from '@/features/records/componentEntry'
import { healthPctToState } from '@/lib/healthState'
import type { ComponentHealth } from '@/lib/types'
import { useTimelineStore } from '@/features/timeline/timelineStore'
import { formatEnumLabel } from '@/lib/formatters'
import type { MaintenanceRecord, VehicleComponent } from '@/lib/types'

interface ExistingEntry {
  recordComponentId: number
  comp: VehicleComponent
  entry: ComponentEntry
}

export default function RecordComponents() {
  const { vehicleId, recordId } = useParams()
  const navigate = useNavigate()
  const invalidateTimeline = useTimelineStore((s) => s.invalidate)

  const [record, setRecord] = useState<MaintenanceRecord | null>(null)
  const [allComponents, setAllComponents] = useState<VehicleComponent[]>([])
  const [existingEditable, setExistingEditable] = useState<ExistingEntry[]>([])
  const [deletedExistingIds, setDeletedExistingIds] = useState<Set<number>>(new Set())
  const [newComponents, setNewComponents] = useState<SelectedComponent[]>([])
  const [healthMap, setHealthMap] = useState<Map<number, number>>(new Map())
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vehicleId || !recordId) return
    let cancelled = false
    Promise.allSettled([
      dedupFetch(`record-${recordId}`, () => getRecordById(recordId)),
      dedupFetch(`components-vehicle-${vehicleId}`, () => getComponentsByVehicle(vehicleId)),
      getComponentHealth(vehicleId),
    ]).then(([recordRes, compRes, healthRes]) => {
      if (cancelled) return
      if (recordRes.status === 'rejected') { setError('Failed to load record.'); return }

      const map = new Map<number, number>()
      if (healthRes.status === 'fulfilled' && Array.isArray(healthRes.value.data)) {
        for (const h of healthRes.value.data as ComponentHealth[]) {
          map.set(h.componentId, Math.min(h.kmLifetimePercent ?? 0, h.yearsLifetimePercent ?? 0))
        }
      }
      setHealthMap(map)

      const r = recordRes.value.data as MaintenanceRecord
      setRecord(r)

      const allComps: VehicleComponent[] = compRes.status === 'fulfilled' && Array.isArray(compRes.value.data)
        ? compRes.value.data
        : []
      setAllComponents(allComps)

      const compMap = new Map(allComps.map((c) => [c.vehicleComponentId ?? c.componentId, c]))
      setExistingEditable((r.maintenanceRecordComponents ?? []).map((c) => {
        const matched = compMap.get(c.componentId)
        const comp = (matched ?? {
          vehicleComponentId: c.componentId,
          componentId: c.componentId,
          componentType: c.componentType ?? '',
          name: c.vehicleComponentName ?? '',
          brand: '',
          currentState: 'Unknown',
        }) as VehicleComponent
        const pct = map.get(c.componentId)
        return {
          recordComponentId: c.maintenanceRecordComponentId,
          comp,
          entry: {
            changeType: c.componentChangeType ?? c.changeType ?? '',
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
            newState: pct != null ? healthPctToState(pct) : 'Unknown',
          },
        }
      }))
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [recordId, vehicleId])

  const visibleExisting = useMemo(
    () => existingEditable.filter((e) => !deletedExistingIds.has(e.recordComponentId)),
    [existingEditable, deletedExistingIds]
  )

  const existingNonDeletedIds = useMemo(
    () => new Set(visibleExisting.map((e) => e.comp.vehicleComponentId ?? e.comp.componentId)),
    [visibleExisting]
  )

  const addedNewIds = useMemo(
    () => new Set(newComponents.map((s) => s.comp.vehicleComponentId ?? s.comp.componentId)),
    [newComponents]
  )

  const pickerExcludedIds = useMemo(
    () => new Set([...existingNonDeletedIds, ...addedNewIds]),
    [existingNonDeletedIds, addedNewIds]
  )

  const totalCount = visibleExisting.length + newComponents.length
  const filledCount = [
    ...visibleExisting.map((e) => e.entry),
    ...newComponents.map((s) => s.entry),
  ].filter((e) => e.changeType !== '').length

  const addComponent = (comp: VehicleComponent) => {
    const id = comp.vehicleComponentId ?? comp.componentId
    const pct = id != null ? healthMap.get(id) : undefined
    setNewComponents((p) => [...p, { comp, entry: makeEmptyEntry(comp, pct ?? null) }])
  }

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

  const goToRecord = () => navigate(`/vehicles/${vehicleId}/records/${recordId}`)

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    try {
      for (const id of deletedExistingIds) {
        await deleteRecordComponent(id)
      }

      for (const { recordComponentId, comp, entry } of existingEditable) {
        if (deletedExistingIds.has(recordComponentId)) continue
        if (!entry.changeType || entry.changeType === 'Skip') continue
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
        if (!entry.changeType || entry.changeType === 'Skip') continue
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

      invalidateTimeline()
      goToRecord()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to save components.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageShell><LoadingText /></PageShell>

  const subtitle = record
    ? (record.serviceName || formatEnumLabel(record.serviceType || ''))
    : null

  return (
    <PageShell>
      <button onClick={goToRecord} style={backBtnStyle}>← Service details</button>
      <VehicleLabel vehicleId={vehicleId} />

      {/* Title */}
      <div style={{ padding: '4px 22px 4px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Components affected</div>
        {subtitle && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Progress counter */}
      {totalCount > 0 && (
        <div style={{
          padding: '6px 22px 10px',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)',
        }}>
          {filledCount} of {totalCount} component{totalCount !== 1 ? 's' : ''} filled
        </div>
      )}

      <div style={{ padding: '0 22px' }}>
        {error && <ErrorBanner message={error} />}

        {/* Component cards */}
        {visibleExisting.map(({ recordComponentId, comp, entry }) => (
          <RecordComponentRow
            key={recordComponentId}
            comp={comp}
            entry={entry}
            defaultExpanded={!!entry.changeType}
            onChange={(field, value) => updateExisting(recordComponentId, field, value)}
            onRemove={() => removeExisting(recordComponentId)}
          />
        ))}

        {newComponents.map(({ comp, entry }) => (
          <RecordComponentRow
            key={comp.vehicleComponentId ?? comp.componentId}
            comp={comp}
            entry={entry}
            defaultExpanded
            onChange={(field, value) => updateNew(comp.vehicleComponentId ?? comp.componentId, field, value)}
            onRemove={() => removeNew(comp.vehicleComponentId ?? comp.componentId)}
          />
        ))}

        {/* Empty state */}
        {totalCount === 0 && !showPicker && (
          <div style={{
            padding: '24px 0', textAlign: 'center' as const,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: 'var(--text3)', lineHeight: 1.7,
          }}>
            No components linked yet.<br />
            Link components to track what was serviced.
          </div>
        )}

        {/* Picker (inline) */}
        {showPicker && (
          <div style={{ marginBottom: 8 }}>
            <RecordComponentPicker
              allComponents={allComponents}
              addedIds={pickerExcludedIds}
              onAdd={(comp) => { addComponent(comp); setShowPicker(false) }}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}

        {/* Link another component */}
        {!showPicker && (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            style={{
              width: '100%', padding: '14px 16px',
              background: 'transparent',
              border: '1.5px dashed var(--border)',
              borderRadius: 14,
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', marginBottom: 16,
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: 6, flexShrink: 0,
              border: '1px solid var(--border)',
            }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>
              Link another component
            </span>
          </button>
        )}
      </div>

      <ActionButton type="button" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save service record'}
      </ActionButton>
      <div style={{ height: 8 }} />
      <ActionButton variant="ghost" onClick={goToRecord}>Back to service details</ActionButton>
      <div style={{ height: 24 }} />
    </PageShell>
  )
}
