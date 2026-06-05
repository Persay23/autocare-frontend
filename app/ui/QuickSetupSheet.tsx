import { useState } from 'react'
import { createComponent } from '@/features/components/api'
import { COMPONENT_TYPES, COMPONENT_STATES } from '@/shared/enums'
import { COMPONENT_PRESETS, PRESETS_BY_TYPE, type ComponentPreset } from '@/features/components/componentTemplates'
import { prefillFromVehicle, type ComponentFormData } from '@/features/components/componentPrefill'
import { useVehiclesStore } from '@/features/vehicles/vehicleStore'
import { COMPONENT_ICONS } from '@/shared/icons'
import { formatEnumLabel } from '@/shared/formatters'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'

const STATE_COLORS: Record<string, string> = {
  Perfect: 'var(--accent4)',
  Good:    'var(--green)',
  Normal:  'var(--yellow)',
  Repair:  'var(--orange)',
  Critical:'var(--red)',
  Unknown: 'var(--text3)',
}

interface ReviewItem {
  presetId: string
  preset: ComponentPreset
  form: ComponentFormData
}

interface Props {
  vehicleId: string
  /** Names of components already tracked on this vehicle — greys out matching presets */
  existingNames: Set<string>
  onClose: () => void
  onCreated: () => void
}

export default function QuickSetupSheet({ vehicleId, existingNames, onClose, onCreated }: Props) {
  const vehicle = useVehiclesStore((s) =>
    s.vehicles.find((v) => v.vehicleId === parseInt(vehicleId, 10))
  )

  const [phase, setPhase] = useState<'pick' | 'review'>('pick')
  const [activeCategory, setActiveCategory] = useState('Engine')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const toggleSelect = (preset: ComponentPreset) => {
    if (existingNames.has(preset.name)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(preset.id)) next.delete(preset.id)
      else next.add(preset.id)
      return next
    })
  }

  const goToReview = () => {
    const selected = COMPONENT_PRESETS.filter((p) => selectedIds.has(p.id))
    const items: ReviewItem[] = selected.map((p) => ({
      presetId: p.id,
      preset: p,
      form: prefillFromVehicle(p, vehicle),
    }))
    setReviewItems(items)
    setExpandedIds(items.length > 0 ? new Set([items[0].presetId]) : new Set())
    setPhase('review')
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const updateForm = (presetId: string, field: keyof ComponentFormData, value: string) => {
    setReviewItems((prev) =>
      prev.map((item) =>
        item.presetId === presetId ? { ...item, form: { ...item.form, [field]: value } } : item
      )
    )
  }

  const removeItem = (presetId: string) => {
    setReviewItems((prev) => prev.filter((item) => item.presetId !== presetId))
    setExpandedIds((prev) => { const n = new Set(prev); n.delete(presetId); return n })
  }

  const handleCreate = async () => {
    setError(null)
    setCreating(true)
    setProgress(0)
    let done = 0
    try {
      for (const item of reviewItems) {
        const { form, preset } = item
        const mileageAtInstall = form.mileageAtInstall ? parseInt(form.mileageAtInstall, 10) : 0
        const lifetimeKm = parseInt(form.expectedLifetimeKm, 10) || preset.defaultLifetimeKm
        const lifetimeYears = parseInt(form.expectedLifetimeYears, 10) || preset.defaultLifetimeYears
        const installDate = new Date(form.installationDate)
        const nextServiceDate = new Date(form.installationDate)
        nextServiceDate.setFullYear(nextServiceDate.getFullYear() + lifetimeYears)

        await createComponent({
          vehicleId: parseInt(vehicleId, 10),
          componentType: form.componentType,
          vehicleComponentName: form.vehicleComponentName || null,
          vehicleComponentBrand: form.vehicleComponentBrand || null,
          state: form.state,
          installationDate: installDate.toISOString(),
          installedAtVehicleMileage: mileageAtInstall,
          expectedLifetimeKm: lifetimeKm,
          expectedLifetimeYears: lifetimeYears,
          partNumber: form.partNumber || null,
          warrantyKm: form.warrantyKm ? parseInt(form.warrantyKm, 10) : null,
          warrantyDate: form.warrantyDate ? new Date(form.warrantyDate).toISOString() : null,
          nextServiceRecommendedKm: mileageAtInstall + lifetimeKm,
          nextServiceRecommendedDate: nextServiceDate.toISOString(),
          notes: form.notes || null,
        })
        done++
        setProgress(done)
      }
      onCreated()
      onClose()
    } catch {
      setError('Some components could not be created. Please try again.')
      setCreating(false)
    }
  }

  const selectedCount = selectedIds.size
  const presetsInCategory = PRESETS_BY_TYPE[activeCategory] ?? []

  const dragHandle = (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
      <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
    </div>
  )

  const sheetStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '92vh',
    background: 'var(--surface)',
    borderRadius: '20px 20px 0 0',
    border: '1px solid var(--border)',
    borderBottom: 'none',
    zIndex: 201,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200 }}
      />

      <div style={sheetStyle}>
        {phase === 'pick' ? (
          <>
            {dragHandle}

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              padding: '6px 20px 10px', flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Component Library</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                  {vehicle
                    ? `${vehicle.brand} ${vehicle.model} · ${vehicle.mileage.toLocaleString()} km`
                    : 'Pick the components to track'}
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

            {/* Category tabs */}
            <div style={{
              overflowX: 'auto', display: 'flex', gap: 6,
              padding: '0 20px 12px', flexShrink: 0, scrollbarWidth: 'none',
            }}>
              {COMPONENT_TYPES.map((type) => {
                const selectedInType = (PRESETS_BY_TYPE[type] ?? []).filter((p) => selectedIds.has(p.id)).length
                const active = activeCategory === type
                return (
                  <button
                    key={type}
                    onClick={() => setActiveCategory(type)}
                    style={{
                      flexShrink: 0,
                      padding: '6px 12px',
                      borderRadius: 999,
                      border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      background: active ? 'rgba(108,99,255,0.14)' : 'var(--surface2)',
                      color: active ? 'var(--accent)' : 'var(--text2)',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      fontWeight: active ? 700 : 400,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatEnumLabel(type)}
                    {selectedInType > 0 && (
                      <span style={{
                        background: 'var(--accent)', color: '#fff',
                        borderRadius: 99, padding: '0 5px',
                        fontSize: 9, fontWeight: 700, lineHeight: '14px',
                      }}>
                        {selectedInType}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Preset grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {presetsInCategory.map((preset) => {
                  const Icon = COMPONENT_ICONS[preset.componentType] ?? COMPONENT_ICONS.Other
                  const isTracked = existingNames.has(preset.name)
                  const isSelected = selectedIds.has(preset.id)
                  return (
                    <div
                      key={preset.id}
                      onClick={() => toggleSelect(preset)}
                      style={{
                        padding: '12px',
                        borderRadius: 14,
                        background: isSelected ? 'rgba(108,99,255,0.14)' : 'var(--surface2)',
                        border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        cursor: isTracked ? 'default' : 'pointer',
                        opacity: isTracked ? 0.4 : 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        position: 'relative',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                    >
                      {isSelected && (
                        <CheckCircleIcon sx={{
                          fontSize: 14, color: 'var(--accent)',
                          position: 'absolute', top: 8, right: 8,
                        }} />
                      )}
                      <Icon sx={{ fontSize: 22, color: isSelected ? 'var(--accent)' : 'var(--accent3)' }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, marginTop: 2 }}>
                        {preset.name}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', lineHeight: 1.35 }}>
                        {isTracked ? '✓ already tracked' : preset.description}
                      </div>
                      {!isTracked && (
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--accent3)' }}>
                          {preset.defaultLifetimeKm.toLocaleString()} km · {preset.defaultLifetimeYears}y
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 16px 28px', borderTop: '1px solid var(--border)',
              background: 'var(--surface)', flexShrink: 0,
            }}>
              <button
                onClick={goToReview}
                disabled={selectedCount === 0}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 14,
                  background: selectedCount === 0
                    ? 'var(--surface2)'
                    : 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  border: selectedCount === 0 ? '1px solid var(--border)' : 'none',
                  color: selectedCount === 0 ? 'var(--text3)' : '#fff',
                  fontSize: 14, fontWeight: 700,
                  cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', letterSpacing: '0.01em',
                }}
              >
                {selectedCount === 0
                  ? 'Select components to add'
                  : `Review ${selectedCount} component${selectedCount !== 1 ? 's' : ''} →`}
              </button>
            </div>
          </>
        ) : (
          <>
            {dragHandle}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 20px 10px', flexShrink: 0 }}>
              <button
                onClick={() => setPhase('pick')}
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
                  padding: '4px 6px', display: 'flex', alignItems: 'center', flexShrink: 0,
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 16 }} />
              </button>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Review & Adjust</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>
                  {vehicle
                    ? `Estimated from ${vehicle.mileage.toLocaleString()} km · adjust as needed`
                    : 'Adjust details before saving'}
                </div>
              </div>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px' }}>
              {reviewItems.length === 0 && (
                <div style={{
                  textAlign: 'center', padding: '48px 0',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)',
                }}>
                  All removed — go back to select more.
                </div>
              )}

              {reviewItems.map((item) => {
                const isExpanded = expandedIds.has(item.presetId)
                const Icon = COMPONENT_ICONS[item.preset.componentType] ?? COMPONENT_ICONS.Other
                const stateColor = STATE_COLORS[item.form.state] ?? 'var(--text3)'

                return (
                  <div
                    key={item.presetId}
                    style={{
                      marginBottom: 8, borderRadius: 14,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Collapsed header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: 'var(--surface3)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon sx={{ fontSize: 16, color: 'var(--accent3)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                          {item.form.vehicleComponentName || item.preset.name}
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', marginTop: 2 }}>
                          {formatEnumLabel(item.preset.componentType)} · {Number(item.form.mileageAtInstall || 0).toLocaleString()} km at install
                        </div>
                      </div>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 8, fontWeight: 700,
                        color: stateColor, background: `${stateColor}22`,
                        padding: '2px 7px', borderRadius: 99, flexShrink: 0,
                      }}>
                        {item.form.state}
                      </span>
                      <button
                        onClick={() => removeItem(item.presetId)}
                        title="Remove"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text3)', padding: '2px', display: 'flex', flexShrink: 0,
                        }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                      </button>
                      <button
                        onClick={() => toggleExpand(item.presetId)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text3)', padding: '2px', display: 'flex', flexShrink: 0,
                        }}
                      >
                        <ExpandMoreIcon sx={{
                          fontSize: 18,
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                        }} />
                      </button>
                    </div>

                    {/* Expanded form */}
                    {isExpanded && (
                      <div style={{ padding: '4px 12px 14px', borderTop: '1px solid var(--border)' }}>
                        <ReviewField
                          label="Name"
                          value={item.form.vehicleComponentName}
                          onChange={(v) => updateForm(item.presetId, 'vehicleComponentName', v)}
                          placeholder="Component name"
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <ReviewField label="Brand" value={item.form.vehicleComponentBrand} onChange={(v) => updateForm(item.presetId, 'vehicleComponentBrand', v)} placeholder="Bosch" />
                          <ReviewField label="Part #" value={item.form.partNumber} onChange={(v) => updateForm(item.presetId, 'partNumber', v)} placeholder="Optional" />
                        </div>

                        {/* State chips */}
                        <div style={{ marginTop: 2, marginBottom: 10 }}>
                          <div style={{
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                            color: 'var(--text3)', textTransform: 'uppercase',
                            letterSpacing: '0.1em', marginBottom: 6,
                          }}>
                            State
                          </div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {COMPONENT_STATES.map((s) => {
                              const sc = STATE_COLORS[s] ?? 'var(--text3)'
                              const active = item.form.state === s
                              return (
                                <button
                                  key={s}
                                  onClick={() => updateForm(item.presetId, 'state', s)}
                                  style={{
                                    padding: '3px 9px', borderRadius: 99,
                                    border: active ? `1.5px solid ${sc}` : '1px solid var(--border)',
                                    background: active ? `${sc}22` : 'var(--surface)',
                                    color: active ? sc : 'var(--text3)',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 9, fontWeight: active ? 700 : 400,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {s}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <ReviewField label="Install date" value={item.form.installationDate} onChange={(v) => updateForm(item.presetId, 'installationDate', v)} type="date" />
                          <ReviewField label="Mileage at install" value={item.form.mileageAtInstall} onChange={(v) => updateForm(item.presetId, 'mileageAtInstall', v)} type="number" placeholder="0" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <ReviewField label="Lifetime km" value={item.form.expectedLifetimeKm} onChange={(v) => updateForm(item.presetId, 'expectedLifetimeKm', v)} type="number" placeholder="50000" />
                          <ReviewField label="Lifetime years" value={item.form.expectedLifetimeYears} onChange={(v) => updateForm(item.presetId, 'expectedLifetimeYears', v)} type="number" placeholder="5" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <ReviewField label="Warranty km" value={item.form.warrantyKm} onChange={(v) => updateForm(item.presetId, 'warrantyKm', v)} type="number" placeholder="Optional" />
                          <ReviewField label="Warranty until" value={item.form.warrantyDate} onChange={(v) => updateForm(item.presetId, 'warrantyDate', v)} type="date" />
                        </div>
                        <ReviewField label="Notes" value={item.form.notes} onChange={(v) => updateForm(item.presetId, 'notes', v)} placeholder="Any additional notes…" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 16px 28px', borderTop: '1px solid var(--border)',
              background: 'var(--surface)', flexShrink: 0,
            }}>
              {error && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: 'var(--red)', marginBottom: 10, textAlign: 'center',
                }}>
                  {error}
                </div>
              )}
              <button
                onClick={handleCreate}
                disabled={reviewItems.length === 0 || creating}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 14,
                  background: reviewItems.length === 0
                    ? 'var(--surface2)'
                    : 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  border: reviewItems.length === 0 ? '1px solid var(--border)' : 'none',
                  color: reviewItems.length === 0 ? 'var(--text3)' : '#fff',
                  fontSize: 14, fontWeight: 700,
                  cursor: reviewItems.length === 0 || creating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', letterSpacing: '0.01em',
                }}
              >
                {creating
                  ? `Creating… ${progress} / ${reviewItems.length}`
                  : reviewItems.length === 0
                    ? 'No components selected'
                    : `Create ${reviewItems.length} component${reviewItems.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function ReviewField({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
        color: 'var(--text3)', textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: 4,
      }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '7px 10px', borderRadius: 8,
          background: 'var(--surface)', outline: 'none',
          border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(108,99,255,0.10)' : 'none',
          color: 'var(--text)', fontSize: 12, fontFamily: 'inherit',
          boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      />
    </div>
  )
}
