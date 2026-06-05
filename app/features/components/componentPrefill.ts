import type { Vehicle } from '@/shared/types'
import type { ComponentPreset } from '@/features/components/componentTemplates'

export interface ComponentFormData {
  vehicleComponentName: string
  vehicleComponentBrand: string
  componentType: string
  state: string
  installationDate: string
  mileageAtInstall: string
  expectedLifetimeKm: string
  expectedLifetimeYears: string
  warrantyKm: string
  warrantyDate: string
  notes: string
  partNumber: string
}

export function prefillFromVehicle(
  preset: ComponentPreset,
  vehicle: Vehicle | undefined
): ComponentFormData {
  const today = new Date().toISOString().split('T')[0]
  const currentMileage = vehicle?.mileage ?? 0
  const { defaultLifetimeKm, defaultLifetimeYears } = preset

  // Estimate which replacement cycle the vehicle is in
  const cycle = Math.floor(currentMileage / defaultLifetimeKm)
  const installedAtMileage = cycle * defaultLifetimeKm

  // How far through the current lifecycle (0..1)
  const ratio = defaultLifetimeKm > 0
    ? (currentMileage - installedAtMileage) / defaultLifetimeKm
    : 0

  let state = 'Good'
  if (!vehicle) {
    state = 'Unknown'
  } else if (ratio < 0.5) {
    state = 'Good'
  } else if (ratio < 0.75) {
    state = 'Normal'
  } else if (ratio < 1.0) {
    state = 'Repair'
  } else {
    state = 'Critical'
  }

  return {
    vehicleComponentName: preset.name,
    vehicleComponentBrand: '',
    componentType: preset.componentType,
    state,
    installationDate: today,
    mileageAtInstall: String(installedAtMileage),
    expectedLifetimeKm: String(defaultLifetimeKm),
    expectedLifetimeYears: String(defaultLifetimeYears),
    warrantyKm: '',
    warrantyDate: '',
    notes: '',
    partNumber: '',
  }
}
