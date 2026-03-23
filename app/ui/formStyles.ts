import type { CSSProperties, FocusEvent } from 'react'

export const inputStyle: CSSProperties = {
  width: '100%',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '11px 13px',
  fontSize: 14,
  color: 'var(--text)',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

export const onFocus = (e: FocusEvent<HTMLElement>): void => {
  ;(e.target as HTMLElement).style.borderColor = 'var(--accent)'
  ;(e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(108,99,255,0.12)'
}

export const onBlur = (e: FocusEvent<HTMLElement>): void => {
  ;(e.target as HTMLElement).style.borderColor = 'var(--border)'
  ;(e.target as HTMLElement).style.boxShadow = 'none'
}
