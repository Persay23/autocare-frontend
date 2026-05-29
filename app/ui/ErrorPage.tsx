import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'

export default function ErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()

  const is404 = isRouteErrorResponse(error) && error.status === 404

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', fontFamily: "'Outfit', sans-serif",
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>
        {is404 ? '🔍' : '⚠️'}
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
        {is404 ? 'Page not found' : 'Something went wrong'}
      </div>

      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        color: 'var(--text3)', marginBottom: 36,
        maxWidth: 300, lineHeight: 1.7,
      }}>
        {is404
          ? "This page doesn't exist."
          : 'An unexpected error occurred. Try going back or refreshing the page.'}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '11px 22px', borderRadius: 12,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            color: 'var(--text2)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          Go back
        </button>
        <button
          onClick={() => navigate('/', { replace: true })}
          style={{
            padding: '11px 22px', borderRadius: 12,
            background: 'var(--accent)', border: 'none',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          Home
        </button>
      </div>
    </div>
  )
}
