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

  return (
    <PageShell>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 22px 16px',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Car Park</div>
        <button
          onClick={() => navigate('/vehicles/new')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 12px',
            borderRadius: 999,
            background: 'rgba(108,99,255,0.12)',
            border: '1px solid rgba(108,99,255,0.3)',
            color: 'var(--accent)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          + Add
        </button>
      </div>

      {loading && <LoadingState />}

      {!loading && vehicles.length === 0 && (
        <EmptyState icon="🚗" message="No vehicles yet - add your first car to get started" />
      )}

      {!loading && vehicles.map((vehicle) => (
        <VehicleCard key={vehicle.vehicleId} vehicle={vehicle} health={healthMap[vehicle.vehicleId]} />
      ))}
    </PageShell>
  )
}
