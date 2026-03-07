import { useNavigate } from 'react-router-dom'
import StatusPill from '../shared/StatusPill'
import HealthBar from '../shared/HealthBar'
import type { Vehicle, ComponentHealth } from '../../types'

function StateDots({ health }: { health: ComponentHealth[] }) {
  if (!health?.length) return null

  const dotColor: Record<string, string> = {
    Perfect: '#38bdf8',
    Good: '#34d399',
    Normal: '#fbbf24',
    Repair: '#fb923c',
    Critical: '#f87171',
    Unknown: '#7b80a8',
  }

  const counts = health.reduce<Record<string, number>>((acc, component) => {
    acc[component.currentState] = (acc[component.currentState] ?? 0) + 1
    return acc
  }, {})

  const order = ['Perfect', 'Good', 'Normal', 'Repair', 'Critical', 'Unknown']
  const dots = order.flatMap((state) => Array(counts[state] ?? 0).fill(state))
  const abbrev: Record<string, string> = { Perfect: 'P', Good: 'G', Normal: 'N', Repair: 'R', Critical: 'C', Unknown: 'U' }
  const label = order
    .filter((state) => counts[state])
    .map((state) => `${counts[state]}${abbrev[state]}`)
    .join(' · ')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
      {dots.map((state, index) => (
        <div
          key={`${state}-${index}`}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: dotColor[state] ?? '#34d399',
            flexShrink: 0,
          }}
        />
      ))}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--text3)',
          marginLeft: 4,
        }}
      >
        {label}
      </span>
    </div>
  )
}

export default function VehicleCard({ vehicle, health }: { vehicle: Vehicle; health: ComponentHealth[] | null }) {
  const navigate = useNavigate()

  const overallHealth = health?.length
    ? Math.round(
        health.reduce((sum, component) => sum + Math.min(component.kmLifetimePercent ?? 0, component.yearsLifetimePercent ?? 0), 0) /
          health.length
      )
    : null

  const worstState = (() => {
    if (!health?.length) return null
    const order = ['Critical', 'Repair', 'Normal', 'Good', 'Perfect', 'Unknown']
    for (const state of order) {
      if (health.some((component) => component.currentState === state)) return state
    }
    return 'Unknown'
  })()

  return (
    <div
      onClick={() => navigate(`/vehicles/${vehicle.vehicleId}`)}
      style={{
        margin: '0 22px 10px',
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 16,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: 3,
          background: 'linear-gradient(to bottom, var(--accent), var(--accent2))',
          borderRadius: '99px 0 0 99px',
        }}
      />

      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--text3)',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          marginBottom: 4,
        }}
      >
        {vehicle.brand} · {vehicle.yearOfProduction}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{vehicle.model}</div>
        {worstState && <StatusPill status={worstState} />}
      </div>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {[vehicle.fuelType, vehicle.transmissionType, vehicle.vehicleType].filter(Boolean).map((tag) => (
          <span
            key={tag}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              padding: '2px 7px',
              borderRadius: 4,
              background: 'var(--surface3)',
              color: 'var(--text2)',
              border: '1px solid var(--border)',
              textTransform: 'uppercase',
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {overallHealth !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: 'var(--text3)',
            }}
          >
            Health
          </span>
          <HealthBar percent={overallHealth} />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: 'var(--text3)',
            }}
          >
            {overallHealth}%
          </span>
        </div>
      )}

      <StateDots health={health} />

      <div
        style={{
          display: 'flex',
          borderTop: '1px solid var(--border)',
          paddingTop: 10,
        }}
      >
        {[
          { val: vehicle.mileage?.toLocaleString() ?? '\u2014', lbl: 'km' },
          { val: health?.length ?? 0, lbl: 'parts' },
        ].map(({ val, lbl }) => (
          <div key={lbl} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{val}</div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: 'var(--text3)',
                marginTop: 2,
              }}
            >
              {lbl}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
