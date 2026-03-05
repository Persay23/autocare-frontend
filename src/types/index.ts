// ─── Domain entities (match backend DTO field names) ──────────────────────────

export interface User {
  id: string
  name: string
  email: string
  age?: number
  gender?: string
  drivingExperience?: number
  createdAt: string
}

export interface Vehicle {
  vehicleId: number
  userId: string
  brand: string
  model: string
  yearOfProduction: number
  vehicleType: string
  transmissionType: string
  engineType: string
  fuelType: string
  mileage: number
}

/** Raw component entity — returned by CRUD endpoints */
export interface VehicleComponent {
  componentId: number
  vehicleId: number
  componentType: string
  name?: string
  brand?: string
  installationDate: string
  lastServiceDate?: string
  state: string
  notes?: string
  currentMileage: number
  expectedLifetimeKm: number
  expectedLifetimeYears: number
}

/** Computed health data — returned by /vehiclecomponent/vehicle/{id}/health */
export interface ComponentHealth {
  componentId: number
  componentType: string
  vehicleComponentName?: string
  vehicleComponentBrand?: string
  currentState: string
  kmLifetimePercent: number
  yearsLifetimePercent: number
  remainingKm: number
  status: string
}

export interface MaintenanceRecordComponent {
  maintenanceRecordComponentId: number
  maintenanceRecordId: number
  componentId: number
  changeType: string
  workDescription?: string
  oldState?: string
  newState?: string
  startedAt?: string
  completedAt?: string
  laborCost?: number
  partsCost?: number
  otherCost?: number
  totalCost?: number
  technicianName?: string
  vendorOrShop?: string
  notes?: string
  createdAt: string
  updatedAt?: string
}

export interface MaintenanceRecord {
  maintenanceRecordId: number
  vehicleId: number
  serviceDate: string
  serviceType: string
  cost: number
  description?: string
  maintenanceRecordComponents?: MaintenanceRecordComponent[]
}

/** LiquidEntry from the backend — fuel-only after the refactor */
export interface FuelEntry {
  liquidEntryId: number
  vehicleId: number
  liquidType: string
  refillDate: string
  amount: number
  cost: number
  mileage: number
  notes?: string
}

export interface Prediction {
  predictionId: number
  vehicleId: number
  componentType: string
  predictedServiceDate: string
  confidenceScore: number
  status: string
  completedAt?: string
  recommendation?: string
  createdAt: string
}

export interface TimelineEvent {
  date: string
  type: string
  description: string
  cost: number
  vehicleId: number
  vehicleName: string
  relatedId?: number
}

/** Monthly cost breakdown — from /vehicle/{id}/summary/costs */
export interface MonthlyCostSummary {
  month: string
  maintenanceCost: number
  fuelCost: number
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export interface FabOption {
  icon: string
  label: string
  path?: string
  onPress?: () => void
}

export type StatCardAccent = 'purple' | 'blue' | 'teal' | 'soft' | 'green' | 'red'

export type ActionButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger'

export type ComponentStatus = 'Perfect' | 'Good' | 'Normal' | 'Repair' | 'Critical' | 'Unknown'
