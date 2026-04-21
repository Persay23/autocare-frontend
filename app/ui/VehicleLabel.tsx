import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'

interface Props {
  vehicleId: string | undefined
}

export default function VehicleLabel({ vehicleId }: Props) {
  const { vehicles } = useVehiclesStore()
  const vehicle = vehicleId
    ? vehicles.find((v) => v.vehicleId === parseInt(vehicleId, 10))
    : null

  if (!vehicle) return null

  return (
    <div style={{
      padding: '0 22px 10px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      color: 'var(--text2)',
    }}>
      {vehicle.brand} {vehicle.model}
    </div>
  )
}
