import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import VehicleCard from '../components/vehicles/VehicleCard'
import { getVehicles } from '../api/vehicles'
import { getComponentHealth } from '../api/components'
import { LoadingState, ErrorState, EmptyState } from '../components/shared/AsyncStates'
import type { Vehicle, ComponentHealth } from '../types'

export default function CarPark() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [healthMap, setHealthMap] = useState<Record<number, ComponentHealth[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getVehicles()
      .then(async (res) => {
        const list: Vehicle[] = res.data
        setVehicles(list)

        const healthResults = await Promise.allSettled(
          list.map((vehicle) =>
            getComponentHealth(vehicle.vehicleId).then((r) => ({
              vehicleId: vehicle.vehicleId,
              health: r.data as ComponentHealth[],
            }))
          )
        )

        const map: Record<number, ComponentHealth[]> = {}
        healthResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            map[result.value.vehicleId] = result.value.health
          }
        })
        setHealthMap(map)
      })
      .catch(() => setError('Failed to load vehicles.'))
      .finally(() => setLoading(false))
  }, [])

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
      {error && <ErrorState message={error} margin="0 22px" />}

      {!loading && !error && vehicles.length === 0 && (
        <EmptyState icon="🚗" message="No vehicles yet - add your first car to get started" />
      )}

      {!loading && !error && vehicles.map((vehicle) => (
        <VehicleCard key={vehicle.vehicleId} vehicle={vehicle} health={healthMap[vehicle.vehicleId]} />
      ))}
    </PageShell>
  )
}
