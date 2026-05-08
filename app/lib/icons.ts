import type { ElementType } from 'react'

import BuildIcon from '@mui/icons-material/Build'
import SettingsIcon from '@mui/icons-material/Settings'
import AdjustIcon from '@mui/icons-material/Adjust'
import DeviceHubIcon from '@mui/icons-material/DeviceHub'
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt'
import AcUnitIcon from '@mui/icons-material/AcUnit'
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation'
import AirIcon from '@mui/icons-material/Air'
import TireRepairIcon from '@mui/icons-material/TireRepair'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import OpacityIcon from '@mui/icons-material/Opacity'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import SecurityIcon from '@mui/icons-material/Security'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import LocalParkingIcon from '@mui/icons-material/LocalParking'
import PaymentIcon from '@mui/icons-material/Payment'
import GavelIcon from '@mui/icons-material/Gavel'

// Icon component type — all MUI SvgIcon components satisfy this
export type IconComponent = ElementType

export const COMPONENT_ICONS: Record<string, IconComponent> = {
  Engine:       BuildIcon,
  Transmission: SettingsIcon,
  Brakes:       AdjustIcon,
  Suspension:   DeviceHubIcon,
  Electrical:   ElectricBoltIcon,
  Cooling:      AcUnitIcon,
  Fuel:         LocalGasStationIcon,
  Exhaust:      AirIcon,
  Tyres:        TireRepairIcon,
  Body:         DirectionsCarIcon,
  Other:        BuildIcon,
}

export const SERVICE_ICONS: Record<string, IconComponent> = {
  OilChange:    OpacityIcon,
  Engine:       BuildIcon,
  Transmission: SettingsIcon,
  Brakes:       AdjustIcon,
  Suspension:   DeviceHubIcon,
  Electrical:   ElectricBoltIcon,
  Cooling:      AcUnitIcon,
  Fuel:         LocalGasStationIcon,
  Exhaust:      AirIcon,
  Tyres:        TireRepairIcon,
  Body:         DirectionsCarIcon,
  Inspection:   AssignmentIcon,
  Other:        BuildIcon,
}

export const EXPENSE_CATEGORY_ICONS: Record<string, IconComponent> = {
  Insurance:   SecurityIcon,
  Tax:         AccountBalanceIcon,
  Parking:     LocalParkingIcon,
  Tolls:       PaymentIcon,
  Fines:       GavelIcon,
  CarWash:     OpacityIcon,
  Accessories: BuildIcon,
  Other:       AssignmentIcon,
}

// Timeline event dot icons
export const TIMELINE_ICONS: Record<string, IconComponent> = {
  Maintenance: BuildIcon,
  Service:     BuildIcon,
  Fuel:        LocalGasStationIcon,
  Liquid:      OpacityIcon,
  Expense:     CreditCardIcon,
  Other:       AssignmentIcon,
}
