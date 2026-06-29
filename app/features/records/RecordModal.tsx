import { useState, useEffect, useMemo } from 'react'
import {
  getRecordById, getRecordsByVehicle,
  createRecord, updateRecord, deleteRecord,
  createRecordComponent, updateRecordComponent, deleteRecordComponent,
} from '@/features/records/api'
import { uploadReceiptImage } from '@/features/ai/api'
import SmartFillButton from '@/features/ai/SmartFillButton'
import { assetUrl } from '@/http/axios'
import { getFuelByVehicle } from '@/features/fuel/api'
import { getComponentsByVehicle, updateComponent, getComponentHealth } from '@/features/components/api'
import { dedupFetch } from '@/shared/dedup'
import {
  makeEmptyEntry, entryTotal,
  type SelectedComponent, type ComponentEntry,
} from '@/features/records/componentEntry'
import { matchPartToComponent, entryFromPart, mergePartIntoEntry } from '@/features/records/receiptParts'
import UnmatchedPartsPanel, { type UnmatchedPart } from '@/features/records/UnmatchedPartsPanel'
import FieldInput from '@/ui/FieldInput'
import { getPrecedingMinMileage, isMileageValid, type EventEntry } from '@/shared/mileageBounds'
import { useCurrencyStore, SYMBOLS, toPLN, RATES, formatMoney, convertCurrency, isSupportedCurrency } from '@/features/currency/currencyStore'
import { useTimelineStore } from '@/features/timeline/timelineStore'
import { formatEnumLabel } from '@/shared/formatters'
import { SERVICE_ICONS } from '@/shared/icons'
import RecordComponentRow from '@/features/records/RecordComponentRow'
import RecordComponentPicker from '@/features/records/RecordComponentPicker'
import type { MaintenanceRecord, VehicleComponent, ComponentHealth, ReceiptParseResult } from '@/shared/types'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

// ─── constants ────────────────────────────────────────────────────────────────

const SERVICE_TYPES = [
  'Inspection', 'RoutineService', 'Repair', 'TyreService', 'BodyAndPaint', 'Electrical', 'Other',
] as const

// ─── types ────────────────────────────────────────────────────────────────────

interface RecordForm {
  serviceName: string
  serviceType: string
  startedAt: string
  completedAt: string
  mileage: string
  cost: string
  description: string
  notes: string
  technicianName: string
  vendor: string
  invoiceNumber: string
  invoiceImageUrl: string
}

interface ExistingComp {
  mrcId: number
  comp: VehicleComponent
  entry: ComponentEntry
}

interface Props {
  vehicleId: string
  recordId: number | null      // null = create mode
  onClose: () => void
  onSaved: (id: number) => void
  onDeleted?: () => void
}

// ─── main component ───────────────────────────────────────────────────────────

export default function RecordModal({ vehicleId, recordId, onClose, onSaved, onDeleted }: Props) {
  const isCreate = recordId === null
  const { currency } = useCurrencyStore()
  const invalidateTimeline = useTimelineStore((s) => s.invalidate)
  const today = new Date().toISOString().split('T')[0]

  // ── mode / step ───────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'detail' | 'form' | 'create'>(isCreate ? 'create' : 'detail')
  const [step, setStep] = useState<1 | 2>(1)

  // ── record data ───────────────────────────────────────────────────────────
  const [record, setRecord]   = useState<MaintenanceRecord | null>(null)
  const [loading, setLoading] = useState(!isCreate)

  // ── form ──────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<RecordForm>({
    serviceName: '', serviceType: '',
    startedAt: today, completedAt: '',
    mileage: '', cost: '',
    description: '', notes: '',
    technicianName: '', vendor: '',
    invoiceNumber: '', invoiceImageUrl: '',
  })
  const [mileageUnknown, setMileageUnknown] = useState(false)
  const [showMoreDetails, setShowMoreDetails] = useState(false)

  // ── components data ───────────────────────────────────────────────────────
  const [allComponents, setAllComponents] = useState<VehicleComponent[]>([])
  const [allEvents, setAllEvents]         = useState<EventEntry[]>([])
  const [healthMap, setHealthMap]         = useState<Map<number, number>>(new Map())

  // existing components in edit mode (from record.maintenanceRecordComponents)
  const [existingComps, setExistingComps]   = useState<ExistingComp[]>([])
  const [removedMrcIds, setRemovedMrcIds]   = useState<Set<number>>(new Set())
  // new components added in current session
  const [newComponents, setNewComponents]   = useState<SelectedComponent[]>([])
  const [showPicker, setShowPicker]         = useState(false)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [focusedField, setFocusedField]   = useState<string | null>(null)

  // ── receipt scan ──────────────────────────────────────────────────────────
  // receiptFile is kept so the image can be uploaded on submit; the scan UI/state
  // (loading, banners, file picker) lives in <SmartFillButton>.
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [unmatchedParts, setUnmatchedParts] = useState<UnmatchedPart[]>([])

  // ── scroll lock ───────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ── data loading ──────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processCommonResults = (siblingsRes: any, fuelRes: any, compsRes: any, healthRes: any) => {
    const records: EventEntry[] = siblingsRes.status === 'fulfilled'
      ? (Array.isArray(siblingsRes.value.data) ? siblingsRes.value.data : []).map(
          (r: { maintenanceRecordId: number; serviceDate: string; mileage?: number | null }) => ({
            id: r.maintenanceRecordId, date: r.serviceDate, mileage: r.mileage,
          })
        ) : []
    const fuel: EventEntry[] = fuelRes.status === 'fulfilled'
      ? (Array.isArray(fuelRes.value.data) ? fuelRes.value.data : []).map(
          (e: { liquidEntryId?: number; fuelEntryId?: number; refillDate: string; mileage?: number | null }) => ({
            id: e.liquidEntryId ?? e.fuelEntryId ?? 0, date: e.refillDate, mileage: e.mileage,
          })
        ) : []
    setAllEvents([...records, ...fuel])

    const comps: VehicleComponent[] = compsRes.status === 'fulfilled' && Array.isArray(compsRes.value.data)
      ? compsRes.value.data : []
    setAllComponents(comps)

    const map = new Map<number, number>()
    if (healthRes.status === 'fulfilled' && Array.isArray(healthRes.value.data)) {
      for (const h of healthRes.value.data as ComponentHealth[]) {
        map.set(h.componentId, Math.min(h.kmLifetimePercent ?? 0, h.yearsLifetimePercent ?? 0))
      }
    }
    setHealthMap(map)

    return comps
  }

  useEffect(() => {
    let cancelled = false

    if (isCreate) {
      Promise.allSettled([
        dedupFetch(`records-vehicle-${vehicleId}`,    () => getRecordsByVehicle(vehicleId)),
        dedupFetch(`fuel-vehicle-${vehicleId}`,       () => getFuelByVehicle(vehicleId)),
        dedupFetch(`components-vehicle-${vehicleId}`, () => getComponentsByVehicle(vehicleId)),
        dedupFetch(`component-health-${vehicleId}`,   () => getComponentHealth(vehicleId)),
      ]).then(([siblingsRes, fuelRes, compsRes, healthRes]) => {
        if (cancelled) return
        processCommonResults(siblingsRes, fuelRes, compsRes, healthRes)
      })
    } else {
      Promise.allSettled([
        dedupFetch(`record-${recordId}`,              () => getRecordById(recordId!)),
        dedupFetch(`records-vehicle-${vehicleId}`,    () => getRecordsByVehicle(vehicleId)),
        dedupFetch(`fuel-vehicle-${vehicleId}`,       () => getFuelByVehicle(vehicleId)),
        dedupFetch(`components-vehicle-${vehicleId}`, () => getComponentsByVehicle(vehicleId)),
        dedupFetch(`component-health-${vehicleId}`,   () => getComponentHealth(vehicleId)),
      ]).then(([recordRes, siblingsRes, fuelRes, compsRes, healthRes]) => {
        if (cancelled) return
        const comps = processCommonResults(siblingsRes, fuelRes, compsRes, healthRes)

        if (recordRes.status === 'fulfilled') {
          const r = recordRes.value.data as MaintenanceRecord
          setRecord(r)
          setMileageUnknown(r.mileage == null)
          if (r.invoiceNumber || r.notes || r.invoiceImageUrl) setShowMoreDetails(true)
          const dateStr = r.startedAt ?? r.serviceDate ?? ''
          setForm({
            serviceName:    r.serviceName ?? '',
            serviceType:    r.serviceType ?? '',
            startedAt:      dateStr ? dateStr.split('T')[0] : today,
            completedAt:    r.completedAt ? r.completedAt.split('T')[0] : '',
            mileage:        r.mileage != null ? String(r.mileage) : '',
            cost:           r.cost != null ? String(parseFloat((r.cost * RATES[currency]).toFixed(2))) : '',
            description:    r.description ?? '',
            notes:          r.notes ?? '',
            technicianName: r.technicianName ?? '',
            vendor:         r.vendorOrShop ?? '',
            invoiceNumber:  r.invoiceNumber ?? '',
            invoiceImageUrl: r.invoiceImageUrl ?? '',
          })

          // Build existingComps from record components matched against allComponents
          if (r.maintenanceRecordComponents && comps.length > 0) {
            const compMap = new Map(comps.map((c) => [c.vehicleComponentId ?? c.componentId, c]))
            const existing: ExistingComp[] = r.maintenanceRecordComponents
              .map((mrc) => {
                const comp = compMap.get(mrc.componentId)
                if (!comp) return null
                return {
                  mrcId: mrc.maintenanceRecordComponentId,
                  comp,
                  entry: {
                    changeType:           mrc.componentChangeType ?? mrc.changeType ?? '',
                    workDescription:      mrc.workDescription ?? '',
                    changedParts:         mrc.changedParts ?? '',
                    laborCost:            mrc.laborCost != null ? String(parseFloat((mrc.laborCost * RATES[currency]).toFixed(2))) : '',
                    partsCost:            mrc.partsCost != null ? String(parseFloat((mrc.partsCost * RATES[currency]).toFixed(2))) : '',
                    otherCost:            mrc.otherCost != null ? String(parseFloat((mrc.otherCost * RATES[currency]).toFixed(2))) : '',
                    newState:             'Good',
                    customerComplaint:    mrc.customerComplaint ?? '',
                    brand:                comp.vehicleComponentBrand ?? comp.brand ?? '',
                    partNumber:           comp.partNumber ?? '',
                    expectedLifetimeKm:   mrc.expectedLifetimeKm != null
                      ? String(mrc.expectedLifetimeKm)
                      : comp.expectedLifetimeKm != null ? String(comp.expectedLifetimeKm) : '',
                    expectedLifetimeYears: mrc.expectedLifetimeYears != null
                      ? String(mrc.expectedLifetimeYears)
                      : comp.expectedLifetimeYears != null ? String(comp.expectedLifetimeYears) : '',
                    warrantyKm:   comp.warrantyKm != null ? String(comp.warrantyKm) : '',
                    warrantyDate: comp.warrantyDate ? comp.warrantyDate.split('T')[0] : '',
                  } as ComponentEntry,
                } satisfies ExistingComp
              })
              .filter((x): x is ExistingComp => x !== null)
            setExistingComps(existing)
          }
        }
        setLoading(false)
      })
    }

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, vehicleId, isCreate])

  // ── mileage validation ────────────────────────────────────────────────────

  const currentRecordId = recordId ?? 0
  const eventsForValidation = useMemo(
    () => mode !== 'detail' ? allEvents.filter((e) => e.id !== currentRecordId) : allEvents,
    [allEvents, currentRecordId, mode],
  )
  const minMileage    = getPrecedingMinMileage(eventsForValidation, form.startedAt || today)
  const mileageParsed = form.mileage !== '' ? parseInt(form.mileage, 10) : null
  const mileageError  = !mileageUnknown && !isMileageValid(mileageParsed, minMileage)
    ? `Must be at least ${minMileage.toLocaleString()} km` : undefined

  // ── labor days ────────────────────────────────────────────────────────────

  const laborDays = useMemo(() => {
    if (!form.startedAt || !form.completedAt) return 0
    const diff = new Date(form.completedAt).getTime() - new Date(form.startedAt).getTime()
    const days = Math.round(diff / (1000 * 60 * 60 * 24))
    return days >= 0 ? days : 0
  }, [form.startedAt, form.completedAt])

  // ── component helpers ─────────────────────────────────────────────────────

  const visibleExisting = useMemo(
    () => existingComps.filter((ec) => !removedMrcIds.has(ec.mrcId)),
    [existingComps, removedMrcIds],
  )

  const addedIds = useMemo(() => new Set<number | undefined>([
    ...visibleExisting.map((ec) => ec.comp.vehicleComponentId ?? ec.comp.componentId),
    ...newComponents.map((s) => s.comp.vehicleComponentId ?? s.comp.componentId),
  ]), [visibleExisting, newComponents])

  const addComponent = (comp: VehicleComponent) => {
    const id  = comp.vehicleComponentId ?? comp.componentId
    const pct = id != null ? healthMap.get(id) : undefined
    setNewComponents((p) => [...p, { comp, entry: makeEmptyEntry(comp, pct ?? null) }])
  }

  const removeExisting = (mrcId: number) =>
    setRemovedMrcIds((prev) => new Set([...prev, mrcId]))

  const updateExisting = (mrcId: number, field: string, value: string) =>
    setExistingComps((p) =>
      p.map((ec) => ec.mrcId === mrcId ? { ...ec, entry: { ...ec.entry, [field]: value } } : ec)
    )

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

  const totalComponents = visibleExisting.length + newComponents.length

  // ── step validation ───────────────────────────────────────────────────────

  const handleNextStep = () => {
    if (!form.serviceType || !form.serviceName.trim()) {
      setError('Please enter a service name and select a type.')
      return
    }
    if (!mileageUnknown && mileageError) { setError(mileageError); return }
    setError(null)
    setStep(2)
  }

  // ── receipt scan ──────────────────────────────────────────────────────────

  // Pre-fill the form from the AI result. Amounts are converted from the receipt's
  // currency to the user's display currency. Only overwrites a field when the AI
  // returned a value, so manual edits are preserved. Returns conversion info for the banner.
  const applyParsed = (r: ReceiptParseResult): { convertedFrom: string | null; unknownCurrency: string | null } => {
    setUnmatchedParts([])
    const detectedRaw = r.currency?.trim().toUpperCase() ?? ''
    const detected = isSupportedCurrency(detectedRaw) ? detectedRaw : null
    const needsConvert = detected !== null && detected !== currency
    const conv = (amt: number) => needsConvert ? convertCurrency(amt, detected!, currency) : amt
    const round2 = (n: number) => parseFloat(n.toFixed(2))

    setForm((p) => ({
      ...p,
      serviceName:    r.serviceName ?? p.serviceName,
      serviceType:    r.serviceType && (SERVICE_TYPES as readonly string[]).includes(r.serviceType)
        ? r.serviceType : p.serviceType,
      startedAt:      r.serviceDate ? r.serviceDate.split('T')[0] : p.startedAt,
      mileage:        r.mileage != null ? String(r.mileage) : p.mileage,
      cost:           r.cost != null ? String(round2(conv(r.cost))) : p.cost,
      vendor:         r.vendorOrShop ?? p.vendor,
      technicianName: r.technicianName ?? p.technicianName,
      invoiceNumber:  r.invoiceNumber ?? p.invoiceNumber,
      description:    r.description ?? p.description,
    }))
    if (r.mileage != null) setMileageUnknown(false)
    if (r.invoiceNumber) setShowMoreDetails(true)

    // Auto-link parts that match a tracked component; collect the rest for review.
    // Convert each part's cost into the display currency up front.
    const parts = (r.parts ?? []).map((pt) => ({
      ...pt,
      partsCost: pt.partsCost != null ? round2(conv(pt.partsCost)) : pt.partsCost,
    }))
    if (parts.length > 0) {
      const taken = new Set<number | undefined>(addedIds)
      const matched: SelectedComponent[] = []
      const unmatched: UnmatchedPart[] = []
      for (const part of parts) {
        const comp = matchPartToComponent(part, allComponents, taken)
        if (comp) {
          taken.add(comp.vehicleComponentId ?? comp.componentId)
          matched.push({ comp, entry: entryFromPart(part, comp) })
        } else {
          unmatched.push({ part, ignored: false })
        }
      }
      if (matched.length > 0) setNewComponents((prev) => [...prev, ...matched])
      setUnmatchedParts(unmatched)
    }

    return {
      convertedFrom: needsConvert ? detected : null,
      unknownCurrency: detectedRaw && !detected ? detectedRaw : null,
    }
  }

  // Maps a reviewed part to a chosen component. If that component is already linked
  // (auto-matched or mapped earlier), the part is folded into the existing entry so
  // several parts can share one component instead of creating duplicate rows.
  const mapUnmatchedPart = (index: number, comp: VehicleComponent) => {
    const part = unmatchedParts[index].part
    const id = comp.vehicleComponentId ?? comp.componentId

    const inNew = newComponents.some((s) => (s.comp.vehicleComponentId ?? s.comp.componentId) === id)
    const existing = visibleExisting.find((ec) => (ec.comp.vehicleComponentId ?? ec.comp.componentId) === id)

    if (inNew) {
      setNewComponents((prev) => prev.map((s) =>
        (s.comp.vehicleComponentId ?? s.comp.componentId) === id
          ? { ...s, entry: mergePartIntoEntry(s.entry, part) }
          : s
      ))
    } else if (existing) {
      setExistingComps((prev) => prev.map((ec) =>
        ec.mrcId === existing.mrcId ? { ...ec, entry: mergePartIntoEntry(ec.entry, part) } : ec
      ))
    } else {
      setNewComponents((prev) => [...prev, { comp, entry: entryFromPart(part, comp) }])
    }

    setUnmatchedParts((prev) => prev.filter((_, i) => i !== index))
  }

  // Soft ignore — keeps the row visible (struck through) and reversible until save.
  const toggleIgnoreUnmatchedPart = (index: number) =>
    setUnmatchedParts((prev) => prev.map((u, i) => i === index ? { ...u, ignored: !u.ignored } : u))

  // Called by <SmartFillButton> with the parsed receipt — prefills the form and returns
  // a short note (parts found / currency converted) for the button's success banner.
  const handleRecordParsed = (data: ReceiptParseResult): string => {
    const info = applyParsed(data)
    const bits: string[] = []
    const partCount = data.parts?.length ?? 0
    if (partCount > 0) bits.push(`${partCount} part${partCount === 1 ? '' : 's'} found.`)
    if (info.convertedFrom) bits.push(`Amounts converted from ${info.convertedFrom}.`)
    else if (info.unknownCurrency) bits.push(`Couldn't recognise currency (${info.unknownCurrency}).`)
    return bits.join(' ')
  }

  // ── save helpers ──────────────────────────────────────────────────────────

  const buildPayload = (invoiceImageUrl = form.invoiceImageUrl) => ({
    serviceName:    form.serviceName || null,
    serviceType:    form.serviceType,
    serviceDate:    new Date(form.startedAt).toISOString(),
    startedAt:      form.startedAt ? new Date(form.startedAt).toISOString() : null,
    completedAt:    form.completedAt ? new Date(form.completedAt).toISOString() : null,
    laborDays,
    mileage:        mileageUnknown || form.mileage === '' ? null : parseInt(form.mileage, 10),
    cost:           form.cost ? toPLN(parseFloat(form.cost), currency) : 0,
    description:    form.description || null,
    notes:          form.notes || null,
    technicianName: form.technicianName || null,
    vendorOrShop:   form.vendor || null,
    invoiceNumber:  form.invoiceNumber || null,
    invoiceImageUrl: invoiceImageUrl || null,
  })

  // Uploads the scanned receipt (if any) on submit and returns the URL to persist.
  const resolveInvoiceImageUrl = async () => {
    if (!receiptFile) return form.invoiceImageUrl
    const res = await uploadReceiptImage(receiptFile)
    return res.data.url
  }

  const saveNewComponents = async (targetId: number) => {
    for (const { comp, entry } of newComponents) {
      if (!entry.changeType || entry.changeType === 'Skip') continue
      const compId = comp.vehicleComponentId ?? comp.componentId
      const total  = entryTotal(entry)
      await createRecordComponent({
        maintenanceRecordId:   targetId,
        componentId:           compId,
        componentChangeType:   entry.changeType,
        customerComplaint:     entry.customerComplaint || null,
        workDescription:       entry.workDescription || null,
        changedParts:          entry.changedParts || null,
        newState:              entry.newState || 'Good',
        expectedLifetimeKm:    entry.changeType === 'Replaced' && entry.expectedLifetimeKm
          ? parseInt(entry.expectedLifetimeKm, 10) : null,
        expectedLifetimeYears: entry.changeType === 'Replaced' && entry.expectedLifetimeYears
          ? parseInt(entry.expectedLifetimeYears, 10) : null,
        laborCost:  entry.laborCost  ? toPLN(parseFloat(entry.laborCost), currency)  : null,
        partsCost:  entry.partsCost  ? toPLN(parseFloat(entry.partsCost), currency)  : null,
        otherCost:  entry.otherCost  ? toPLN(parseFloat(entry.otherCost), currency)  : null,
        totalCost:  total > 0 ? toPLN(total, currency) : null,
      })
      if (entry.changeType === 'Replaced') {
        // Only patch component master-data that actually differs from its current value —
        // avoids redundant PATCHes (and the AI re-generation they trigger) for auto-linked parts.
        const patch: Record<string, unknown> = {}
        const km = entry.expectedLifetimeKm ? parseInt(entry.expectedLifetimeKm, 10) : null
        const yr = entry.expectedLifetimeYears ? parseInt(entry.expectedLifetimeYears, 10) : null
        const wkm = entry.warrantyKm ? parseInt(entry.warrantyKm, 10) : null
        const curWarranty = comp.warrantyDate ? comp.warrantyDate.split('T')[0] : ''
        if (entry.brand && entry.brand !== (comp.vehicleComponentBrand ?? comp.brand ?? ''))
          patch.vehicleComponentBrand = entry.brand
        if (entry.partNumber && entry.partNumber !== (comp.partNumber ?? ''))
          patch.partNumber = entry.partNumber
        if (km != null && km !== (comp.expectedLifetimeKm ?? null))
          patch.expectedLifetimeKm = km
        if (yr != null && yr !== (comp.expectedLifetimeYears ?? null))
          patch.expectedLifetimeYears = yr
        if (wkm != null && wkm !== (comp.warrantyKm ?? null))
          patch.warrantyKm = wkm
        if (entry.warrantyDate && entry.warrantyDate !== curWarranty)
          patch.warrantyDate = new Date(entry.warrantyDate).toISOString()
        if (Object.keys(patch).length > 0) await updateComponent(compId!, patch)
      }
    }
  }

  // ── save handlers ─────────────────────────────────────────────────────────

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    try {
      const invoiceImageUrl = await resolveInvoiceImageUrl()
      const res = await createRecord({ vehicleId: parseInt(vehicleId, 10), ...buildPayload(invoiceImageUrl) })
      const newId = res.data.maintenanceRecordId as number
      await saveNewComponents(newId)
      invalidateTimeline()
      onSaved(newId)
    } catch {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    setSaving(true)
    setError(null)
    try {
      const invoiceImageUrl = await resolveInvoiceImageUrl()
      await updateRecord(recordId!, buildPayload(invoiceImageUrl))

      for (const mrcId of removedMrcIds) await deleteRecordComponent(mrcId)

      for (const { mrcId, entry } of existingComps) {
        if (removedMrcIds.has(mrcId)) continue
        const total = entryTotal(entry)
        await updateRecordComponent(mrcId, {
          componentChangeType: entry.changeType || null,
          customerComplaint:   entry.customerComplaint || null,
          workDescription:     entry.workDescription || null,
          changedParts:        entry.changedParts || null,
          newState:            entry.newState || 'Good',
          laborCost:  entry.laborCost  ? toPLN(parseFloat(entry.laborCost), currency)  : null,
          partsCost:  entry.partsCost  ? toPLN(parseFloat(entry.partsCost), currency)  : null,
          otherCost:  entry.otherCost  ? toPLN(parseFloat(entry.otherCost), currency)  : null,
          totalCost:  total > 0 ? toPLN(total, currency) : null,
        })
      }

      await saveNewComponents(recordId!)
      invalidateTimeline()
      onSaved(recordId!)
    } catch {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteRecord(recordId!)
      invalidateTimeline()
      onDeleted?.()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  // ── form field helpers ────────────────────────────────────────────────────

  const set = (field: keyof RecordForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))

  const focusBorder = (f: string) =>
    focusedField === f ? 'var(--accent)' : 'var(--border)'
  const focusShadow = (f: string) =>
    focusedField === f ? '0 0 0 3px rgba(108,99,255,0.10)' : 'none'

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 999,
    background: active ? 'var(--accent)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    color: active ? '#fff' : 'var(--text2)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, fontWeight: active ? 600 : 400,
    cursor: 'pointer', transition: 'all 0.15s',
  })

  const monoLbl = (text: string, mt = true): React.ReactNode => (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
      color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em',
      marginBottom: 8, marginTop: mt ? 14 : 0,
    }}>
      {text}
    </div>
  )

  const fmtDate = (iso: string | undefined) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined

  const divider = <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

  // ── header title ──────────────────────────────────────────────────────────

  const title = mode === 'create'
    ? (step === 1 ? 'New Record' : 'Components')
    : mode === 'form'
    ? (step === 1 ? 'Edit Record' : 'Edit Components')
    : (record?.serviceName || 'Record')

  const RecordIcon   = record ? (SERVICE_ICONS[record.serviceType] ?? SERVICE_ICONS.Other) : null
  const startedAtIso = record?.startedAt ?? record?.serviceDate

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300 }}
      />

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(560px, 96vw)', maxHeight: '92vh',
        background: 'var(--surface)', borderRadius: 20,
        border: '1px solid var(--border)', zIndex: 301,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '15px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'form' && step === 1 && (
              <button
                onClick={() => { setMode('detail'); setStep(1); setError(null); setConfirmDelete(false) }}
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
                  padding: '3px 5px', display: 'flex', alignItems: 'center',
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 15 }} />
              </button>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
              {(mode === 'create' || mode === 'form') && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>
                  Step {step} of 2
                </div>
              )}
              {mode === 'detail' && record && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>
                  {formatEnumLabel(record.serviceType)} · {fmtDate(startedAtIso)}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
              padding: '4px 6px', display: 'flex', alignItems: 'center',
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

          {loading ? (
            <div style={{
              textAlign: 'center', padding: '48px 0',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)',
            }}>
              Loading…
            </div>

          ) : mode === 'detail' && record ? (
            /* ─── Detail view ─────────────────────────────────────────────── */
            <>
              {/* Hero card */}
              <div style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 14, padding: 14, marginBottom: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  {RecordIcon && (
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <RecordIcon sx={{ fontSize: 20, color: 'var(--accent)' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, marginBottom: 6 }}>
                      {record.serviceName}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500,
                        background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)',
                        color: 'var(--accent)', borderRadius: 20, padding: '2px 8px',
                      }}>
                        {formatEnumLabel(record.serviceType)}
                      </span>
                      {record.mileage != null && (
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                          background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)',
                          color: 'var(--accent)', borderRadius: 20, padding: '2px 8px',
                        }}>
                          {record.mileage.toLocaleString()} km
                        </span>
                      )}
                    </div>
                  </div>
                  {record.cost > 0 && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent3)', lineHeight: 1 }}>
                        {formatMoney(record.cost, currency)}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', marginTop: 2 }}>
                        total
                      </div>
                    </div>
                  )}
                </div>

                {/* Time grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { label: 'Started',           value: fmtDate(startedAtIso) ?? '—' },
                    { label: 'Completed',          value: fmtDate(record.completedAt) ?? '—' },
                    { label: 'Duration',           value: record.laborDays != null ? `${record.laborDays}d` : '—' },
                    { label: 'Mileage at service', value: record.mileage != null ? `${record.mileage.toLocaleString()} km` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      background: 'var(--surface3)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '8px 10px',
                    }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', marginBottom: 3 }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: value === '—' ? 'var(--text3)' : 'var(--accent2)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignment */}
              {(record.technicianName || record.vendorOrShop) && (
                <>
                  {monoLbl('Assignment', false)}
                  <div style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 12, overflow: 'hidden', marginBottom: 4,
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 3 }}>Technician</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: record.technicianName ? 'var(--accent2)' : 'var(--text3)' }}>
                          {record.technicianName ?? '—'}
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 3 }}>Vendor / Shop</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: record.vendorOrShop ? 'var(--accent2)' : 'var(--text3)' }}>
                          {record.vendorOrShop ?? '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Description */}
              {record.description && (
                <>
                  {monoLbl('Description')}
                  <div style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '12px 14px', marginBottom: 4,
                    borderLeft: '3px solid var(--accent)',
                  }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{record.description}</div>
                  </div>
                </>
              )}

              {/* Notes */}
              {record.notes && (
                <>
                  {monoLbl('Notes')}
                  <div style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '12px 14px', marginBottom: 4,
                    borderLeft: '3px solid var(--accent3)',
                  }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{record.notes}</div>
                  </div>
                </>
              )}

              {/* Invoice */}
              {(record.invoiceNumber || record.invoiceImageUrl) && (
                <>
                  {monoLbl('Invoice')}
                  <div style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '12px 14px', marginBottom: 4,
                  }}>
                    {record.invoiceNumber && (
                      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: record.invoiceImageUrl ? 6 : 0 }}>
                        Invoice №: <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>{record.invoiceNumber}</span>
                      </div>
                    )}
                    {record.invoiceImageUrl && (
                      <a
                        href={assetUrl(record.invoiceImageUrl)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'block', textDecoration: 'none' }}
                      >
                        <img
                          src={assetUrl(record.invoiceImageUrl)}
                          alt="Receipt"
                          style={{
                            width: '100%', maxHeight: 320, objectFit: 'contain',
                            borderRadius: 10, border: '1px solid var(--border)',
                            background: 'var(--surface3)',
                          }}
                        />
                        <span style={{
                          display: 'inline-block', marginTop: 6,
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--accent)',
                        }}>
                          Open full size →
                        </span>
                      </a>
                    )}
                  </div>
                </>
              )}

              {/* Components serviced */}
              {(record.maintenanceRecordComponents?.length ?? 0) > 0 && (
                <>
                  {monoLbl('Components serviced')}
                  <div style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 14, overflow: 'hidden',
                  }}>
                    {record.maintenanceRecordComponents!.map((c, i, arr) => {
                      const changeType = c.componentChangeType ?? c.changeType
                      const compName = c.vehicleComponentName
                        ? (c.componentType ? `${formatEnumLabel(c.componentType)} · ${c.vehicleComponentName}` : c.vehicleComponentName)
                        : (c.componentType ? formatEnumLabel(c.componentType) : 'Unknown')
                      const isLast = i === arr.length - 1
                      return (
                        <div key={c.maintenanceRecordComponentId} style={{
                          padding: '12px 14px',
                          borderBottom: isLast ? 'none' : '1px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: changeType ? 6 : 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{compName}</div>
                            {c.totalCost != null && (
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent3)' }}>
                                {formatMoney(c.totalCost, currency)}
                              </div>
                            )}
                          </div>
                          {changeType && (
                            <span style={{
                              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600,
                              background: 'rgba(108,99,255,0.15)', color: 'var(--accent)',
                              borderRadius: 4, padding: '2px 7px',
                            }}>
                              {changeType}
                            </span>
                          )}
                          {c.workDescription && (
                            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6, lineHeight: 1.4 }}>
                              {c.workDescription}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Confirm delete */}
              {confirmDelete && (
                <div style={{
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                  borderRadius: 12, padding: '12px', marginTop: 14,
                }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--red)', marginBottom: 10, textAlign: 'center' }}>
                    Delete this record? Cannot be undone.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 10,
                        background: 'var(--surface2)', border: '1px solid var(--border)',
                        color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 10,
                        background: 'var(--red)', border: 'none',
                        color: '#fff', fontSize: 12, fontWeight: 600,
                        cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
                      }}
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                  </div>
                </div>
              )}
            </>

          ) : step === 1 ? (
            /* ─── Step 1: Basic info ──────────────────────────────────────── */
            <>
              {error && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--red)',
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 8, padding: '8px 12px', marginBottom: 12,
                }}>
                  {error}
                </div>
              )}

              {/* Receipt scan */}
              <SmartFillButton<ReceiptParseResult>
                target="record"
                label="Scan receipt to autofill"
                onFileSelected={setReceiptFile}
                onParsed={handleRecordParsed}
              />

              <FieldInput
                label="Service name"
                value={form.serviceName}
                onChange={set('serviceName') as (e: React.ChangeEvent<HTMLInputElement>) => void}
                placeholder="Oil change, Timing belt replacement…"
              />

              {monoLbl('Service type')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                {SERVICE_TYPES.map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => setForm((p) => ({ ...p, serviceType: t }))}
                    style={chip(form.serviceType === t)}
                  >
                    {formatEnumLabel(t)}
                  </button>
                ))}
              </div>

              {divider}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <FieldInput
                  label="Started"
                  value={form.startedAt}
                  onChange={set('startedAt') as (e: React.ChangeEvent<HTMLInputElement>) => void}
                  type="date"
                />
                <FieldInput
                  label="Completed (opt)"
                  value={form.completedAt}
                  onChange={set('completedAt') as (e: React.ChangeEvent<HTMLInputElement>) => void}
                  type="date"
                />
              </div>

              {/* Mileage */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                    color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>
                    Mileage (km)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMileageUnknown((p) => !p)
                      if (!mileageUnknown) setForm((p) => ({ ...p, mileage: '' }))
                    }}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                      background: mileageUnknown ? 'rgba(108,99,255,0.15)' : 'transparent',
                      border: `1px solid ${mileageUnknown ? 'rgba(108,99,255,0.35)' : 'var(--border)'}`,
                      color: mileageUnknown ? 'var(--accent)' : 'var(--text3)',
                      padding: '2px 7px', borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {mileageUnknown ? '✓ unknown' : 'unknown?'}
                  </button>
                </div>
                <input
                  type="number"
                  value={form.mileage}
                  onChange={set('mileage') as (e: React.ChangeEvent<HTMLInputElement>) => void}
                  disabled={mileageUnknown}
                  placeholder={minMileage > 0 ? String(minMileage) : '190 500'}
                  min="0"
                  onFocus={() => setFocusedField('mileage')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    width: '100%', padding: '9px 11px', borderRadius: 10, boxSizing: 'border-box',
                    background: 'var(--surface2)', outline: 'none',
                    border: `1px solid ${mileageError ? 'var(--red)' : focusBorder('mileage')}`,
                    boxShadow: mileageError ? 'none' : focusShadow('mileage'),
                    color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
                    opacity: mileageUnknown ? 0.4 : 1,
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                />
                {mileageError && !mileageUnknown && (
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--red)', marginTop: 4 }}>
                    {mileageError}
                  </div>
                )}
                {!mileageUnknown && minMileage > 0 && !mileageError && (
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>
                    Last logged: {minMileage.toLocaleString()} km
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <FieldInput
                  label="Vendor / shop (opt)"
                  value={form.vendor}
                  onChange={set('vendor') as (e: React.ChangeEvent<HTMLInputElement>) => void}
                  placeholder="AutoSerwis…"
                />
                <FieldInput
                  label="Technician (opt)"
                  value={form.technicianName}
                  onChange={set('technicianName') as (e: React.ChangeEvent<HTMLInputElement>) => void}
                  placeholder="Jan K…"
                />
              </div>

              {divider}

              {/* Cost */}
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
              }}>
                Additional cost ({SYMBOLS[currency]})
              </div>
              <div style={{
                display: 'flex', alignItems: 'stretch',
                background: 'var(--surface2)',
                border: `1px solid ${focusBorder('cost')}`,
                boxShadow: focusShadow('cost'),
                borderRadius: 12, overflow: 'hidden', marginBottom: 10,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}>
                <div style={{
                  padding: '0 14px', flexShrink: 0,
                  background: 'rgba(108,99,255,0.12)', borderRight: '1px solid rgba(108,99,255,0.2)',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
                  color: 'var(--accent)', display: 'flex', alignItems: 'center',
                }}>
                  {SYMBOLS[currency]}
                </div>
                <input
                  type="number"
                  value={form.cost}
                  onChange={set('cost') as (e: React.ChangeEvent<HTMLInputElement>) => void}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  onFocus={() => setFocusedField('cost')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: 'var(--text)', fontSize: 22, fontWeight: 700,
                    padding: '12px 14px',
                  }}
                />
              </div>

              {/* Description */}
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
              }}>
                Description (opt)
              </div>
              <textarea
                value={form.description}
                onChange={set('description')}
                placeholder="Describe the work…"
                rows={3}
                onFocus={() => setFocusedField('description')}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: '100%', padding: '9px 11px', borderRadius: 10, boxSizing: 'border-box',
                  background: 'var(--surface2)', outline: 'none',
                  border: `1px solid ${focusBorder('description')}`,
                  boxShadow: focusShadow('description'),
                  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
                  resize: 'vertical', lineHeight: 1.5, marginBottom: 8,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />

              {/* More details collapsible */}
              <button
                type="button"
                onClick={() => setShowMoreDetails((p) => !p)}
                style={{
                  width: '100%', padding: '11px 12px', textAlign: 'left',
                  background: showMoreDetails ? 'rgba(108,99,255,0.05)' : 'var(--surface2)',
                  border: `1px solid ${showMoreDetails ? 'rgba(108,99,255,0.2)' : 'var(--border)'}`,
                  borderRadius: showMoreDetails ? '12px 12px 0 0' : 12,
                  display: 'flex', alignItems: 'center', gap: 8,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>More details</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                  Invoice no., notes…
                </span>
                <span style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: 10 }}>
                  {showMoreDetails ? '▲' : '▼'}
                </span>
              </button>
              {showMoreDetails && (
                <div style={{
                  padding: '12px 12px 14px',
                  background: 'rgba(108,99,255,0.02)',
                  border: '1px solid rgba(108,99,255,0.15)', borderTop: 'none',
                  borderRadius: '0 0 12px 12px',
                }}>
                  <FieldInput
                    label="Invoice no."
                    value={form.invoiceNumber}
                    onChange={set('invoiceNumber') as (e: React.ChangeEvent<HTMLInputElement>) => void}
                    placeholder="FV/2024/001"
                  />
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                    color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em',
                    marginBottom: 6, marginTop: 2,
                  }}>
                    Additional notes
                  </div>
                  <textarea
                    value={form.notes}
                    onChange={set('notes')}
                    placeholder="Any additional notes…"
                    rows={2}
                    onFocus={() => setFocusedField('notes')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%', padding: '9px 11px', borderRadius: 10, boxSizing: 'border-box',
                      background: 'var(--surface2)', outline: 'none',
                      border: `1px solid ${focusBorder('notes')}`,
                      boxShadow: focusShadow('notes'),
                      color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
                      resize: 'vertical', lineHeight: 1.5, marginBottom: 8,
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                  />
                </div>
              )}
            </>

          ) : (
            /* ─── Step 2: Components ──────────────────────────────────────── */
            <>
              {error && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--red)',
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 8, padding: '8px 12px', marginBottom: 12,
                }}>
                  {error}
                </div>
              )}

              {/* AI-found parts not auto-linked */}
              <UnmatchedPartsPanel
                parts={unmatchedParts}
                allComponents={allComponents}
                onMap={mapUnmatchedPart}
                onToggleIgnore={toggleIgnoreUnmatchedPart}
              />

              {/* Existing components (edit mode) */}
              {visibleExisting.map(({ mrcId, comp, entry }) => (
                <RecordComponentRow
                  key={mrcId}
                  comp={comp}
                  entry={entry}
                  onChange={(field, value) => updateExisting(mrcId, field, value)}
                  onRemove={() => removeExisting(mrcId)}
                />
              ))}

              {/* Newly added components */}
              {newComponents.map(({ comp, entry }) => (
                <RecordComponentRow
                  key={comp.vehicleComponentId ?? comp.componentId}
                  comp={comp}
                  entry={entry}
                  onChange={(field, value) => updateNew(comp.vehicleComponentId ?? comp.componentId, field, value)}
                  onRemove={() => removeNew(comp.vehicleComponentId ?? comp.componentId)}
                />
              ))}

              {totalComponents === 0 && !showPicker && (
                <div style={{
                  padding: '24px 0', textAlign: 'center',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  color: 'var(--text3)', lineHeight: 1.7,
                }}>
                  No components linked yet.<br />
                  Link components to track what was serviced.
                </div>
              )}

              {showPicker && (
                <div style={{ marginBottom: 8 }}>
                  <RecordComponentPicker
                    allComponents={allComponents}
                    addedIds={addedIds}
                    onAdd={(comp) => { addComponent(comp); setShowPicker(false) }}
                    onClose={() => setShowPicker(false)}
                  />
                </div>
              )}

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
                    cursor: 'pointer', marginBottom: 8,
                  }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, border: '1px solid var(--border)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>
                    {totalComponents === 0 ? 'Link a component' : 'Link another component'}
                  </span>
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && (
          <div style={{ padding: '10px 18px 18px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {mode === 'detail' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setMode('form'); setStep(1); setError(null); setConfirmDelete(false) }}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 12,
                    background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)',
                    color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Edit record
                </button>
                {!confirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      padding: '11px 16px', borderRadius: 12,
                      background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                      color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ) : step === 1 ? (
              <button
                onClick={handleNextStep}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Next: Components →
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={isCreate ? handleCreate : handleUpdate}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 12,
                    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                    border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s',
                  }}
                >
                  {saving ? 'Saving…' : isCreate ? 'Save Record' : 'Save Changes'}
                </button>
                <button
                  onClick={() => { setError(null); setStep(1) }}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 12,
                    background: 'transparent', border: '1px solid var(--border)',
                    color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
