// Card container used in all detail screens
export default function DetailCard({ title, children }) {
  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: 14,
      margin: '0 22px 10px',
    }}>
      {title && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: 'var(--text3)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 12,
        }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}