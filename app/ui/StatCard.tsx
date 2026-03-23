import type { ReactNode } from 'react'
import type { StatCardAccent } from '@/lib/types'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: string
  accent?: StatCardAccent
}

const ACCENT_COLORS: Record<StatCardAccent, string> = {
  purple: 'var(--accent)',
  blue:   'var(--accent2)',
  teal:   'var(--accent4)',
  soft:   'var(--accent3)',
  green:  'var(--green)',
  red:    'var(--red)',
}

export default function StatCard({ label, value, sub, accent = 'purple' }: StatCardProps) {
  const borderColor = ACCENT_COLORS[accent] ?? ACCENT_COLORS.purple

  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '12px 14px',
      position: 'relative',
      overflow: 'hidden',
      flex: 1,
    }}>
      {/* Coloured top border */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 2,
        background: borderColor,
      }} />

      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: 'var(--text3)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 6,
      }}>
        {label}
      </div>

      <div style={{
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--text)',
        lineHeight: 1,
      }}>
        {value}
      </div>

      {sub && (
        <div style={{
          fontSize: 10,
          color: 'var(--text2)',
          marginTop: 4,
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}