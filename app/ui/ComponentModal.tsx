import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getComponentById, updateComponent, deleteComponent, getComponentHistory, createComponent,
} from '@/features/components/api'
import { COMPONENT_DEFAULTS } from '@/lib/componentTemplates'
import { dedupFetch } from '@/lib/dedup'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { useCurrencyStore, formatMoney } from '@/features/currency/currencyStore'
import { COMPONENT_ICONS } from '@/lib/icons'
import { formatEnumLabel } from '@/lib/formatters'
import { healthPctToState, stateColor } from '@/lib/healthState'
import type { VehicleComponent } from '@/lib/types'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

// ─── type lists ──────────────────────────────────────────────────────────────

const PRIMARY_TYPES = ['Brakes', 'Engine', 'Suspension', 'Transmission', 'Electrical']
const EXTRA_TYPES   = ['Cooling', 'Fuel', 'Exhaust', 'Tyres', 'Body', 'Other']

// ─── constants ───────────────────────────────────────────────────────────────

const CHANGE_TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  Replaced:  { bg: 'rgba(52,211,153,0.1)',  color: 'var(--green)'   },
  Repaired:  { bg: 'rgba(108,99,255,0.1)',  color: 'var(--accent)'  },
  Inspected: { bg: 'rgba(79,143,255,0.1)',  color: 'var(--accent2)' },
  Adjusted:  { bg: 'rgba(251,191,36,0.1)',  color: 'var(--yellow)'  },
  Cleaned:   { bg: 'rgba(56,189,248,0.1)',  color: 'var(--accent4)' },
  Other:     { bg: 'rgba(123,128,168,0.1)', color: 'var(--text2)'   },
}

const STATE_PILL: Record<string, { bg: string; color: string }> = {
  Perfect:  { bg: 'rgba(56,189,248,0.12)',  color: 'var(--accent4)' },
  Good:     { bg: 'rgba(52,211,153,0.12)',  color: 'var(--green)'   },
  Normal:   { bg: 'rgba(251,191,36,0.12)',  color: 'var(--yellow)'  },
  Repair:   { bg: 'rgba(251,146,60,0.12)',  color: 'var(--orange)'  },
  Critical: { bg: 'rgba(248,113,113,0.12)', color: 'var(--red)'     },
  Unknown:  { bg: 'rgba(123,128,168,0.12)', color: 'var(--text2)'   },
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function relativeFromNow(iso: string): string {
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (diff < 0)   return `${Math.abs(diff)} days ago`
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff < 30)  return `in ${diff} days`
  if (diff < 365) return `in ~${Math.round(diff / 30)} months`
  return `in ~${Math.round(diff / 365)} years`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function healthColor(pct: number): string {
  if (pct >= 75) return 'var(--accent4)'
  if (pct >= 51) return 'var(--green)'
  if (pct >= 31) return 'var(--yellow)'
  if (pct >= 16) return 'var(--orange)'
  return 'var(--red)'
}

// ─── form shape ──────────────────────────────────────────────────────────────

interface ComponentForm {
  vehicleComponentName: string
  vehicleComponentBrand: string
  installationDate: string
  lastServiceDate: string
  notes: string
  mileageAtInstall: string
  expectedLifetimeKm: string | number
  expectedLifetimeYears: string | number
  partNumber: string
  warrantyKm: string | number
  warrantyDate: string
}

// ─── sub-components ──────────────────────────────────────────────────────────

function BigInput({ label, suffix, value, onChange, placeholder }: {
  label: string; suffix?: string
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
      borderRadius: 12, padding: '10px 12px',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <input
          type="number" value={value} onChange={onChange} placeholder={placeholder} min="0"
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: 'var(--text)', fontSize: 20, fontWeight: 700, width: '100%', padding: 0,
          }}
        />
        {suffix && <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  )
}

function FieldInput({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string; placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4,
      }}>
        {label}
      </div>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '9px 11px', borderRadius: 10, boxSizing: 'border-box',
          background: 'var(--surface2)', outline: 'none',
          border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(108,99,255,0.10)' : 'none',
          color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      />
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

interface CreateForm {
  componentType: string
  vehicleComponentName: string
  vehicleComponentBrand: string
  partNumber: string
  installationDate: string
  mileageAtInstall: string
  lastServiceDate: string
  notes: string
  expectedLifetimeKm: string
  expectedLifetimeYears: string
  warrantyKm: string
  warrantyDate: string
}

interface Props {
  componentId: number | null   // null = create mode
  vehicleId: string
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

export default function ComponentModal({ componentId, vehicleId, onClose, onSaved, onDeleted }: Props) {
  const navigate = useNavigate()
  const { currency } = useCurrencyStore()
  const vehicle = useVehiclesStore((s) => s.vehicles.find((v) => String(v.vehicleId) === vehicleId))

  const isCreate = componentId === null
  const [mode, setMode]             = useState<'detail' | 'form' | 'create'>(isCreate ? 'create' : 'detail')
  const [component, setComponent]   = useState<VehicleComponent | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [history, setHistory]       = useState<any[]>([])
  const [loading, setLoading]       = useState(!isCreate)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [saving, setSaving]         = useState(false)
  const [createStep, setCreateStep] = useState(1)
  const [showMoreTypes, setShowMoreTypes] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>({
    componentType: '', vehicleComponentName: '', vehicleComponentBrand: '',
    partNumber: '', installationDate: new Date().toISOString().split('T')[0],
    mileageAtInstall: '', lastServiceDate: '', notes: '',
    expectedLifetimeKm: '', expectedLifetimeYears: '', warrantyKm: '', warrantyDate: '',
  })
  const [deleting, setDeleting]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [form, setForm]             = useState<ComponentForm | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (isCreate) return
    let cancelled = false
    setLoading(true)
    setHistoryLoading(true)
    dedupFetch(`component-${componentId}`, () => getComponentById(componentId!))
      .then((res) => {
        if (cancelled) return
        const c = res.data as VehicleComponent
        setComponent(c)
        setForm({
          vehicleComponentName:  c.vehicleComponentName ?? '',
          vehicleComponentBrand: c.vehicleComponentBrand ?? c.brand ?? '',
          installationDate:      c.installationDate ? String(c.installationDate).split('T')[0] : '',
          lastServiceDate:       c.lastServiceDate  ? String(c.lastServiceDate).split('T')[0]  : '',
          notes:                 c.notes ?? '',
          mileageAtInstall:      c.installedAtVehicleMileage != null ? String(c.installedAtVehicleMileage) : '',
          expectedLifetimeKm:    c.expectedLifetimeKm  ?? '',
          expectedLifetimeYears: c.expectedLifetimeYears ?? '',
          partNumber:            c.partNumber ?? '',
          warrantyKm:            c.warrantyKm ?? '',
          warrantyDate:          c.warrantyDate ? String(c.warrantyDate).split('T')[0] : '',
        })
        setLoading(false)
      })
    dedupFetch(`component-history-${componentId}`, () => getComponentHistory(componentId!))
      .then((res) => { if (!cancelled) setHistory(Array.isArray(res.data) ? res.data : []) })
      .catch(() => { if (!cancelled) setHistory([]) })
      .finally(() => { if (!cancelled) setHistoryLoading(false) })
    return () => { cancelled = true }
  }, [componentId])

  const setField = (field: keyof ComponentForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => p ? { ...p, [field]: e.target.value } : p)

  const handleSave = async () => {
    if (!form) return
    setError(null)
    setSaving(true)
    const mileageAtInstallParsed = form.mileageAtInstall ? parseInt(form.mileageAtInstall, 10) : null
    try {
      await updateComponent(componentId, {
        vehicleComponentName:  form.vehicleComponentName  || null,
        vehicleComponentBrand: form.vehicleComponentBrand || null,
        installationDate:      form.installationDate ? new Date(form.installationDate).toISOString() : null,
        lastServiceDate:       form.lastServiceDate  ? new Date(form.lastServiceDate).toISOString()  : null,
        notes:                 form.notes || null,
        installedAtVehicleMileage: mileageAtInstallParsed ?? null,
        expectedLifetimeKm:    form.expectedLifetimeKm    !== '' ? parseInt(String(form.expectedLifetimeKm), 10)    : null,
        expectedLifetimeYears: form.expectedLifetimeYears !== '' ? parseInt(String(form.expectedLifetimeYears), 10) : null,
        partNumber:            form.partNumber || null,
        warrantyKm:            form.warrantyKm  !== '' ? parseInt(String(form.warrantyKm), 10) : null,
        warrantyDate:          form.warrantyDate ? new Date(form.warrantyDate).toISOString() : null,
        nextServiceRecommendedKm: (mileageAtInstallParsed ?? 0) + (form.expectedLifetimeKm !== '' ? parseInt(String(form.expectedLifetimeKm), 10) : 0),
        nextServiceRecommendedDate: (() => {
          const d = new Date(form.installationDate || new Date())
          d.setFullYear(d.getFullYear() + (form.expectedLifetimeYears !== '' ? parseInt(String(form.expectedLifetimeYears), 10) : 0))
          return d.toISOString()
        })(),
      })
      onSaved()
      onClose()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to update component.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteComponent(componentId!)
      onDeleted()
    } finally {
      setDeleting(false)
    }
  }

  const setCreateField = (field: keyof CreateForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setCreateForm((p) => ({ ...p, [field]: e.target.value }))

  const selectType = (t: string) => {
    const d = COMPONENT_DEFAULTS[t] ?? COMPONENT_DEFAULTS.Other
    setCreateForm((p) => ({
      ...p,
      componentType: t,
      expectedLifetimeKm:    p.expectedLifetimeKm    || String(d.lifetimeKm),
      expectedLifetimeYears: p.expectedLifetimeYears || String(d.lifetimeYears),
    }))
  }

  const advanceCreate = () => {
    if (createStep === 1) {
      if (!createForm.componentType) { setError('Please select a component type.'); return }
      if (!createForm.vehicleComponentName.trim()) { setError('Please enter a component name.'); return }
    }
    setError(null)
    setCreateStep((p) => p + 1)
  }

  const handleCreate = async () => {
    setError(null)
    setSaving(true)
    const defaults = COMPONENT_DEFAULTS[createForm.componentType] ?? COMPONENT_DEFAULTS.Other
    const mileageAtInstall = createForm.mileageAtInstall ? parseInt(createForm.mileageAtInstall, 10) : 0
    try {
      await createComponent({
        vehicleId: parseInt(vehicleId, 10),
        componentType: createForm.componentType,
        vehicleComponentName:  createForm.vehicleComponentName  || null,
        vehicleComponentBrand: createForm.vehicleComponentBrand || null,
        state: 'Unknown',
        installationDate: new Date(createForm.installationDate).toISOString(),
        lastServiceDate:  createForm.lastServiceDate ? new Date(createForm.lastServiceDate).toISOString() : null,
        installedAtVehicleMileage: mileageAtInstall,
        expectedLifetimeKm:    createForm.expectedLifetimeKm    ? parseInt(createForm.expectedLifetimeKm, 10)    : defaults.lifetimeKm,
        expectedLifetimeYears: createForm.expectedLifetimeYears ? parseInt(createForm.expectedLifetimeYears, 10) : defaults.lifetimeYears,
        partNumber: createForm.partNumber || null,
        warrantyKm:   createForm.warrantyKm   ? parseInt(createForm.warrantyKm, 10)                        : null,
        warrantyDate: createForm.warrantyDate ? new Date(createForm.warrantyDate).toISOString()             : null,
        nextServiceRecommendedKm: mileageAtInstall + (createForm.expectedLifetimeKm ? parseInt(createForm.expectedLifetimeKm, 10) : defaults.lifetimeKm),
        nextServiceRecommendedDate: (() => {
          const d = new Date(createForm.installationDate)
          d.setFullYear(d.getFullYear() + (createForm.expectedLifetimeYears ? parseInt(createForm.expectedLifetimeYears, 10) : defaults.lifetimeYears))
          return d.toISOString()
        })(),
        notes: createForm.notes || null,
      })
      onSaved()
      onClose()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to add component.')
    } finally {
      setSaving(false)
    }
  }

  // ── health calculations ───────────────────────────────────────────────────
  const NOW_MS = Date.now()
  const c = component
  const state     = c ? (c.state ?? c.currentState ?? 'Unknown') : 'Unknown'
  const isUnknown = state === 'Unknown'
  const kmUsed    = c ? Math.max(0, (c.vehicleCurrentMileage ?? 0) - (c.installedAtVehicleMileage ?? 0)) : 0
  const kmPercent = c && c.expectedLifetimeKm > 0
    ? Math.max(0, Math.min(100, (1 - kmUsed / c.expectedLifetimeKm) * 100)) : 100
  const ageYears  = c?.installationDate
    ? (NOW_MS - new Date(c.installationDate).getTime()) / (365.25 * 24 * 3600 * 1000) : 0
  const yearsPercent = c && c.expectedLifetimeYears
    ? Math.max(0, Math.min(100, 100 - (ageYears / c.expectedLifetimeYears) * 100)) : 100
  const healthPct    = Math.min(kmPercent, yearsPercent)
  const hColor       = healthColor(healthPct)
  const derivedState = isUnknown ? 'Unknown' : healthPctToState(healthPct)
  const pill         = STATE_PILL[derivedState] ?? STATE_PILL.Unknown
  const kmColor      = stateColor(healthPctToState(kmPercent))
  const yearsColor   = stateColor(healthPctToState(yearsPercent))
  const aiHealthColor = c?.aiHealthPercent != null ? stateColor(healthPctToState(c.aiHealthPercent)) : 'var(--text)'
  const remainingKm    = c ? Math.max(0, (c.expectedLifetimeKm ?? 0) - kmUsed) : 0
  const remainingYears = c ? Math.max(0, (c.expectedLifetimeYears ?? 0) - ageYears) : 0

  const installedDate  = c?.installationDate ? fmtDate(c.installationDate) : null
  const warrantyDateStr = c?.warrantyDate ? fmtDate(c.warrantyDate) : null
  const warrantyValid   = c?.warrantyDate ? new Date(c.warrantyDate) > new Date() : false
  const aiNextDateStr   = c?.aiEstimatedNextServiceDate ? fmtDate(c.aiEstimatedNextServiceDate) : null
  const aiNextRelative  = c?.aiEstimatedNextServiceDate ? relativeFromNow(c.aiEstimatedNextServiceDate) : null
  const nextDateStr     = c?.nextServiceRecommendedDate ? fmtDate(c.nextServiceRecommendedDate) : null
  const nextRelative    = c?.nextServiceRecommendedDate ? relativeFromNow(c.nextServiceRecommendedDate) : null
  const kmAway = c?.nextServiceRecommendedKm != null ? c.nextServiceRecommendedKm - (c.vehicleCurrentMileage ?? 0) : null
  const showAiDate  = aiNextDateStr != null
  const showManDate = !showAiDate && nextDateStr != null
  const showDate    = showAiDate || showManDate
  const showAiKm    = c?.aiEstimatedRemainingKm != null
  const showManKm   = !showAiKm && c?.nextServiceRecommendedKm != null
  const showKm      = showAiKm || showManKm
  const hasWarranty    = !!(warrantyDateStr || c?.warrantyKm)
  const hasNextService = showDate || showKm

  const formattedType = c ? formatEnumLabel(c.componentType) : ''
  const CompIcon = c ? (COMPONENT_ICONS[c.componentType] ?? COMPONENT_ICONS.Other) : COMPONENT_ICONS.Other
  const displayName = c ? (c.vehicleComponentName || formattedType) : ''

  // km-since-install for edit form hint
  const mileageAtInstallParsedForm = form?.mileageAtInstall ? parseInt(form.mileageAtInstall, 10) : null
  const kmSinceInstall = mileageAtInstallParsedForm != null && vehicle?.mileage != null
    ? Math.max(0, vehicle.mileage - mileageAtInstallParsedForm) : null

  // ── UI helpers ────────────────────────────────────────────────────────────
  const sectionLbl = (text: string, mt = true) => (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
      color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em',
      marginBottom: 8, marginTop: mt ? 14 : 0,
    }}>
      {text}
    </div>
  )

  const statTile = (label: string, value: string, sub: string, valueColor = 'var(--text)') => (
    <div style={{
      background: 'var(--surface3)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 12px',
    }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: valueColor, marginBottom: 2 }}>
        {value}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
        {sub}
      </div>
    </div>
  )

  const divider = <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

  const title = mode === 'create' ? 'Add Component' : mode === 'form' ? 'Edit Component' : displayName || 'Component'

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300 }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(480px, 92vw)', maxHeight: '90vh',
        background: 'var(--surface)', borderRadius: 20,
        border: '1px solid var(--border)', zIndex: 301,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '15px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'form' && (
              <button
                onClick={() => { setMode('detail'); setError(null); setConfirmDelete(false) }}
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
              {mode === 'detail' && c && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>
                  {formattedType}{(c.vehicleComponentBrand ?? c.brand) ? ` · ${c.vehicleComponentBrand ?? c.brand}` : ''}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'detail' && !loading && c && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
                background: pill.bg, color: pill.color,
                borderRadius: 20, padding: '3px 10px',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: pill.color, display: 'inline-block' }} />
                {derivedState}
              </span>
            )}
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
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          {loading ? (
            <div style={{
              textAlign: 'center', padding: '48px 0',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)',
            }}>
              Loading…
            </div>

          ) : mode === 'detail' && c ? (
            <>
              {/* Icon + tags */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'var(--surface3)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CompIcon sx={{ fontSize: 22, color: 'var(--accent3)' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                    background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)',
                    color: 'var(--accent)', borderRadius: 20, padding: '3px 10px',
                  }}>
                    {formattedType}
                  </span>
                  {(c.vehicleComponentBrand ?? c.brand) && (
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      background: 'var(--surface3)', border: '1px solid var(--border)',
                      color: 'var(--text2)', borderRadius: 20, padding: '3px 10px',
                    }}>
                      {c.vehicleComponentBrand ?? c.brand}
                    </span>
                  )}
                  {c.partNumber && (
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      background: 'var(--surface3)', border: '1px solid var(--border)',
                      color: 'var(--text2)', borderRadius: 20, padding: '3px 10px',
                    }}>
                      {c.partNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Remaining lifespan */}
              {sectionLbl('Remaining lifespan', false)}
              {isUnknown ? (
                <div style={{
                  background: 'rgba(123,128,168,0.06)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: 14, marginBottom: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(123,128,168,0.12)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: 'var(--text3)',
                    }}>??</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 2 }}>Health unavailable</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                        Fill in the fields below to unlock tracking
                      </div>
                    </div>
                  </div>
                  <div style={{
                    height: 4, borderRadius: 3, marginBottom: 12,
                    background: 'repeating-linear-gradient(90deg, var(--border) 0px, var(--border) 6px, transparent 6px, transparent 10px)',
                  }} />
                  <button
                    onClick={() => setMode('form')}
                    style={{
                      width: '100%', padding: '9px 0', borderRadius: 10,
                      background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.3)',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
                      color: 'var(--accent)', cursor: 'pointer',
                    }}
                  >
                    Edit component →
                  </button>
                </div>
              ) : (
                <div style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: 14, marginBottom: 4,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 34, fontWeight: 800, color: hColor, lineHeight: 1 }}>
                      {Math.round(healthPct)}%
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {installedDate && (
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>
                          Installed {installedDate}
                        </div>
                      )}
                      {kmUsed > 0 && (
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                          {kmUsed.toLocaleString()} km used
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--surface3)', overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ height: '100%', width: `${healthPct}%`, background: hColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: c.aiHealthPercent != null ? 'repeat(3, 1fr)' : '1fr 1fr', gap: 8 }}>
                    {statTile('By distance', `${Math.round(kmPercent)}%`, `${remainingKm.toLocaleString()} km left`, kmColor)}
                    {statTile('By age', `${Math.round(yearsPercent)}%`, `${remainingYears.toFixed(1)} yr left`, yearsColor)}
                    {c.aiHealthPercent != null && statTile(
                      'AI adjusted', `${c.aiHealthPercent}%`,
                      c.aiConfidenceScore != null ? `${Math.round(c.aiConfidenceScore * 100)}% confidence` : 'AI score',
                      aiHealthColor,
                    )}
                  </div>
                </div>
              )}

              {/* Warranty */}
              {hasWarranty && (
                <>
                  {sectionLbl('Warranty')}
                  <div style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 14, overflow: 'hidden',
                  }}>
                    {warrantyDateStr && (
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 14px', borderBottom: c.warrantyKm ? '1px solid var(--border)' : 'none',
                      }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>Valid until</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: warrantyValid ? 'var(--green)' : 'var(--red)' }}>
                          {warrantyDateStr}
                        </span>
                      </div>
                    )}
                    {c.warrantyKm && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>Coverage</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{c.warrantyKm.toLocaleString()} km</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Next service */}
              {hasNextService && (
                <>
                  {sectionLbl('Next service')}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {showDate && statTile(
                      showAiDate ? 'AI est. date' : 'By date',
                      showAiDate ? aiNextDateStr! : nextDateStr!,
                      showAiDate ? (aiNextRelative ?? '') : (nextRelative ?? ''),
                      showAiDate ? 'var(--accent)' : undefined,
                    )}
                    {showKm && statTile(
                      showAiKm ? 'AI est. (km)' : 'By mileage',
                      showAiKm ? `${c.aiEstimatedRemainingKm!.toLocaleString()} km` : `${c.nextServiceRecommendedKm!.toLocaleString()} km`,
                      showAiKm ? 'km remaining' : (kmAway != null ? `${Math.abs(kmAway).toLocaleString()} km ${kmAway >= 0 ? 'away' : 'overdue'}` : ''),
                      showAiKm ? 'var(--accent)' : undefined,
                    )}
                  </div>
                </>
              )}

              {/* Notes */}
              {c.notes && (
                <>
                  {sectionLbl('Notes')}
                  <div style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '12px 14px',
                    borderLeft: '3px solid var(--accent)',
                  }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{c.notes}</div>
                  </div>
                </>
              )}

              {/* AI advice */}
              {sectionLbl('AI advice')}
              <div style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 14px',
              }}>
                {c.aiGeneratedAt ? (
                  <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 12 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 6 }}>
                      {c.aiRecommendation ?? 'No specific recommendation.'}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                      Generated {fmtDate(c.aiGeneratedAt)}
                      {c.aiConfidenceScore != null && ` · ${Math.round(c.aiConfidenceScore * 100)}% confidence`}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>🤖</span>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', lineHeight: 1.5 }}>
                      AI analysis pending — add a service record with this component to trigger AI advice
                    </div>
                  </div>
                )}
              </div>

              {/* Service history */}
              {sectionLbl('Service history')}
              <div style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '0 14px',
              }}>
                {historyLoading ? (
                  <div style={{ padding: '18px 0', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                    LOADING...
                  </div>
                ) : history.length === 0 ? (
                  <div style={{ padding: '18px 0', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', lineHeight: 1.6 }}>
                    No service history yet.
                  </div>
                ) : (
                  <>
                    {history.map((item) => {
                      const ctStyle = CHANGE_TYPE_STYLE[item.componentChangeType] ?? CHANGE_TYPE_STYLE.Other
                      const date = new Date(item.serviceDate as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      const total = item.totalCost ?? ((item.laborCost ?? 0) + (item.partsCost ?? 0) + (item.otherCost ?? 0))
                      return (
                        <button
                          key={item.maintenanceRecordComponentId}
                          type="button"
                          onClick={() => { onClose(); navigate(`/vehicles/${vehicleId}/records/${item.maintenanceRecordId}`) }}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            width: '100%', padding: '11px 0',
                            background: 'none', border: 'none',
                            borderBottom: '1px solid var(--border2)',
                            cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <span style={{
                            flexShrink: 0, marginTop: 2, padding: '2px 7px', borderRadius: 6,
                            fontSize: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                            background: ctStyle.bg, color: ctStyle.color, whiteSpace: 'nowrap',
                          }}>
                            {item.componentChangeType?.toUpperCase()}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
                              {item.serviceName}
                            </div>
                            {item.workDescription && (
                              <div style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.workDescription}
                              </div>
                            )}
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                              {date}{item.newState && item.newState !== 'Unknown' ? ` → ${item.newState}` : ''}
                            </div>
                          </div>
                          {total > 0 && (
                            <div style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--accent3)' }}>
                              {formatMoney(total, currency)}
                            </div>
                          )}
                        </button>
                      )
                    })}
                    <div style={{ height: 4 }} />
                  </>
                )}
              </div>

              {/* Confirm delete inline */}
              {confirmDelete && (
                <div style={{
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                  borderRadius: 12, padding: '12px', marginTop: 14,
                }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--red)', marginBottom: 10, textAlign: 'center' }}>
                    Delete this component? Cannot be undone.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setConfirmDelete(false)} style={{
                      flex: 1, padding: '9px 0', borderRadius: 10,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
                    }}>Cancel</button>
                    <button onClick={handleDelete} disabled={deleting} style={{
                      flex: 1, padding: '9px 0', borderRadius: 10,
                      background: 'var(--red)', border: 'none',
                      color: '#fff', fontSize: 12, fontWeight: 600,
                      cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
                    }}>
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                  </div>
                </div>
              )}
            </>

          ) : mode === 'form' && form ? (
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

              {/* Identity */}
              {sectionLbl('Identity', false)}
              <div style={{ marginBottom: 10 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '4px 12px', borderRadius: 999,
                  background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
                  color: 'var(--accent)',
                }}>
                  {formattedType}
                </div>
              </div>
              <FieldInput label="Name" value={form.vehicleComponentName} onChange={setField('vehicleComponentName')} placeholder="Front Axle, Brake Pads…" />
              <FieldInput label="Brand" value={form.vehicleComponentBrand} onChange={setField('vehicleComponentBrand')} placeholder="Brembo, Gates…" />
              <FieldInput label="Part no." value={form.partNumber} onChange={setField('partNumber')} placeholder="e.g. P85 020" />

              {divider}

              {/* Service */}
              {sectionLbl('Service', false)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <FieldInput label="Install date" type="date" value={form.installationDate} onChange={setField('installationDate')} />
                <FieldInput label="Mileage at install" type="number" value={form.mileageAtInstall} onChange={setField('mileageAtInstall')}
                  placeholder={vehicle?.mileage ? String(Math.max(0, vehicle.mileage - 20000)) : '0'} />
              </div>
              {vehicle?.mileage != null && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginBottom: 10 }}>
                  {kmSinceInstall !== null ? `~ ${kmSinceInstall.toLocaleString()} km used since install` : 'km used calculated automatically'}
                </div>
              )}
              <FieldInput label="Last serviced" type="date" value={form.lastServiceDate} onChange={setField('lastServiceDate')} />
              <FieldInput label="Notes" value={form.notes} onChange={setField('notes')} placeholder="Any notes…" />

              {divider}

              {/* Limits */}
              {sectionLbl('Limits', false)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
                <BigInput label="KM limit" suffix="km" value={form.expectedLifetimeKm} onChange={setField('expectedLifetimeKm') as (e: React.ChangeEvent<HTMLInputElement>) => void} placeholder="50000" />
                <BigInput label="Year limit" suffix="yr" value={form.expectedLifetimeYears} onChange={setField('expectedLifetimeYears') as (e: React.ChangeEvent<HTMLInputElement>) => void} placeholder="5" />
              </div>

              {divider}

              {/* Warranty */}
              {sectionLbl('Warranty', false)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <FieldInput label="Warranty (km)" type="number" value={form.warrantyKm} onChange={setField('warrantyKm')} placeholder="20000" />
                <FieldInput label="Warranty until" type="date" value={form.warrantyDate} onChange={setField('warrantyDate')} />
              </div>
            </>
          ) : mode === 'create' ? (
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

              {/* Step indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16 }}>
                {['Identity', 'Service', 'Limits'].map((label, i) => {
                  const n = i + 1
                  const done = n < createStep
                  const active = n === createStep
                  return (
                    <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        {i > 0 && <div style={{ flex: 1, height: 2, background: done || active ? 'var(--accent)' : 'var(--border)' }} />}
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          background: done ? 'var(--accent)' : active ? 'rgba(108,99,255,0.15)' : 'var(--surface2)',
                          border: `2px solid ${done || active ? 'var(--accent)' : 'var(--border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                          color: done ? '#fff' : active ? 'var(--accent)' : 'var(--text3)',
                        }}>
                          {done ? '✓' : n}
                        </div>
                        {i < 2 && <div style={{ flex: 1, height: 2, background: done ? 'var(--accent)' : 'var(--border)' }} />}
                      </div>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 8, marginTop: 4,
                        color: active ? 'var(--accent)' : done ? 'var(--text2)' : 'var(--text3)',
                      }}>
                        {label}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Step 1 — Identity */}
              {createStep === 1 && (
                <>
                  <FieldInput label="Component name" value={createForm.vehicleComponentName} onChange={setCreateField('vehicleComponentName')} placeholder="Front brake pads, Oil filter…" />
                  <div style={{ marginBottom: 12 }}>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)',
                      textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
                    }}>
                      Type <span style={{ color: 'var(--red)' }}>*</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {PRIMARY_TYPES.map((t) => (
                        <button key={t} type="button" onClick={() => selectType(t)} style={{
                          padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                          background: createForm.componentType === t ? 'var(--accent)' : 'transparent',
                          border: `1px solid ${createForm.componentType === t ? 'var(--accent)' : 'var(--border)'}`,
                          color: createForm.componentType === t ? '#fff' : 'var(--text2)',
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                          fontWeight: createForm.componentType === t ? 600 : 400, transition: 'all 0.15s',
                        }}>
                          {formatEnumLabel(t)}
                        </button>
                      ))}
                      {!showMoreTypes ? (
                        <button type="button" onClick={() => setShowMoreTypes(true)} style={{
                          padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                          background: EXTRA_TYPES.includes(createForm.componentType) ? 'var(--accent)' : 'transparent',
                          border: `1px solid ${EXTRA_TYPES.includes(createForm.componentType) ? 'var(--accent)' : 'var(--border)'}`,
                          color: EXTRA_TYPES.includes(createForm.componentType) ? '#fff' : 'var(--text2)',
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, transition: 'all 0.15s',
                        }}>
                          {EXTRA_TYPES.includes(createForm.componentType) ? formatEnumLabel(createForm.componentType) : '+ more'}
                        </button>
                      ) : EXTRA_TYPES.map((t) => (
                        <button key={t} type="button" onClick={() => selectType(t)} style={{
                          padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                          background: createForm.componentType === t ? 'var(--accent)' : 'transparent',
                          border: `1px solid ${createForm.componentType === t ? 'var(--accent)' : 'var(--border)'}`,
                          color: createForm.componentType === t ? '#fff' : 'var(--text2)',
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                          fontWeight: createForm.componentType === t ? 600 : 400, transition: 'all 0.15s',
                        }}>
                          {formatEnumLabel(t)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <FieldInput label="Brand" value={createForm.vehicleComponentBrand} onChange={setCreateField('vehicleComponentBrand')} placeholder="Brembo…" />
                    <FieldInput label="Part no." value={createForm.partNumber} onChange={setCreateField('partNumber')} placeholder="P85 020" />
                  </div>
                </>
              )}

              {/* Step 2 — Service */}
              {createStep === 2 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <FieldInput label="Install date" type="date" value={createForm.installationDate} onChange={setCreateField('installationDate')} />
                    <FieldInput label="Mileage at install" type="number" value={createForm.mileageAtInstall} onChange={setCreateField('mileageAtInstall')}
                      placeholder={vehicle?.mileage ? String(Math.max(0, vehicle.mileage - 20000)) : '0'} />
                  </div>
                  {vehicle?.mileage != null && createForm.mileageAtInstall && (
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginBottom: 10 }}>
                      ~ {Math.max(0, vehicle.mileage - parseInt(createForm.mileageAtInstall, 10)).toLocaleString()} km used since install
                    </div>
                  )}
                  <FieldInput label="Last serviced" type="date" value={createForm.lastServiceDate} onChange={setCreateField('lastServiceDate')} />
                  <FieldInput label="Notes" value={createForm.notes} onChange={setCreateField('notes')} placeholder="Any notes…" />
                </>
              )}

              {/* Step 3 — Limits & Warranty */}
              {createStep === 3 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    <BigInput label="KM limit" suffix="km" value={createForm.expectedLifetimeKm} onChange={setCreateField('expectedLifetimeKm') as (e: React.ChangeEvent<HTMLInputElement>) => void} placeholder="50000" />
                    <BigInput label="Year limit" suffix="yr" value={createForm.expectedLifetimeYears} onChange={setCreateField('expectedLifetimeYears') as (e: React.ChangeEvent<HTMLInputElement>) => void} placeholder="5" />
                  </div>
                  {divider}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <FieldInput label="Warranty (km)" type="number" value={createForm.warrantyKm} onChange={setCreateField('warrantyKm')} placeholder="20000" />
                    <FieldInput label="Warranty until" type="date" value={createForm.warrantyDate} onChange={setCreateField('warrantyDate')} />
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        {(mode === 'create' || !loading) && (
          <div style={{ padding: '10px 18px 18px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {mode === 'create' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={createStep < 3 ? advanceCreate : handleCreate}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 12,
                    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                    border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s',
                  }}
                >
                  {createStep < 3 ? 'Continue →' : saving ? 'Saving…' : 'Save Component'}
                </button>
                {createStep > 1 && (
                  <button
                    onClick={() => { setError(null); setCreateStep((p) => p - 1) }}
                    style={{
                      width: '100%', padding: '10px 0', borderRadius: 12,
                      background: 'transparent', border: '1px solid var(--border)',
                      color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    ← Back
                  </button>
                )}
              </div>
            ) : mode === 'detail' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setMode('form'); setConfirmDelete(false) }}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 12,
                    background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)',
                    color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Edit component
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
            ) : (
              <button
                onClick={handleSave} disabled={saving}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s',
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
