interface StatusPillProps {
  status: string
}

// Theme-aware: colours come from CSS variables (which flip per theme); the tinted
// background and border are derived from the same colour via color-mix so the pill
// reads correctly in both light and dark. Status shown as an accent, not a fill.
const STATUS_COLOR: Record<string, string> = {
  Perfect:  'var(--accent4)',
  Good:     'var(--green)',
  Normal:   'var(--yellow)',
  Repair:   'var(--orange)',
  Critical: 'var(--red)',
  Unknown:  'var(--text3)',
}

export default function StatusPill({ status }: StatusPillProps) {
  const color = STATUS_COLOR[status] ?? STATUS_COLOR.Unknown

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 9px',
      borderRadius: 999,
      background: `color-mix(in srgb, ${color} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      color,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  )
}
