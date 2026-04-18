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
  vehicleComponentId?: number      // alias used by some endpoints
  vehicleId: number
  componentType: string
  name?: string
  vehicleComponentName?: string    // alias used by some endpoints
  brand?: string
  vehicleComponentBrand?: string   // alias used by some endpoints
  installationDate: string
  lastServiceDate?: string
  state: string
  currentState?: string            // alias used by health/detail endpoints
  notes?: string
  currentMileage: number
  expectedLifetimeKm: number
  expectedLifetimeYears: number
  partNumber?: string
  warrantyKm?: number
  warrantyDate?: string
  nextServiceRecommendedKm?: number
  nextServiceRecommendedDate?: string
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
  installationDate?: string        // included in some health responses
}

export interface MaintenanceRecordComponent {
  maintenanceRecordComponentId: number
  maintenanceRecordId: number
  componentId: number
  componentType?: string
  vehicleComponentName?: string
  changeType?: string              // alias — some endpoints return this
  componentChangeType?: string     // actual backend field name
  customerComplaint?: string
  workDescription?: string
  changedParts?: string
  laborCost?: number
  partsCost?: number
  otherCost?: number
  totalCost?: number
  expectedLifetimeKm?: number
  expectedLifetimeYears?: number
  createdAt: string
  updatedAt?: string
}

export interface MaintenanceRecord {
  maintenanceRecordId: number
  vehicleId: number
  serviceDate: string
  startedAt?: string
  completedAt?: string
  laborDays?: number
  serviceType: string
  serviceName: string
  mileage?: number
  cost: number
  description?: string
  technicianName?: string
  vendorOrShop?: string
  notes?: string
  invoiceNumber?: string
  invoiceImageUrl?: string
  maintenanceRecordComponents?: MaintenanceRecordComponent[]
}

/** LiquidEntry from the backend — fuel-only after the refactor */
export interface FuelEntry {
  liquidEntryId: number
  fuelEntryId?: number             // alias used by some endpoints
  vehicleId: number
  liquidType?: string
  fuelType?: string                // renamed from liquidType after refactor
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

export interface GeneralExpense {
  expenseId: number
  vehicleId: number
  category: string
  amount: number
  date: string
  description?: string
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
  icon: import('react').ElementType
  label: string
  path?: string
  onPress?: () => void
}

export type StatCardAccent = 'purple' | 'blue' | 'teal' | 'soft' | 'green' | 'red'

export type ActionButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger'

export type ComponentStatus = 'Perfect' | 'Good' | 'Normal' | 'Repair' | 'Critical' | 'Unknown'
