/**
 * Shared filter primitives used by FilterPill and every list page.
 */

export interface FilterOption {
  key:    string
  label:  string   // full label, e.g. "Critical (3)" — count suffix is stripped for pill display
  color?: string   // optional CSS value, e.g. "var(--red)" — renders as a colored dot in the dropdown
}
