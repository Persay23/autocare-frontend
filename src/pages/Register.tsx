import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register as apiRegister } from '../api/auth'
import { ErrorBanner } from '../components/shared/AsyncStates'
import { inputStyle, onFocus, onBlur } from '../components/shared/formStyles'
import { labelStyle } from '../styles/pageStyles'

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    drivingExperience: '',
    gender: 'Male',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await apiRegister({
        name: form.name,
        email: form.email,
        password: form.password,
        age: form.age ? Number.parseInt(form.age, 10) : null,
        drivingExperience: form.drivingExperience ? Number.parseInt(form.drivingExperience, 10) : null,
        gender: form.gender,
      })
      navigate('/login')
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string; 0?: { description?: string } } } }
      setError(
        axiosErr.response?.data?.message ||
          axiosErr.response?.data?.[0]?.description ||
          'Registration failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: '0 0 40px',
      }}
    >
      <div style={{ padding: '40px 22px 24px' }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--text)',
            marginBottom: 4,
          }}
        >
          Create account
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--text2)',
            letterSpacing: '0.05em',
          }}
        >
          Start tracking your vehicles
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '0 22px' }}>
        {error && <ErrorBanner message={error} />}

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Full Name</label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="Jan Kowalski"
            required
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="jan@example.com"
            required
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="********"
            required
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Age</label>
            <input
              type="number"
              value={form.age}
              onChange={set('age')}
              placeholder="28"
              min="16"
              max="100"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
          <div>
            <label style={labelStyle}>Licence Year</label>
            <input
              type="number"
              value={form.drivingExperience}
              onChange={set('drivingExperience')}
              placeholder="2018"
              min="1970"
              max={new Date().getFullYear()}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Gender</label>
          <select
            value={form.gender}
            onChange={set('gender')}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
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
            marginTop: 10,
          }}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <div
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text2)',
          }}
        >
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </form>
    </div>
  )
}
