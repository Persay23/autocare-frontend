import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import VehicleCard from '@/features/vehicles/VehicleCard'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { LoadingState, EmptyState } from '@/ui/AsyncStates'

export default function CarPark() {
  const navigate = useNavigate()
  const { vehicles, healthMap, loading, fetch: fetchVehicles } = useVehiclesStore()

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  const needsAttention = vehicles.filter((v) => {
    const h = healthMap[v.vehicleId]
    return h?.some((c) => c.currentState === 'Critical' || c.currentState === 'Repair')
  }).length

  return (
    <PageShell>
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '20px 22px 16px',
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Car Park</div>
          {!loading && vehicles.length > 0 && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, color: 'var(--text2)', marginTop: 3,
            }}>
              {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
              {needsAttention > 0 && (
                <span style={{ color: 'var(--orange)' }}>
                  {' · '}{needsAttention} need{needsAttention !== 1 ? '' : 's'} attention
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/vehicles/new')}
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '6px 14px', borderRadius: 10,
            background: 'var(--accent)', border: 'none',
            color: '#fff', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >
          + Add
        </button>
      </div>

      {loading && <LoadingState />}

      {!loading && vehicles.length === 0 && (
        <EmptyState icon="🚗" message="No vehicles yet — add your first car to get started" />
      )}

      {!loading && vehicles.map((vehicle) => (
        <VehicleCard key={vehicle.vehicleId} vehicle={vehicle} health={healthMap[vehicle.vehicleId]} />
      ))}
    </PageShell>
  )
}
