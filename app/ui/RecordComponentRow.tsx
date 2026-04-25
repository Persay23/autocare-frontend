import { useState } from 'react'
import type { VehicleComponent } from '@/lib/types'
import type { ComponentEntry } from '@/features/records/componentEntry'
import { entryTotal, CHANGE_TYPES } from '@/features/records/componentEntry'
import { COMPONENT_ICONS } from '@/lib/icons'
import { COMPONENT_STATES } from '@/lib/enums'
import { formatEnumLabel } from '@/lib/formatters'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'
import { labelStyle } from '@/styles/pageStyles'

interface Props {
  comp: VehicleComponent
  entry: ComponentEntry
  onChange: (field: string, value: string) => void
  onRemove: () => void
  defaultExpanded?: boolean
}

function componentLabel(comp: VehicleComponent): string {
  const type = formatEnumLabel(comp.componentType)
  const name = comp.name || comp.vehicleComponentName
  return name ? `${type} · ${name}` : type
}

export default function RecordComponentRow({ comp, entry, onChange, onRemove, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const total = entryTotal(entry)
  const CompIcon = COMPONENT_ICONS[comp.componentType] ?? COMPONENT_ICONS.Other
  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange(field, e.target.value)

  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 12, marginBottom: 8, overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
        onClick={() => setExpanded((p) => !p)}
      >
        <CompIcon sx={{ fontSize: 20, flexShrink: 0, color: 'var(--accent3)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {componentLabel(comp)}
          </div>
          {(comp.brand || comp.vehicleComponentBrand) && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
              {comp.brand || comp.vehicleComponentBrand} · {entry.changeType}
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
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 6, color: 'var(--red)', fontSize: 11,
            padding: '3px 8px', cursor: 'pointer', flexShrink: 0,
          }}
        >
          ✕
        </button>
        <span style={{ color: 'var(--text3)', fontSize: 11, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Change Type</label>
              <select value={entry.changeType} onChange={set('changeType')} style={{ ...inputStyle, width: '100%' }} onFocus={onFocus} onBlur={onBlur}>
                {CHANGE_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>New State</label>
              <select value={entry.newState} onChange={set('newState')} style={{ ...inputStyle, width: '100%' }} onFocus={onFocus} onBlur={onBlur}>
                {COMPONENT_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Customer Complaint</label>
            <textarea
              value={entry.customerComplaint} onChange={set('customerComplaint')}
              placeholder="What did the customer report?"
              rows={2}
              style={{ ...inputStyle, width: '100%', resize: 'vertical', lineHeight: 1.5 }}
              onFocus={onFocus} onBlur={onBlur}
            />
          </div>

          <div>
            <label style={labelStyle}>Work Description</label>
            <textarea
              value={entry.workDescription} onChange={set('workDescription')}
              placeholder="What was done to this component?" rows={2}
              style={{ ...inputStyle, width: '100%', resize: 'vertical', lineHeight: 1.5 }}
              onFocus={onFocus} onBlur={onBlur}
            />
          </div>

          <div>
            <label style={labelStyle}>Changed Parts</label>
            <input type="text" value={entry.changedParts} onChange={set('changedParts')}
              placeholder="e.g. Oil filter, drain plug gasket"
              style={{ ...inputStyle, width: '100%' }} onFocus={onFocus} onBlur={onBlur} />
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
                  <input type="number" min="0" step="0.01"
                    value={(entry as Record<string, string>)[field]}
                    onChange={set(field)} placeholder="0.00"
                    style={{ ...inputStyle, width: '100%' }} onFocus={onFocus} onBlur={onBlur} />
                </div>
              ))}
            </div>
          </div>

          {total > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)',
              borderRadius: 8, padding: '8px 12px',
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)' }}>
                COMPONENT SUBTOTAL
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent3)' }}>
                {total.toFixed(2)} zł
              </span>
            </div>
          )}

          {/* Replace-only block */}
          {entry.changeType === 'Replaced' && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 10,
              paddingTop: 10, borderTop: '1px solid var(--border)',
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                New Part Details
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Brand</label>
                  <input type="text" value={entry.brand} onChange={set('brand')}
                    placeholder="Brembo, Gates..."
                    style={{ ...inputStyle, width: '100%' }} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={labelStyle}>Part Number</label>
                  <input type="text" value={entry.partNumber} onChange={set('partNumber')}
                    placeholder="P85 020"
                    style={{ ...inputStyle, width: '100%' }} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Lifetime (km)</label>
                  <input type="number" min="0" value={entry.expectedLifetimeKm} onChange={set('expectedLifetimeKm')}
                    placeholder="50000"
                    style={{ ...inputStyle, width: '100%' }} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={labelStyle}>Lifetime (years)</label>
                  <input type="number" min="0" max="50" value={entry.expectedLifetimeYears} onChange={set('expectedLifetimeYears')}
                    placeholder="5"
                    style={{ ...inputStyle, width: '100%' }} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Warranty (km)</label>
                  <input type="number" min="0" value={entry.warrantyKm} onChange={set('warrantyKm')}
                    placeholder="20000"
                    style={{ ...inputStyle, width: '100%' }} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={labelStyle}>Warranty until</label>
                  <input type="date" value={entry.warrantyDate} onChange={set('warrantyDate')}
                    style={{ ...inputStyle, width: '100%' }} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
