export interface DrivingProfile {
  weeklyKm: 'under100' | '100to300' | '300to500' | '500to1000' | 'over1000'
  environment: 'city' | 'highway' | 'mixed' | 'offroad'
  drivingStyle: 'gentle' | 'normal' | 'aggressive'
  usagePattern: 'daily' | 'weekend' | 'occasional'
  completedAt: string
}

const profileKey = (userId: string) => `autocare_driving_profile_${userId}`
const skippedKey = (userId: string) => `autocare_survey_skipped_${userId}`

export const loadProfile = (userId: string): DrivingProfile | null => {
  try {
    const raw = localStorage.getItem(profileKey(userId))
    return raw ? (JSON.parse(raw) as DrivingProfile) : null
  } catch {
    return null
  }
}

export const saveProfile = (userId: string, profile: DrivingProfile) => {
  localStorage.setItem(profileKey(userId), JSON.stringify(profile))
}

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

export const WEEKLY_KM_LABELS: Record<DrivingProfile['weeklyKm'], string> = {
  under100:   '< 100 km / week',
  '100to300': '100–300 km / week',
  '300to500': '300–500 km / week',
  '500to1000':'500–1000 km / week',
  over1000:   '1000+ km / week',
}

export const ENVIRONMENT_LABELS: Record<DrivingProfile['environment'], string> = {
  city:    'City / Urban',
  highway: 'Highway',
  mixed:   'Mixed',
  offroad: 'Off-road / Rural',
}

export const STYLE_LABELS: Record<DrivingProfile['drivingStyle'], string> = {
  gentle:     'Gentle',
  normal:     'Normal',
  aggressive: 'Aggressive',
}

export const USAGE_LABELS: Record<DrivingProfile['usagePattern'], string> = {
  daily:      'Daily commuter',
  weekend:    'Weekend driver',
  occasional: 'Occasional',
}
