import type { VehicleComponent } from '@/lib/types'
import { COMPONENT_ICONS } from '@/lib/icons'
import { formatEnumLabel } from '@/lib/formatters'


interface Props {
  allComponents: VehicleComponent[]
  addedIds: Set<number | undefined>
  onAdd: (c: VehicleComponent) => void
  onClose: () => void
}

export default function RecordComponentPicker({ allComponents, addedIds, onAdd, onClose }: Props) {
  const available = allComponents.filter((c) => !addedIds.has(c.vehicleComponentId ?? c.componentId))

  return (
    <div style={{
      marginBottom: 8,
      background: 'var(--surface2)',
      border: '1px solid rgba(108,99,255,0.35)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', borderBottom: '1px solid var(--border)',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em',
        }}>
          Select Component
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}
        >
          ✕
        </button>
      </div>

      {available.length === 0 ? (
        <div style={{
          padding: '16px 14px',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: 'var(--text3)', textAlign: 'center',
        }}>
          All components have already been added.
        </div>
      ) : (
        available.map((comp, idx) => {
          const CompIcon = COMPONENT_ICONS[comp.componentType] ?? COMPONENT_ICONS.Other
          const isLast = idx === available.length - 1
          return (
            <button
              key={comp.vehicleComponentId ?? comp.componentId}
              type="button"
              onClick={() => { onAdd(comp); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '11px 14px',
                background: 'none', border: 'none',
                borderBottom: isLast ? 'none' : '1px solid var(--border)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <CompIcon sx={{ fontSize: 20, flexShrink: 0, color: 'var(--accent3)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                  {formatEnumLabel(comp.componentType)}{(comp.name || comp.vehicleComponentName) ? ` · ${comp.name || comp.vehicleComponentName}` : ''}
                </div>
                {(comp.brand || comp.vehicleComponentBrand) && (
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                    {comp.brand || comp.vehicleComponentBrand}
                  </div>
                )}
              </div>
              <span style={{ color: 'var(--accent)', fontSize: 18, flexShrink: 0 }}>+</span>
            </button>
          )
        })
      )}
    </div>
  )
}

