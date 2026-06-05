import type { CSSProperties, ReactNode } from 'react'
import type { ActionButtonVariant } from '@/shared/types'

interface ActionButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: ActionButtonVariant
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  style?: CSSProperties
}

const VARIANTS: Record<ActionButtonVariant, CSSProperties> = {
  primary:   { background: 'var(--accent)',              color: '#fff',          border: 'none' },
  secondary: { background: 'var(--surface2)',            color: 'var(--accent)', border: '1px solid rgba(108,99,255,0.3)' },
  tertiary:  { background: 'transparent',                color: 'var(--accent)', border: '1.5px solid var(--accent)' },
  ghost:     { background: 'transparent',                color: 'var(--text2)',  border: '1px solid var(--border)' },
  danger:    { background: 'rgba(248,113,113,0.08)',     color: 'var(--red)',    border: '1px solid rgba(248,113,113,0.2)' },
}

export default function ActionButton({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  style: extraStyle,
}: ActionButtonProps) {
  const v = VARIANTS[variant] ?? VARIANTS.primary

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        // CHANGE: single width + margin declaration, no duplicate
        width: 'calc(100% - 44px)',
        margin: '0 22px',
        padding: '12px 14px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'opacity 0.15s',
        ...v,
        ...extraStyle,
      }}
    >
      {children}
    </button>
  )
}