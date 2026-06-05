export function formatEnumLabel(value: string | null | undefined): string {
  if (value == null || value === '') return '\u2014'
  return String(value).replace(/([A-Z])/g, ' $1').trim()
}
