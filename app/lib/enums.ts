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
  // 'OilChange',
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
  'Inspection',
  'Other',
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
