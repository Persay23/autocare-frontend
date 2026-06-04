export const FUEL_TYPES = [
  'Petrol95',
  'Petrol98',
  'Diesel',
  'PremiumDiesel',
  'LPG',
  'CNG',
  'Electric',
  'Hydrogen',
  'E85',
  'Other',
] as const

export type FuelType = (typeof FUEL_TYPES)[number]

export const FUEL_TYPES_FOR_ENGINE: Record<string, readonly string[]> = {
  Petrol:       ['Petrol95', 'Petrol98', 'E85', 'LPG', 'Other'],
  Diesel:       ['Diesel', 'PremiumDiesel', 'Other'],
  FullElectric: ['Electric', 'Other'],
  Hybrid:       ['Petrol95', 'Petrol98', 'Electric', 'Other'],
  PlugInHybrid: ['Petrol95', 'Petrol98', 'E85', 'Electric', 'Other'],
  Hydrogen:     ['Hydrogen', 'Other'],
  Other:        FUEL_TYPES,
}

export const FUEL_TYPES_FOR_FUEL_TYPE: Record<string, readonly string[]> = {
  Petrol95:      ['Petrol95', 'Petrol98', 'E85', 'LPG', 'Other'],
  Petrol98:      ['Petrol95', 'Petrol98', 'E85', 'LPG', 'Other'],
  E85:           ['Petrol95', 'Petrol98', 'E85', 'Other'],
  LPG:           ['Petrol95', 'Petrol98', 'LPG', 'Other'],
  CNG:           ['CNG', 'Other'],
  Diesel:        ['Diesel', 'PremiumDiesel', 'Other'],
  PremiumDiesel: ['Diesel', 'PremiumDiesel', 'Other'],
  Electric:      ['Electric', 'Other'],
  Hydrogen:      ['Hydrogen', 'Other'],
  Other:         FUEL_TYPES,
}

export const ENGINE_TYPE_FOR_FUEL_TYPE: Record<string, string> = {
  Petrol95: 'Petrol', Petrol98: 'Petrol', E85: 'Petrol', LPG: 'Petrol',
  Diesel: 'Diesel', PremiumDiesel: 'Diesel',
  CNG: 'Petrol',
  Electric: 'FullElectric',
  Hydrogen: 'Hydrogen',
  Other: 'Other',
}

export const FUEL_TYPE = {
  Petrol95: 'Petrol95',
  Petrol98: 'Petrol98',
  Diesel: 'Diesel',
  PremiumDiesel: 'PremiumDiesel',
  LPG: 'LPG',
  CNG: 'CNG',
  Electric: 'Electric',
  Hydrogen: 'Hydrogen',
  E85: 'E85',
  Other: 'Other',
} as const

export const SERVICE_TYPES = [
  { value: 'Inspection',    label: 'Inspection' },
  { value: 'RoutineService', label: 'Routine Service' },
  { value: 'Repair',        label: 'Repair' },
  { value: 'TyreService',   label: 'Tyre Service' },
  { value: 'BodyAndPaint',  label: 'Body & Paint' },
  { value: 'Electrical',    label: 'Electrical' },
  { value: 'Other',         label: 'Other' },
]

export const COMPONENT_TYPES = [
  'Engine',
  'Transmission',
  'Brakes',
  'Suspension',
  'Electrical',
  'Cooling',
  'Fuel',
  'Exhaust',
  'Tyres',
  'Body',
  'Other',
]

export const COMPONENT_STATES = [
  'Perfect',
  'Good',
  'Normal',
  'Repair',
  'Critical',
  'Unknown',
]

export const TRANSMISSION_TYPES = [
  'Manual',
  'Automatic',
  'SemiAutomatic',
  'CVT',
  'DCT',
  'Other',
]

export const ENGINE_TYPES = [
  'Petrol',
  'Diesel',
  'FullElectric',
  'Hybrid',
  'PlugInHybrid',
  'Hydrogen',
  'Other',
]

export const VEHICLE_TYPES = [
  'Sedan',
  'Hatchback',
  'Estate',
  'Coupe',
  'Convertible',
  'SUV',
  'Crossover',
  'MPV',
  'Pickup',
  'Van',
  'Truck',
  'Bus',
  'Motorcycle',
  'Scooter',
  'Moped',
  'Other',
]

export const PREDICTION_STATUS_ORDER = {
  Active: 0,
  Completed: 1,
  Ignored: 2,
}

export const EXPENSE_CATEGORIES = [
  'Insurance',
  'Tax',
  'Parking',
  'Tolls',
  'Fines',
  'CarWash',
  'Accessories',
  'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const RECURRENCE_INTERVALS = ['Days', 'Weeks', 'Months', 'Years'] as const
export type RecurrenceInterval = (typeof RECURRENCE_INTERVALS)[number]
