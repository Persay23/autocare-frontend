import { useVehicleModal } from '@/features/vehicles/vehicleModalStore'
import VehicleModal from './VehicleModal'

export default function GlobalVehicleModal() {
  const { isOpen, vehicleId, close } = useVehicleModal()

  if (!isOpen) return null

  return (
    <VehicleModal
      vehicleId={vehicleId}
      onClose={close}
      onSaved={close}
    />
  )
}
