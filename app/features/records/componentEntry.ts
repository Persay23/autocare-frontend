import type { VehicleComponent } from '@/lib/types'
import { healthPctToState } from '@/lib/healthState'

export const CHANGE_TYPES = ['Replaced', 'Repaired', 'Inspected', 'Adjusted', 'Cleaned', 'Other']

export interface ComponentEntry {
  changeType: string
  workDescription: string
  changedParts: string
  laborCost: string
  partsCost: string
  otherCost: string
  newState: string
  customerComplaint: string
  // Replace-only — patched onto VehicleComponent when changeType === 'Replaced'
  brand: string
  partNumber: string
  expectedLifetimeKm: string
  expectedLifetimeYears: string
  warrantyKm: string
  warrantyDate: string
}

export interface SelectedComponent {
  comp: VehicleComponent
  entry: ComponentEntry
}

export function makeEmptyEntry(comp?: VehicleComponent, healthPct?: number | null): ComponentEntry {
  return {
    changeType: '',
    workDescription: '',
    changedParts: '',
    laborCost: '',
    partsCost: '',
    otherCost: '',
    newState: healthPct != null ? healthPctToState(healthPct) : 'Unknown',
    customerComplaint: '',
    brand: comp?.vehicleComponentBrand ?? comp?.brand ?? '',
    partNumber: comp?.partNumber ?? '',
    expectedLifetimeKm: comp?.expectedLifetimeKm != null ? String(comp.expectedLifetimeKm) : '',
    expectedLifetimeYears: comp?.expectedLifetimeYears != null ? String(comp.expectedLifetimeYears) : '',
    warrantyKm: comp?.warrantyKm != null ? String(comp.warrantyKm) : '',
    warrantyDate: comp?.warrantyDate ? comp.warrantyDate.split('T')[0] : '',
  }
}

export function entryTotal(entry: ComponentEntry): number {
  return (
    (parseFloat(entry.laborCost) || 0) +
    (parseFloat(entry.partsCost) || 0) +
    (parseFloat(entry.otherCost) || 0)
  )
}
