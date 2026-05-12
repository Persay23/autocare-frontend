import { useNavigate } from 'react-router-dom'
import StatusPill from '@/ui/StatusPill'
import HealthBar from '@/ui/HealthBar'
import { formatEnumLabel } from '@/lib/formatters'
import { healthPctToState } from '@/lib/healthState'
import type { Vehicle, ComponentHealth } from '@/lib/types'

const STATE_ORDER = ['Critical', 'Repair', 'Normal', 'Good', 'Perfect', 'Unknown'] as const

function healthColor(pct: number): string {
  if (pct <= 15) return 'var(--red)'
  if (pct <= 30) return 'var(--orange)'
  if (pct <= 50) return 'var(--yellow)'
  if (pct <= 74) return 'var(--green)'
  return 'var(--accent4)'
}

export default function VehicleCard({ vehicle, health }: { vehicle: Vehicle; health: ComponentHealth[] | null }) {
  const navigate = useNavigate()

  const overallHealth = health?.length
    ? Math.round(
        health.reduce((sum, c) => sum + Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0), 0) /
          health.length
      )
    : null

  // Derive state per component from health % so pills are consistent with the bar
  const derivedStates = (health ?? []).map((c) => {
    const km = c.kmLifetimePercent ?? 0
    const yr = c.yearsLifetimePercent ?? 0
    if (km === 0 && yr === 0) return 'Unknown'
    return healthPctToState(Math.min(km, yr))
  })

  const counts = derivedStates.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})

  const worstState = (() => {
    if (!health?.length) return null
    for (const state of STATE_ORDER) {
      if (counts[state]) return state
    }
    return 'Unknown'
  })()

  const alerts = (counts['Critical'] ?? 0) + (counts['Repair'] ?? 0)
  const goodPlus = (counts['Perfect'] ?? 0) + (counts['Good'] ?? 0) + (counts['Normal'] ?? 0)

  const attnChips = [
    { key: 'Critical', count: counts['Critical'] ?? 0, bg: 'rgba(248,113,113,0.15)', color: 'var(--red)',    border: 'rgba(248,113,113,0.3)' },
    { key: 'Repair',   count: counts['Repair']   ?? 0, bg: 'rgba(251,146,60,0.15)',  color: 'var(--orange)', border: 'rgba(251,146,60,0.3)'  },
    { key: 'Unknown',  count: counts['Unknown']  ?? 0, bg: 'rgba(123,128,168,0.12)', color: 'var(--text2)',  border: 'rgba(123,128,168,0.25)' },
  ].filter((c) => c.count > 0)

  const hasPills = (health?.length ?? 0) > 0

  const isCritical = worstState === 'Critical'
  const cardStyle = isCritical
    ? { background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)' }
    : { background: 'var(--surface)',         border: '1px solid var(--border)' }

  const meta = [
    vehicle.brand,
    vehicle.yearOfProduction,
    vehicle.fuelType ? formatEnumLabel(vehicle.fuelType) : null,
    vehicle.transmissionType && vehicle.transmissionType !== 'Automatic'
      ? formatEnumLabel(vehicle.transmissionType)
      : null,
  ].filter(Boolean).join(' · ')

  return (
    <div
      onClick={() => navigate(`/vehicles/${vehicle.vehicleId}`)}
      style={{
        margin: '0 16px 10px',
        borderRadius: 14,
        padding: 14,
        cursor: 'pointer',
        ...cardStyle,
      }}
    >
      {/* Meta */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, color: 'var(--text3)',
        marginBottom: 4,
      }}>
        {meta}
      </div>

      {/* Title + status pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{vehicle.model}</div>
        {worstState && <StatusPill status={worstState} />}
      </div>

      {/* Health bar */}
      {overallHealth !== null && (
        <div style={{ marginBottom: hasPills ? 10 : 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              Fleet health
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, color: healthColor(overallHealth) }}>
              {overallHealth}%
            </span>
          </div>
          <HealthBar percent={overallHealth} />
        </div>
      )}

      {/* State chips */}
      {hasPills && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {attnChips.map(({ key, count, bg, color, border }) => (
            <span key={key} style={{
              padding: '3px 8px', borderRadius: 999,
              background: bg, border: `1px solid ${border}`,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, fontWeight: 600, color,
            }}>
              {count} {key.toLowerCase()}
            </span>
          ))}
          {goodPlus > 0 && (
            <span style={{
              padding: '3px 8px', borderRadius: 999,
              background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, fontWeight: 600, color: 'var(--green)',
            }}>
              {goodPlus} good+
            </span>
          )}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        {[
          { val: vehicle.mileage?.toLocaleString() ?? '—', lbl: 'km' },
          { val: health?.length ?? 0,                       lbl: 'parts' },
          {
            val: alerts,
            lbl: 'alerts',
            color: alerts > 0 ? 'var(--orange)' : 'var(--text3)',
          },
        ].map(({ val, lbl, color }) => (
          <div key={lbl} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: color ?? 'var(--text)' }}>{val}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>
              {lbl}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
