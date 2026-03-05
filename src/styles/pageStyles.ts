import type { CSSProperties } from 'react'

export const backBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '16px 22px 8px',
  background: 'none',
  border: 'none',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  color: 'var(--text2)',
  cursor: 'pointer',
}

export const labelStyle: CSSProperties = {
  display: 'block',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 5,
}
