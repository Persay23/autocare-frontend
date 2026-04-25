import { useState } from 'react'
import { createComponent } from '@/features/components/api'
import { COMPONENT_TYPES } from '@/lib/enums'
import { COMPONENT_DEFAULTS } from '@/lib/componentDefaults'
import { COMPONENT_ICONS } from '@/lib/icons'
import { formatEnumLabel } from '@/lib/formatters'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'

interface Props {
  vehicleId: string
  /** Component types the vehicle already has — these are shown greyed out */
  existingTypes: Set<string>
  onClose: () => void
  onCreated: () => void
}

export default function QuickSetupSheet({ vehicleId, existingTypes, onClose, onCreated }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const toggle = (type: string) => {
    if (existingTypes.has(type)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const handleCreate = async () => {
    setError(null)
    setCreating(true)
    setProgress(0)
    const types = [...selected]
    try {
      let done = 0
      for (const type of types) {
        const defaults = COMPONENT_DEFAULTS[type] ?? COMPONENT_DEFAULTS.Other
        await createComponent({
          vehicleId: parseInt(vehicleId, 10),
          componentType: type,
          vehicleComponentName: null,
          vehicleComponentBrand: null,
          state: 'Good',
          installationDate: new Date().toISOString(),
          currentMileage: 0,
          expectedLifetimeKm: defaults.lifetimeKm,
          expectedLifetimeYears: defaults.lifetimeYears,
          notes: null,
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

  const count = selected.size

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 200,
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '82vh',
        background: 'var(--surface)',
        borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border)',
        borderBottom: 'none',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '8px 20px 14px',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Quick Setup</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--text3)',
              marginTop: 3,
            }}>
              Tap to select · defaults applied automatically
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text2)',
              cursor: 'pointer',
              padding: '4px 6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Scrollable grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {COMPONENT_TYPES.map((type) => {
              const Icon = COMPONENT_ICONS[type] ?? COMPONENT_ICONS.Other
              const isAdded = existingTypes.has(type)
              const isSelected = selected.has(type)
              const defaults = COMPONENT_DEFAULTS[type] ?? COMPONENT_DEFAULTS.Other

              return (
                <div
                  key={type}
                  onClick={() => toggle(type)}
                  style={{
                    padding: '14px 12px',
                    borderRadius: 14,
                    background: isSelected
                      ? 'rgba(108,99,255,0.14)'
                      : 'var(--surface2)',
                    border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    cursor: isAdded ? 'default' : 'pointer',
                    opacity: isAdded ? 0.4 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    position: 'relative',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {/* Checkmark */}
                  {isSelected && (
                    <CheckCircleIcon sx={{
                      fontSize: 16,
                      color: 'var(--accent)',
                      position: 'absolute',
                      top: 8,
                      right: 8,
                    }} />
                  )}

                  {/* Icon */}
                  <Icon sx={{
                    fontSize: 26,
                    color: isSelected ? 'var(--accent)' : isAdded ? 'var(--text3)' : 'var(--accent3)',
                  }} />

                  {/* Name */}
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isSelected ? 'var(--text)' : 'var(--text)',
                    lineHeight: 1.2,
                  }}>
                    {formatEnumLabel(type)}
                  </div>

                  {/* Sub-label */}
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: isAdded ? 'var(--green)' : 'var(--text3)',
                  }}>
                    {isAdded
                      ? '✓ already tracked'
                      : `${defaults.lifetimeKm.toLocaleString()} km · ${defaults.lifetimeYears}y`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px 28px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          {error && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--red)',
              marginBottom: 10,
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={count === 0 || creating}
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 14,
              background: count === 0
                ? 'var(--surface2)'
                : 'linear-gradient(135deg, var(--accent), var(--accent2))',
              border: count === 0 ? '1px solid var(--border)' : 'none',
              color: count === 0 ? 'var(--text3)' : '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: count === 0 || creating ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              letterSpacing: '0.01em',
            }}
          >
            {creating
              ? `Adding… ${progress} / ${count}`
              : count === 0
                ? 'Select components to add'
                : `Add ${count} component${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </>
  )
}
