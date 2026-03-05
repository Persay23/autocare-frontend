export function toConfidencePercent(score: number | string | null | undefined): number {
  const numeric = Number(score)
  if (Number.isNaN(numeric)) return 0
  if (numeric <= 1) return Math.max(0, Math.min(100, Math.round(numeric * 100)))
  return Math.max(0, Math.min(100, Math.round(numeric)))
}
