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
  averageKmPerYear?: number
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
  installedAtVehicleMileage: number // vehicle odometer at time of installation
  vehicleCurrentMileage: number    // vehicle's current odometer (for km-used calc)
  expectedLifetimeKm: number
  expectedLifetimeYears: number
  partNumber?: string
  warrantyKm?: number
  warrantyDate?: string
  nextServiceRecommendedKm?: number
  nextServiceRecommendedDate?: string
  // AI fields — populated after POST /api/ai/predict/{componentId}
  aiEstimatedNextServiceDate?: string
  aiEstimatedRemainingKm?: number
  aiConfidenceScore?: number
  aiRecommendation?: string
  aiGeneratedAt?: string
  aiHealthPercent?: number
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
  aiEstimatedNextServiceDate?: string
  aiGeneratedAt?: string
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
  vehicleComponentId?: number
  componentName?: string
  componentType?: string
  title: string
  description: string
  urgency: 'Immediate' | 'Soon' | 'Scheduled' | 'Suggested'
  confidenceScore?: number
  suggestedByDate?: string
  estimatedRemainingKm?: number
  status: string
  createdAt: string
  completedAt?: string
  ignoredAt?: string
}

export interface DiagnosisResult {
  likelyCauses: string[]
  urgency: 'safe' | 'soon' | 'stop'
  urgencyExplanation: string
  recommendedActions: string[]
  relatedComponents: string[]
  disclaimer: string
}

/** Persisted AI diagnosis — returned by POST/GET /api/ai/diagnose/{vehicleId} */
export interface AiDiagnosis {
  aiDiagnosisId: number
  symptom: string
  urgency: 'safe' | 'soon' | 'stop'
  urgencyExplanation: string
  likelyCauses: string[]
  recommendedActions: string[]
  relatedComponents: string[]
  disclaimer: string
  createdAt: string
}

export interface ReceiptPart {
  name?: string | null
  componentType?: string | null
  changeType?: string | null
  partsCost?: number | null
  workDescription?: string | null
}

export interface ReceiptParseResult {
  serviceName?: string | null
  serviceDate?: string | null
  serviceType?: string | null
  mileage?: number | null
  cost?: number | null
  currency?: string | null
  vendorOrShop?: string | null
  technicianName?: string | null
  invoiceNumber?: string | null
  description?: string | null
  parts?: ReceiptPart[] | null
}

export interface FuelParseResult {
  name?: string | null
  brand?: string | null
  fuelType?: string | null
  refillDate?: string | null
  amount?: number | null
  cost?: number | null
  currency?: string | null
  mileage?: number | null
  notes?: string | null
}

export interface ComponentParseResult {
  componentType?: string | null
  vehicleComponentName?: string | null
  vehicleComponentBrand?: string | null
  partNumber?: string | null
  installationDate?: string | null
  expectedLifetimeKm?: number | null
  expectedLifetimeYears?: number | null
  warrantyKm?: number | null
  warrantyDate?: string | null
  notes?: string | null
}

export interface ExpenseParseResult {
  expenseCategory?: string | null
  cost?: number | null
  currency?: string | null
  date?: string | null
  description?: string | null
  notes?: string | null
}

export interface VehicleParseResult {
  brand?: string | null
  model?: string | null
  yearOfProduction?: number | null
  vehicleType?: string | null
  transmissionType?: string | null
  engineType?: string | null
  fuelType?: string | null
  mileage?: number | null
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
  generalExpenseId: number
  vehicleId: number
  expenseCategory: string
  cost: number
  description?: string
  notes?: string
  date: string
  isRecurring: boolean
  recurrenceInterval?: string
  recurrenceEvery?: number
  recurrenceEndDate?: string
  nextOccurrenceDate?: string
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

export type ActionButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger'

export type ComponentStatus = 'Perfect' | 'Good' | 'Normal' | 'Repair' | 'Critical' | 'Unknown'
