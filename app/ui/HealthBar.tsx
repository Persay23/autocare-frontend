import { colorFromPct } from '@/shared/healthState'

interface HealthBarProps {
  percent?: number | null
  height?: number
}

export default function HealthBar({ percent, height = 4 }: HealthBarProps) {
  const clamped = Math.min(100, Math.max(0, percent ?? 0))

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
        background: colorFromPct(clamped),
        borderRadius: 99,
        transition: 'width 0.3s ease',
      }} />
    </div>
  )
}
