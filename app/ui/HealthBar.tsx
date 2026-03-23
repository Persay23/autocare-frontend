interface HealthBarProps {
  percent?: number | null
  height?: number
}

function getColor(percent: number): string {
  if (percent <= 15) return 'var(--red)'      // Critical
  if (percent <= 30) return 'var(--orange)'   // Repair
  if (percent <= 50) return 'var(--yellow)'   // Normal
  if (percent <= 74) return 'var(--green)'    // Good
  return 'var(--accent4)'                     // Perfect
}

export default function HealthBar({ percent, height = 4 }: HealthBarProps) {
  const clamped = Math.min(100, Math.max(0, percent ?? 0))
  const color = getColor(clamped)

  return (
    <div style={{
      height,
      background: 'var(--border)',
      borderRadius: 99,
      overflow: 'hidden',
      flex: 1,
    }}>
      <div style={{
        height: '100%',
        width: `${clamped}%`,
        background: color,
        borderRadius: 99,
        transition: 'width 0.3s ease',
      }} />
    </div>
  )
}