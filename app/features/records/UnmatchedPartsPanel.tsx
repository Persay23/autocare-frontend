import { useState } from 'react'
import type { ReceiptPart, VehicleComponent } from '@/shared/types'
import { formatEnumLabel } from '@/shared/formatters'
import RecordComponentPicker from '@/features/records/RecordComponentPicker'

export interface UnmatchedPart {
  part: ReceiptPart
  ignored: boolean
}

interface Props {
  parts: UnmatchedPart[]
  allComponents: VehicleComponent[]
  onMap: (index: number, comp: VehicleComponent) => void
  onToggleIgnore: (index: number) => void
}

// Empty set → the picker offers every component, so multiple parts can map to the same one.
const NO_EXCLUSIONS = new Set<number | undefined>()

/**
 * Lists receipt parts the AI could not auto-link to a tracked component.
 * Each row can be mapped to an existing component or ignored (soft — reversible,
 * and only drops out when the form is submitted).
 */
export default function UnmatchedPartsPanel({ parts, allComponents, onMap, onToggleIgnore }: Props) {
  const [mappingIndex, setMappingIndex] = useState<number | null>(null)

  if (parts.length === 0) return null

  return (
    <div style={{
      background: 'rgba(108,99,255,0.04)',
      border: '1px solid rgba(108,99,255,0.2)',
      borderRadius: 12, padding: '12px 12px 8px', marginBottom: 12,
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
        color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em',
        marginBottom: 4,
      }}>
        AI found these parts
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 10 }}>
        Not linked to a tracked component — map each to one, or ignore it.
      </div>

      {parts.map(({ part, ignored }, i) => (
        <div key={i} style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 12px', marginBottom: 8,
          opacity: ignored ? 0.5 : 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textDecoration: ignored ? 'line-through' : 'none',
              }}>
                {part.name ?? 'Unnamed part'}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>
                {ignored
                  ? 'Ignored — will be dropped on save'
                  : [
                      part.componentType ? formatEnumLabel(part.componentType) : null,
                      part.changeType,
                      part.partsCost != null ? String(part.partsCost) : null,
                    ].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {ignored ? (
                <button
                  type="button"
                  onClick={() => onToggleIgnore(i)}
                  style={{
                    padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)',
                    color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
                  }}
                >
                  Undo
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setMappingIndex(mappingIndex === i ? null : i)}
                    style={{
                      padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                      background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)',
                      color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
                    }}
                  >
                    {mappingIndex === i ? 'Cancel' : 'Map'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMappingIndex(null); onToggleIgnore(i) }}
                    style={{
                      padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                      background: 'transparent', border: '1px solid var(--border)',
                      color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                    }}
                  >
                    Ignore
                  </button>
                </>
              )}
            </div>
          </div>

          {mappingIndex === i && !ignored && (
            <div style={{ marginTop: 10 }}>
              <RecordComponentPicker
                allComponents={allComponents}
                addedIds={NO_EXCLUSIONS}
                onAdd={(comp) => { setMappingIndex(null); onMap(i, comp) }}
                onClose={() => setMappingIndex(null)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
