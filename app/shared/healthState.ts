import type { VehicleComponent } from '@/shared/types'

// ─── State derivation ─────────────────────────────────────────────────────────

/** Maps a remaining-life percentage to a state label. Single source of truth.
 *  Mirrors backend ComponentStateCalculator.DeriveState thresholds exactly. */
export function healthPctToState(pct: number): string {
  if (pct > 75) return 'Perfect'   // > 75 matches backend's `<= 75 → Good`
  if (pct >= 51) return 'Good'
  if (pct >= 31) return 'Normal'
  if (pct >= 16) return 'Repair'
  return 'Critical'
}

// ─── Color mapping ────────────────────────────────────────────────────────────

/** Maps a state label to a CSS color variable. */
export function stateColor(state: string): string {
  switch (state) {
    case 'Perfect':  return 'var(--accent4)'
    case 'Good':     return 'var(--green)'
    case 'Normal':   return 'var(--yellow)'
    case 'Repair':   return 'var(--orange)'
    case 'Critical': return 'var(--red)'
    default:         return 'var(--text2)'
  }
}

/** Maps a remaining-life percentage directly to a CSS color.
 *  Single source of truth — replaces all local healthColor / getColor functions. */
export function colorFromPct(pct: number): string {
  return stateColor(healthPctToState(pct))
}

// ─── Frontend health computation ──────────────────────────────────────────────

/** All derived measurements for a raw VehicleComponent (CRUD DTO).
 *  Use this when the component health endpoint data is not available.
 *  Mirrors backend ComponentHealthCalculator.Compute. */
export interface ComponentMeasurements {
  kmPercent:    number  // remaining km life %
  yearsPercent: number  // remaining year life %
  healthPct:    number  // min(km, years) — overall health
}

export function computeComponentMeasurements(c: VehicleComponent): ComponentMeasurements {
  const kmUsed = Math.max(0, (c.vehicleCurrentMileage ?? 0) - (c.installedAtVehicleMileage ?? 0))
  const kmPercent = (c.expectedLifetimeKm ?? 0) > 0
    ? Math.max(0, Math.min(100, (1 - kmUsed / c.expectedLifetimeKm) * 100))
    : 100

  const ageYears = c.installationDate
    ? (Date.now() - new Date(c.installationDate).getTime()) / (365.25 * 24 * 3600 * 1000)
    : 0
  const yearsPercent = (c.expectedLifetimeYears ?? 0) > 0
    ? Math.max(0, Math.min(100, 100 - (ageYears / c.expectedLifetimeYears) * 100))
    : 100

  return { kmPercent, yearsPercent, healthPct: Math.min(kmPercent, yearsPercent) }
}
