export function LoadingState({ label = 'LOADING...', padding = '60px 22px' }: { label?: string; padding?: string }) {
  return (
    <div
      style={{
        padding,
        textAlign: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: 'var(--text3)',
        letterSpacing: '0.1em',
      }}
    >
      {label}
    </div>
  )
}

export function ErrorState({ message, margin = '12px 22px' }: { message: string; margin?: string }) {
  return (
    <div
      style={{
        margin,
        padding: '10px 14px',
        background: 'rgba(248,113,113,0.08)',
        border: '1px solid rgba(248,113,113,0.2)',
        borderRadius: 10,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: 'var(--red)',
      }}
    >
      {message}
    </div>
  )
}

export function EmptyState({ icon, message }: { icon?: string; message: string }) {
  return (
    <div style={{ padding: '60px 22px', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, color: 'var(--text2)' }}>{message}</div>
    </div>
  )
}

export function LoadingText() {
  return <LoadingState />
}

export function ErrorBanner({ message }: { message: string }) {
  return <ErrorState message={message} margin="0 22px 12px" />
}
