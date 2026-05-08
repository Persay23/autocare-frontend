export interface DrivingProfile {
  annualKm: number
  primaryUsage: 'City' | 'Highway' | 'Mixed' | 'OffRoad' | 'Track'
  drivingStyle: 'Gentle' | 'Normal' | 'Aggressive'
  usagePattern: 'Daily' | 'WeekdaysOnly' | 'WeekendsOnly' | 'Occasional'
  climateZone: 'Temperate' | 'Cold' | 'Hot' | 'Humid'
  parkingType: 'Garage' | 'Outdoor' | 'Mixed'
}

// ── Skip flag (still stored locally — no backend equivalent) ──────────────────

const skippedKey = (userId: string) => `autocare_survey_skipped_${userId}`

export const markSkipped = (userId: string) => {
  localStorage.setItem(skippedKey(userId), '1')
}

export const hasSkipped = (userId: string) => {
  return !!localStorage.getItem(skippedKey(userId))
}

export const clearSkipped = (userId: string) => {
  localStorage.removeItem(skippedKey(userId))
}

// ── Display helpers ────────────────────────────────────────────────────────────

export const formatAnnualKm = (km: number): string =>
  `${km.toLocaleString()} km / year`

export const PRIMARY_USAGE_LABELS: Record<DrivingProfile['primaryUsage'], string> = {
  City:    'City / Urban',
  Highway: 'Highway',
  Mixed:   'Mixed',
  OffRoad: 'Off-road / Rural',
  Track:   'Track / Sport',
}

export const STYLE_LABELS: Record<DrivingProfile['drivingStyle'], string> = {
  Gentle:     'Gentle',
  Normal:     'Normal',
  Aggressive: 'Aggressive',
}

export const USAGE_LABELS: Record<DrivingProfile['usagePattern'], string> = {
  Daily:        'Daily commuter',
  WeekdaysOnly: 'Weekdays only',
  WeekendsOnly: 'Weekend driver',
  Occasional:   'Occasional',
}

export const CLIMATE_LABELS: Record<DrivingProfile['climateZone'], string> = {
  Temperate: 'Temperate',
  Cold:      'Cold / Winter',
  Hot:       'Hot / Arid',
  Humid:     'Humid / Tropical',
}

export const PARKING_LABELS: Record<DrivingProfile['parkingType'], string> = {
  Garage:  'Garage',
  Outdoor: 'Outdoor / Street',
  Mixed:   'Mixed',
}
