import { useParams, useNavigate, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import PageShell from '../components/layout/PageShell'
import TabBar from '../components/shared/TabBar'
import VehicleOverview from './tabs/VehicleOverview'
import VehicleRecords from './tabs/VehicleRecords'
import VehicleComponents from './tabs/VehicleComponents'
import VehicleFuel from './tabs/VehicleFuel'
import VehiclePredictions from './tabs/VehiclePredictions'
import { getVehicleById } from '../api/vehicles'
import { getComponentHealth } from '../api/components'
import { LoadingState } from '../components/shared/AsyncStates'
import type { Vehicle, ComponentHealth } from '../types'



const TABS = [
  { label: 'Overview',    to: '' },
  { label: 'Records',     to: 'records' },
  { label: 'Components',  to: 'components' },
  { label: 'Fuel',        to: 'fuel' },
  { label: 'Predictions', to: 'predictions' },
]

export default function VehicleDetail() {
  const { vehicleId } = useParams()
  const basePath = `/vehicles/${vehicleId}`
  const navigate = useNavigate()

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [health, setHealth] = useState<ComponentHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    Promise.all([
      getVehicleById(vehicleId!),
      getComponentHealth(vehicleId!).catch(() => ({ data: [] as ComponentHealth[] })),
    ]).then(([vehicleRes, healthRes]) => {
      setVehicle(vehicleRes.data as Vehicle)
      setHealth((healthRes.data ?? []) as ComponentHealth[])
    }).finally(() => setLoading(false))
  }, [vehicleId, refreshKey])

  if (loading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    )
  }

  if (!vehicle) {
    return (
      <PageShell>
        <div style={{ padding: '60px 22px', textAlign: 'center', color: 'var(--text2)' }}>
          Vehicle not found.
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      {/* Back button */}
      <button
        onClick={() => navigate('/carpark')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '16px 22px 8px',
          background: 'none',
          border: 'none',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'var(--text2)',
          cursor: 'pointer',
        }}
      >
        ← Car Park
      </button>

      {/* Vehicle name + subtitle */}
      <div style={{ padding: '0 22px 14px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
          {vehicle.brand} {vehicle.model}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: 'var(--text2)',
          marginTop: 3,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {vehicle.yearOfProduction} · {vehicle.fuelType} · {vehicle.transmissionType} · {vehicle.mileage?.toLocaleString()} km
        </div>
      </div>

      {/* Tab bar */}
      <TabBar tabs={TABS} basePath={basePath} />

      {/* Tab content */}
      <Routes>
        <Route index element={
          <VehicleOverview
            vehicle={vehicle}
            health={health}
            onComponentsCreated={() => setRefreshKey((prev) => prev + 1)}
          />
        } />
        <Route path="records"      element={<VehicleRecords vehicleId={vehicleId} />} />
        <Route path="components"   element={<VehicleComponents vehicleId={vehicleId} />} />
        <Route path="fuel"         element={<VehicleFuel vehicleId={vehicleId} />} />
        <Route path="predictions"  element={<VehiclePredictions vehicleId={vehicleId} />} />
      </Routes>
    </PageShell>
  )
}
