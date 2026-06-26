import FloatingAddButton from '@/ui/FloatingAddButton'
import { useVehiclesStore } from '@/features/vehicles/vehicleStore'
import { useExpenseModal } from '@/features/expenses/expenseModalStore'
import { useRecordModal } from '@/features/records/recordModalStore'
import { useFuelModal } from '@/features/fuel/fuelModalStore'
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation'
import BuildIcon           from '@mui/icons-material/Build'
import AddCardIcon         from '@mui/icons-material/AddCard'

/**
 * Consistent FAB shown on the 4 main pages (Home, Expenses, Car Park, Timeline).
 * Always the same 3 options: Log Fuel, Service Record, General Expense.
 */
export default function GlobalFab() {
  const vehicles = useVehiclesStore((s) => s.vehicles)

  const openExpense      = useExpenseModal((s) => s.open)
  const openRecord       = useRecordModal((s) => s.openCreate)
  const openRecordPicker = useRecordModal((s) => s.open)
  const openFuelCreate   = useFuelModal((s) => s.openCreate)

  const handleFuel = () => {
    if (vehicles.length === 1) openFuelCreate(String(vehicles[0].vehicleId))
    else                       openFuelCreate(null)   // modal shows its vehicle selector
  }

  const handleRecord = () => {
    if (vehicles.length === 1) openRecord(String(vehicles[0].vehicleId))
    else                       openRecordPicker()
  }

  return (
    <FloatingAddButton options={[
      { icon: LocalGasStationIcon, label: 'Log Fuel',        onPress: handleFuel   },
      { icon: BuildIcon,           label: 'Service Record',  onPress: handleRecord },
      { icon: AddCardIcon,         label: 'General Expense', onPress: openExpense  },
    ]} />
  )
}
