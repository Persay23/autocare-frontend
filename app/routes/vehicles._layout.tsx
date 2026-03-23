import { useParams, useNavigate, Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import PageShell from '@/ui/layout/PageShell'
import TabBar from '@/ui/layout/TabBar'
import { LoadingState } from '@/ui/AsyncStates'
import { getVehicleById } from '@/features/vehicles/api'
import { getComponentHealth } from '@/features/components/api'
import type { Vehicle, ComponentHealth } from '@/lib/types'

export interface VehicleLayoutContext {
  vehicle: Vehicle
  health: ComponentHealth[]
  refresh: () => void
}

const TABS = [
  { label: 'Overview',    to: '' },
  { label: 'Records',     to: 'records' },
  { label: 'Components',  to: 'components' },
  { label: 'Fuel',        to: 'fuel' },
  { label: 'Predictions', to: 'predictions' },
]

export default function VehicleLayout() {
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

  if (loading) return <PageShell><LoadingState /></PageShell>

  if (!vehicle) return (
    <PageShell>
      <div style={{ padding: '60px 22px', textAlign: 'center', color: 'var(--text2)' }}>
        Vehicle not found.
      </div>
    </PageShell>
  )

  const ctx: VehicleLayoutContext = {
    vehicle,
    health,
    refresh: () => setRefreshKey((k) => k + 1),
  }

  return (
    <PageShell>
      <button
        onClick={() => navigate('/carpark')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '16px 22px 8px', background: 'none', border: 'none',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: 'var(--text2)', cursor: 'pointer',
        }}
      >
        ← Car Park
      </button>

      <div style={{ padding: '0 22px 14px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
          {vehicle.brand} {vehicle.model}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)',
          marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {vehicle.yearOfProduction} · {vehicle.fuelType} · {vehicle.transmissionType} · {vehicle.mileage?.toLocaleString()} km
        </div>
      </div>

      <TabBar tabs={TABS} basePath={basePath} />

      <Outlet context={ctx} />
    </PageShell>
  )
}
