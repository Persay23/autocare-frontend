export interface EventEntry {
  id: number
  date: string
  mileage: number | null | undefined
}

/** Returns the highest mileage from all events dated strictly before targetDate */
export function getPrecedingMinMileage(events: EventEntry[], targetDate: string): number {
  if (!targetDate) return 0
  const target = new Date(targetDate).getTime()
  return events
    .filter((e) => e.mileage != null && new Date(e.date).getTime() < target)
    .reduce<number>((max, e) => (e.mileage! > max ? e.mileage! : max), 0)
}

export function isMileageValid(value: number | null | undefined, min: number): boolean {
  if (value == null) return true  // "don't know" — skip validation
  return value >= min
}

export function mileageHint(min: number): string {
  return min > 0 ? `At least ${min.toLocaleString()} km` : ''
}
