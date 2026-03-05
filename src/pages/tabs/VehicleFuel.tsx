import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StatCard from '../../components/shared/StatCard'
import { getFuelByVehicle } from '../../api/fuel'
import { LoadingState, ErrorState, EmptyState } from '../../components/shared/AsyncStates'
import VehicleComponents from './VehicleComponents'

export default function VehicleFuel({ vehicleId }) {
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getFuelByVehicle(vehicleId)
      .then((res) => setEntries(res.data))
      .catch(() => setError('Failed to load fuel entries.'))
      .finally(() => setLoading(false))
  }, [vehicleId])

  const ytdCost = entries.reduce((sum, entry) => sum + (entry.cost ?? 0), 0)
  const avgCost = entries.length ? Math.round(ytdCost / entries.length) : 0

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
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Fuel</div>
        <button
          onClick={() => navigate(`/vehicles/${vehicleId}/fuel/new`)}
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
          + Log
        </button>
      </div>

      {!loading && entries.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            padding: '0 22px',
            marginBottom: 10,
          }}
        >
          <StatCard label="YTD Fuel" value={`${ytdCost.toLocaleString()} zl`} accent="blue" />
          <StatCard label="Avg Refill" value={`${avgCost.toLocaleString()} zl`} accent="teal" />
        </div>
      )}

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && entries.length === 0 && (
        <EmptyState icon="⛽" message="No fuel entries yet" />
      )}

      {!loading && !error && entries.map((entry) => {
        const pricePerL = entry.amount > 0 ? (entry.cost / entry.amount).toFixed(2) : null

        return (
          <div
            key={entry.fuelEntryId}
            onClick={() => navigate(`/vehicles/${vehicleId}/fuel/${entry.fuelEntryId}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 22px',
              borderBottom: '1px solid var(--border2)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 20, width: 32, textAlign: 'center' }}>⛽</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
                {entry.amount}L{entry.notes ? ` · ${entry.notes}` : ''}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: 'var(--text2)',
                }}
              >
                {entry.mileage?.toLocaleString()} km
                {pricePerL ? ` · ${pricePerL} zl/L` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent3)' }}>
                {entry.cost?.toLocaleString()} zl
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: 'var(--text3)',
                  marginTop: 2,
                }}
              >
                {new Date(entry.refillDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
