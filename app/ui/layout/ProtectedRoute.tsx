import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  // Still waiting for /auth/me — don't redirect yet
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: 'var(--text3)',
        letterSpacing: '0.1em',
      }}>
        LOADING...
      </div>
    )
  }

  // /auth/me returned 401 or failed — user is not logged in
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // User is authenticated — render whatever route matched
  return <Outlet />
}