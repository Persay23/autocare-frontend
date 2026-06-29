import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { resendConfirmation } from '@/features/auth/api'
import { ErrorBanner } from '@/ui/AsyncStates'
import { inputStyle, onFocus, onBlur } from '@/ui/formStyles'
import { labelStyle } from '@/styles/pageStyles'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [resendNote, setResendNote] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setNeedsConfirm(false)
    setResendNote(null)
    setLoading(true)

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string; code?: string } } }
      const data = e.response?.data
      if (data?.code === 'email_not_confirmed') {
        setNeedsConfirm(true)
        setError(data.message ?? 'Please confirm your email before logging in.')
      } else if (e.response?.status === 401) {
        setError(data?.message ?? 'Invalid email or password.')
      }
      // no-response / 429 / 500 → global ErrorSnackbar
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendNote(null)
    try {
      await resendConfirmation(email)
      setResendNote('Confirmation link sent — check your inbox.')
    } catch {
      setResendNote('Could not resend right now. Please try again shortly.')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 420,
        padding: '0 0 40px',
        display: 'flex', flexDirection: 'column',
      }}>
      <div style={{ textAlign: 'center', padding: '40px 22px 32px' }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
          Auto<span style={{ color: 'var(--accent)' }}>Care</span>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--accent3)',
            letterSpacing: '0.15em',
            marginBottom: 20,
          }}
        >
          YOUR GARAGE. YOUR DATA.
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Welcome back
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--text2)',
          }}
        >
          Sign in to your garage
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '0 22px' }}>
        {error && <ErrorBanner message={error} />}

        {needsConfirm && (
          <div style={{ marginBottom: 14, textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleResend}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', fontSize: 13, fontWeight: 600, textDecoration: 'underline',
              }}
            >
              Resend confirmation link
            </button>
            {resendNote && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>{resendNote}</div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jan@example.com"
            required
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 12,
            background: loading ? 'var(--surface3)' : 'var(--accent)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
            marginBottom: 20,
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text2)',
          }}
        >
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Register
          </Link>
        </div>
      </form>
      </div>
    </div>
  )
}
