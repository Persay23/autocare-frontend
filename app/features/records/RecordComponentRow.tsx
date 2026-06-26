import { useState } from 'react'
import type { VehicleComponent } from '@/shared/types'
import type { ComponentEntry } from '@/features/records/componentEntry'
import { entryTotal } from '@/features/records/componentEntry'
import { COMPONENT_ICONS } from '@/shared/icons'
import { formatEnumLabel } from '@/shared/formatters'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'
import { useCurrencyStore, SYMBOLS } from '@/features/currency/currencyStore'

const STATUS_COLORS: Record<string, string> = {
  Replaced:  'var(--green)',
  Repaired:  'var(--orange)',
  Inspected: 'var(--accent4)',
  Adjusted:  'var(--accent2)',
  Cleaned:   'var(--accent3)',
  Other:     'var(--text2)',
  Skip:      'var(--text2)',
}

const CHIP_TYPES = ['Replaced', 'Repaired', 'Inspected', 'Skip']

interface Props {
  comp: VehicleComponent
  entry: ComponentEntry
  onChange: (field: string, value: string) => void
  onRemove: () => void
  defaultExpanded?: boolean
}

function compDisplayName(comp: VehicleComponent): string {
  const type = formatEnumLabel(comp.componentType)
  const name = comp.name || comp.vehicleComponentName
  return name ? `${type} · ${name}` : type
}

function StatusPill({ changeType }: { changeType: string }) {
  const label = changeType || 'Pending'
  const color = STATUS_COLORS[changeType] ?? 'var(--text3)'
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
      color,
      background: changeType ? `${color}1a` : 'rgba(255,255,255,0.05)',
      border: `1px solid ${changeType ? `${color}33` : 'var(--border)'}`,
      padding: '3px 8px', borderRadius: 4, letterSpacing: '0.06em', flexShrink: 0,
    }}>
      {label.toUpperCase()}
    </span>
  )
}

export default function RecordComponentRow({
  comp, entry, onChange, onRemove, defaultExpanded = false,
}: Props) {
  const { currency } = useCurrencyStore()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [showPartData, setShowPartData] = useState(() => entry.changeType === 'Replaced')

  const CompIcon = COMPONENT_ICONS[comp.componentType] ?? COMPONENT_ICONS.Other
  const brand = comp.vehicleComponentBrand || comp.brand
  const lastDate = comp.lastServiceDate
    ? new Date(comp.lastServiceDate).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null
  const subtitle = [brand, lastDate ? `last: ${lastDate}` : null].filter(Boolean).join(' · ')

  const total = entryTotal(entry)
  const isPending = !entry.changeType
  const isSkip = entry.changeType === 'Skip'
  const statusColor = STATUS_COLORS[entry.changeType] ?? 'var(--accent)'

  const lbl = (text: string) => (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
      textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6,
    }}>
      {text}
    </div>
  )

  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 14, marginBottom: 8, overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded((p) => !p)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: isPending ? 'rgba(255,255,255,0.04)' : `${statusColor}1a`,
          border: `1px solid ${isPending ? 'var(--border)' : `${statusColor}33`}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CompIcon sx={{ fontSize: 18, color: isPending ? 'var(--text3)' : statusColor }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: subtitle ? 2 : 0 }}>
            {compDisplayName(comp)}
          </div>
          {subtitle && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              {subtitle}
            </div>
          )}
        </div>

        <StatusPill changeType={entry.changeType} />

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          style={{
            width: 24, height: 24, borderRadius: 6, flexShrink: 0,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text3)', fontSize: 11, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border)' }}>

          {/* What happened? */}
          {lbl('What happened?')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {CHIP_TYPES.map((ct) => {
              const active = entry.changeType === ct
              const col = STATUS_COLORS[ct] ?? 'var(--accent)'
              return (
                <button
                  key={ct}
                  type="button"
                  onClick={() => {
                    onChange('changeType', ct)
                    if (ct === 'Replaced') setShowPartData(true)
                  }}
                  style={{
                    padding: '6px 14px', borderRadius: 999,
                    background: active ? col : 'transparent',
                    border: `1px solid ${active ? col : 'var(--border)'}`,
                    color: active ? '#fff' : 'var(--text2)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11, fontWeight: active ? 700 : 400,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {ct}
                </button>
              )
            })}
          </div>

          {/* Non-skip body */}
          {!isPending && !isSkip && (
            <>
              {lbl('Work done')}
              <textarea
                value={entry.workDescription}
                onChange={(e) => onChange('workDescription', e.target.value)}
                placeholder="What was done to this component?"
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, marginBottom: 14 }}
                onFocus={onFocus}
                onBlur={onBlur}
              />

              {lbl(`Cost breakdown (${SYMBOLS[currency]})`)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
                {([
                  { field: 'laborCost', label: 'Labour' },
                  { field: 'partsCost', label: 'Parts' },
                  { field: 'otherCost', label: 'Other' },
                ] as const).map(({ field, label }) => (
                  <div key={field} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px',
                  }}>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                      color: 'var(--text3)', textTransform: 'uppercase' as const,
                      letterSpacing: '0.1em', marginBottom: 4,
                    }}>
                      {label}
                    </div>
                    <input
                      type="number" min="0" step="0.01"
                      value={entry[field]}
                      onChange={(e) => onChange(field, e.target.value)}
                      placeholder="0"
                      style={{
                        background: 'none', border: 'none', outline: 'none',
                        color: 'var(--text)', fontSize: 16, fontWeight: 700,
                        width: '100%', padding: 0,
                      }}
                    />
                  </div>
                ))}
              </div>

              {total > 0 && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)',
                  borderRadius: 8, padding: '8px 12px', marginBottom: 10,
                }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)' }}>
                    SUBTOTAL
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent3)' }}>
                    {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {SYMBOLS[currency]}
                  </span>
                </div>
              )}

              {/* Update part data toggle */}
              <button
                type="button"
                onClick={() => setShowPartData((p) => !p)}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: showPartData ? 'rgba(108,99,255,0.06)' : 'var(--surface)',
                  border: `1px solid ${showPartData ? 'rgba(108,99,255,0.2)' : 'var(--border)'}`,
                  borderRadius: showPartData ? '10px 10px 0 0' : 10,
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  background: showPartData ? 'var(--accent)' : 'transparent',
                  border: `1.5px solid ${showPartData ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {showPartData && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
                </div>
                <div style={{ textAlign: 'left' as const, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Update part data</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>
                    New brand, lifetime, warranty...
                  </div>
                </div>
                <span style={{ color: 'var(--text3)', fontSize: 10 }}>{showPartData ? '▲' : '▼'}</span>
              </button>

              {showPartData && (
                <div style={{
                  padding: '12px 12px 14px',
                  background: 'rgba(108,99,255,0.02)',
                  border: '1px solid rgba(108,99,255,0.15)', borderTop: 'none',
                  borderRadius: '0 0 10px 10px',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Brand</div>
                      <input type="text" value={entry.brand} onChange={(e) => onChange('brand', e.target.value)} placeholder="Brembo, Gates..." style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>
                        Part no.{' '}<span style={{ fontSize: 7, opacity: 0.6 }}>opt</span>
                      </div>
                      <input type="text" value={entry.partNumber} onChange={(e) => onChange('partNumber', e.target.value)} placeholder="P85..." style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Lifetime (km)</div>
                      <input type="number" min="0" value={entry.expectedLifetimeKm} onChange={(e) => onChange('expectedLifetimeKm', e.target.value)} placeholder="50 000" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Lifetime (yr)</div>
                      <input type="number" min="0" max="50" value={entry.expectedLifetimeYears} onChange={(e) => onChange('expectedLifetimeYears', e.target.value)} placeholder="5" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Warranty (km)</div>
                      <input type="number" min="0" value={entry.warrantyKm} onChange={(e) => onChange('warrantyKm', e.target.value)} placeholder="20 000" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Warranty until</div>
                      <input type="date" value={entry.warrantyDate} onChange={(e) => onChange('warrantyDate', e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      )}
    </div>
  )
}
