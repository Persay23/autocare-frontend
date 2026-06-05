import { useNavigate } from 'react-router-dom'
import FloatingAddButton from '@/ui/FloatingAddButton'
import { useVehiclesStore } from '@/features/vehicles/vehicleStore'
import { useDiagnoseModal } from '@/features/vehicles/diagnoseModalStore'
import { useExpenseModal } from '@/features/expenses/expenseModalStore'
import { useRecordModal } from '@/features/records/recordModalStore'
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation'
import BuildIcon           from '@mui/icons-material/Build'
import AddCardIcon         from '@mui/icons-material/AddCard'
import HealingIcon         from '@mui/icons-material/Healing'

/**
 * Consistent FAB shown on the 4 main pages (Home, Expenses, Car Park, Timeline).
 * Always the same 4 options. Diagnose opens the floating DiagnoseModal.
 */
export default function GlobalFab() {
  const navigate = useNavigate()
  const vehicles = useVehiclesStore((s) => s.vehicles)
  const openFor    = useDiagnoseModal((s) => s.openFor)
  const openPicker = useDiagnoseModal((s) => s.open)

  const openExpense      = useExpenseModal((s) => s.open)
  const openRecord       = useRecordModal((s) => s.openCreate)
  const openRecordPicker = useRecordModal((s) => s.open)

  const handleFuel = () => {
    if (vehicles.length === 1) {
      navigate(`/vehicles/${vehicles[0].vehicleId}/fuel`)
    } else {
      navigate('/carpark')
    }
  }

  const handleDiagnose = () => {
    if (vehicles.length === 1) {
      openFor(vehicles[0].vehicleId)
    } else {
      openPicker()
    }
  }

  const handleRecord = () => {
    if (vehicles.length === 1) {
      openRecord(String(vehicles[0].vehicleId))
    } else {
      openRecordPicker()
    }
  }

  return (
    <FloatingAddButton options={[
      { icon: LocalGasStationIcon, label: 'Log Fuel',        onPress: handleFuel       },
      { icon: BuildIcon,           label: 'Service Record',  onPress: handleRecord     },
      { icon: AddCardIcon,         label: 'General Expense', onPress: openExpense      },
      { icon: HealingIcon,         label: 'Diagnose',        onPress: handleDiagnose   },
    ]} />
  )
}
