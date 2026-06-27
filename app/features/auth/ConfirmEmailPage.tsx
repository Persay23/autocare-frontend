import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmEmail } from '@/features/auth/api'

type Status = 'loading' | 'success' | 'error'

export default function ConfirmEmail() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('Confirming your email…')
  const ran = useRef(false)

  useEffect(() => {
    // The token is single-use; guard against React StrictMode's double-invoke in dev.
    if (ran.current) return
    ran.current = true

    const userId = params.get('userId')
    const token = params.get('token')
    if (!userId || !token) {
      setStatus('error')
      setMessage('Invalid confirmation link.')
      return
    }

    confirmEmail(userId, token)
      .then((res) => {
        setStatus('success')
        setMessage((res.data as { message?: string })?.message ?? 'Email confirmed — you can now log in.')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Confirmation failed or the link has expired.'
        )
      })
  }, [params])

  const icon = status === 'success' ? '✅' : status === 'error' ? '⚠️' : '⏳'
  const color = status === 'success' ? 'var(--green)' : status === 'error' ? 'var(--red)' : 'var(--text2)'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '40px 22px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
          {status === 'success' ? 'Email confirmed' : status === 'error' ? "Couldn't confirm" : 'Confirming…'}
        </div>
        <div style={{ fontSize: 14, color, marginBottom: 24 }}>{message}</div>

        {status !== 'loading' && (
          <Link
            to="/login"
            style={{
              display: 'inline-block', padding: '12px 24px', borderRadius: 12,
              background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
            }}
          >
            Go to sign in
          </Link>
        )}
      </div>
    </div>
  )
}
