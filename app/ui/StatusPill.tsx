interface StatusPillProps {
  status: string
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Perfect:  { bg: 'rgba(56,189,248,0.1)',  color: '#38bdf8' },
  Good:     { bg: 'rgba(52,211,153,0.1)',  color: '#34d399' },
  Normal:   { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24' },
  Repair:   { bg: 'rgba(251,146,60,0.1)',  color: '#fb923c' },
  Critical: { bg: 'rgba(248,113,113,0.1)', color: '#f87171' },
  Unknown:  { bg: 'rgba(123,128,168,0.1)', color: '#7b80a8' },
}

export default function StatusPill({ status }: StatusPillProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.Unknown

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 9px',
      borderRadius: 999,
      background: style.bg,
      color: style.color,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: style.color,
        flexShrink: 0,
      }} />
      {status}
    </span>
  )
}