import type { ReceiptPart, VehicleComponent } from '@/shared/types'
import { makeEmptyEntry, CHANGE_TYPES, type ComponentEntry } from '@/features/records/componentEntry'

const compId = (c: VehicleComponent) => c.vehicleComponentId ?? c.componentId

// Does a parsed part's name overlap the component's type/name/brand text?
function nameOverlap(comp: VehicleComponent, partName: string): boolean {
  const hay = [
    comp.componentType,
    comp.vehicleComponentName ?? comp.name,
    comp.vehicleComponentBrand ?? comp.brand,
  ].filter(Boolean).join(' ').toLowerCase()
  if (!hay) return false
  const tokens = partName.toLowerCase().split(/\W+/).filter((t) => t.length >= 3)
  return tokens.some((t) => hay.includes(t))
}

/**
 * Finds the existing tracked component that best matches a parsed receipt part.
 * Matches on component type first, disambiguating by name overlap, then falls back
 * to a name-only match. Returns undefined when nothing is a confident fit.
 * `takenIds` excludes components already linked in this record.
 */
export function matchPartToComponent(
  part: ReceiptPart,
  components: VehicleComponent[],
  takenIds: Set<number | undefined>,
): VehicleComponent | undefined {
  const available = components.filter((c) => !takenIds.has(compId(c)))
  if (available.length === 0) return undefined

  const type = part.componentType?.toLowerCase() ?? ''
  const name = part.name ?? ''

  const byType = type
    ? available.filter((c) => c.componentType?.toLowerCase() === type)
    : []

  if (byType.length === 1) return byType[0]
  if (byType.length > 1) return byType.find((c) => nameOverlap(c, name)) ?? byType[0]

  return name ? available.find((c) => nameOverlap(c, name)) : undefined
}

function normalizeChangeType(raw?: string | null): string {
  if (!raw) return 'Replaced'
  const hit = CHANGE_TYPES.find((t) => t.toLowerCase() === raw.toLowerCase())
  return hit ?? 'Replaced'
}

/** Builds a prefilled component entry from a parsed part (optionally bound to an existing component). */
export function entryFromPart(part: ReceiptPart, comp?: VehicleComponent): ComponentEntry {
  const entry = makeEmptyEntry(comp, 'Good')
  entry.changeType      = normalizeChangeType(part.changeType)
  entry.workDescription = part.workDescription ?? part.name ?? ''
  entry.partsCost       = part.partsCost != null ? String(part.partsCost) : ''
  return entry
}

/**
 * Folds another parsed part into an existing entry — used when several receipt line
 * items are mapped to the same tracked component. Appends the work note and sums parts cost.
 */
export function mergePartIntoEntry(entry: ComponentEntry, part: ReceiptPart): ComponentEntry {
  const addWork = part.workDescription ?? part.name ?? ''
  const workDescription = [entry.workDescription, addWork].filter(Boolean).join('; ')
  const summed = (parseFloat(entry.partsCost) || 0) + (part.partsCost ?? 0)
  return {
    ...entry,
    changeType:      entry.changeType || normalizeChangeType(part.changeType),
    workDescription,
    partsCost:       summed > 0 ? String(summed) : entry.partsCost,
  }
}
