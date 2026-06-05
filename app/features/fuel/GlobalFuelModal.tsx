import { useFuelModal } from '@/features/fuel/fuelModalStore'
import FuelModal from './FuelModal'

export default function GlobalFuelModal() {
  const { isOpen, vehicleId, entryId, close } = useFuelModal()
  if (!isOpen) return null
  return (
    <FuelModal
      vehicleId={vehicleId}
      entryId={entryId}
      onClose={close}
      onSaved={close}
    />
  )
}
