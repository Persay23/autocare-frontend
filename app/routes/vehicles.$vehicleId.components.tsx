import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatusPill from '@/ui/StatusPill'
import HealthBar from '@/ui/HealthBar'
import { getComponentHealth } from '@/features/components/api'
import { LoadingState, ErrorState, EmptyState } from '@/ui/AsyncStates'
import { COMPONENT_ICONS } from '@/lib/icons'
import { formatEnumLabel } from '@/lib/formatters'

import type { ComponentHealth } from '@/lib/types'

export default function VehicleComponents() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const [health, setHealth] = useState<ComponentHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getComponentHealth(vehicleId!)
      .then((res) => setHealth(res.data))
      .catch(() => setError('Failed to load components.'))
      .finally(() => setLoading(false))
  }, [vehicleId])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 22px 12px',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Components</div>
        <button
          onClick={() => navigate(`/vehicles/${vehicleId}/components/new`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: 999,
            background: 'rgba(108,99,255,0.12)',
            border: '1px solid rgba(108,99,255,0.3)',
            color: 'var(--accent)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          + Add
        </button>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && health.length === 0 && (
        <EmptyState icon="⚙" message="No components tracked yet" />
      )}

      <div style={{ padding: '0 22px' }}>
        {!loading && !error && health.map((component) => {
          const healthPct = Math.min(component.kmLifetimePercent ?? 0, component.yearsLifetimePercent ?? 0)

          return (
            <div
              key={component.componentId}
              onClick={() => navigate(`/vehicles/${vehicleId}/components/${component.componentId}`)}
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 8,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  {(() => { const CI = COMPONENT_ICONS[component.componentType] ?? COMPONENT_ICONS.Other; return <CI sx={{ fontSize: 20, flexShrink: 0, color: 'var(--accent3)' }} /> })()}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {component.vehicleComponentName || formatEnumLabel(component.componentType)}
                    </div>
                    {component.vehicleComponentName && (
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9,
                          color: 'var(--text3)',
                          marginTop: 1,
                        }}
                      >
                        {formatEnumLabel(component.componentType)}
                      </div>
                    )}
                  </div>
                </div>
                <StatusPill status={component.currentState} />
              </div>

              <HealthBar percent={healthPct} />

              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: 'var(--text3)',
                  marginTop: 5,
                }}
              >
                {healthPct.toFixed(1)}%
                {component.vehicleComponentBrand ? ` · ${component.vehicleComponentBrand}` : ''}
                {component.installationDate
                  ? ` · installed ${new Date(component.installationDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
                  : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
