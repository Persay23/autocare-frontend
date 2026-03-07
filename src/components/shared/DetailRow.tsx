import type { ReactNode } from 'react'

interface DetailRowProps {
  label: string
  value?: ReactNode
  valueColor?: string
}

export default function DetailRow({ label, value, valueColor }: DetailRowProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '9px 0',
      borderBottom: '1px solid var(--border2)',
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: 'var(--text2)',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 13,
        fontWeight: 500,
        color: valueColor ?? 'var(--text)',
      }}>
        {value ?? '—'}
      </span>
    </div>
  )
}