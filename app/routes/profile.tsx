import { useState/*, useEffect*/ } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import DetailCard from '@/ui/DetailCard'
import DetailRow from '@/ui/DetailRow'
import ActionButton from '@/ui/ActionButton'
import FormInput from '@/ui/FormInput'
import { useAuth } from '@/features/auth/useAuth'
import { updateUserProfile, changeUserPassword } from '@/features/users/api'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: user?.name ?? '',
    age: String(user?.age ?? ''),
    drivingExperience: String(user?.drivingExperience ?? ''),
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const setPassword = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  const licenceYear = user?.drivingExperience
  const yearsExperience = licenceYear
    ? new Date().getFullYear() - licenceYear
    : null

  return (
    <PageShell>
      {/* Avatar */}
      <div style={{
        padding: '28px 22px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 68, height: 68, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 800, color: '#fff',
        }}>
          {initials}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
          {user?.name}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: 'var(--text3)',
        }}>
          {user?.email}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 9px', borderRadius: 999,
          background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.3)',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--accent)',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
          Member
        </div>
      </div>

      {/* Success / error banners */}
      {success && (
        <div style={{
          margin: '0 22px 10px', padding: '10px 14px',
          background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
          borderRadius: 10, fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, color: 'var(--green)',
        }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{
          margin: '0 22px 10px', padding: '10px 14px',
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 10, fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, color: 'var(--red)',
        }}>
          {error}
        </div>
      )}

      {/* Personal info */}
      {!editing ? (
        <DetailCard title="Personal Info">
          <DetailRow label="Name" value={user?.name} />
          <DetailRow label="Email" value={user?.email} />
          <DetailRow label="Age" value={user?.age} />
          <DetailRow
            label="Experience"
            value={yearsExperience != null
              ? `${yearsExperience} yrs (since ${licenceYear})`
              : null
            }
          />
        </DetailCard>
      ) : (
        <div style={{ padding: '0 22px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            marginBottom: 12,
          }}>
            Edit Profile
          </div>
          <FormInput label="Name" value={form.name} onChange={set('name')} />
          <FormInput label="Age" type="number" value={form.age} onChange={set('age')} />
          <FormInput label="Licence Year" type="number" value={form.drivingExperience} onChange={set('drivingExperience')} placeholder="2018" />

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={async () => {
                setLoading(true)
                setError(null)
                try {
                  await updateUserProfile(user!.id, {
                    name: form.name || null,
                    age: form.age ? Number.parseInt(form.age, 10) : null,
                    drivingExperience: form.drivingExperience
                      ? Number.parseInt(form.drivingExperience, 10)
                      : null,
                  })
                  setSuccess('Profile updated.')
                  setEditing(false)
                } catch {
                  setError('Failed to update profile.')
                } finally {
                  setLoading(false)
                }
              }}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                background: 'var(--accent)', color: '#fff',
                border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                background: 'var(--surface2)', color: 'var(--text2)',
                border: '1px solid var(--border)', fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Change password */}
      {changingPassword && (
        <div style={{ padding: '0 22px', marginBottom: 10 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12,
          }}>
            Change Password
          </div>
          <FormInput
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={setPassword('currentPassword')}
          />
          <FormInput
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={setPassword('newPassword')}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={async () => {
                setLoading(true)
                setError(null)
                try {
                  await changeUserPassword(user!.id, {
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                  })
                  setSuccess('Password changed.')
                  setChangingPassword(false)
                  setPasswordForm({ currentPassword: '', newPassword: '' })
                } catch {
                  setError('Password change failed. Check your current password.')
                } finally {
                  setLoading(false)
                }
              }}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                background: 'var(--accent)', color: '#fff',
                border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {loading ? 'Saving...' : 'Change'}
            </button>
            <button
              onClick={() => setChangingPassword(false)}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                background: 'var(--surface2)', color: 'var(--text2)',
                border: '1px solid var(--border)', fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ height: 8 }} />
      {!editing && (
        <ActionButton variant="secondary" onClick={() => { setEditing(true); setSuccess(null) }}>
          Edit Profile
        </ActionButton>
      )}
      <div style={{ height: 8 }} />
      {!changingPassword && (
        <ActionButton
          variant="secondary"
          onClick={() => { setChangingPassword(true); setSuccess(null) }}
          style={{ color: 'var(--accent3)', borderColor: 'rgba(167,139,250,0.3)' }}
        >
          Change Password
        </ActionButton>
      )}
      <div style={{ height: 8 }} />
      <ActionButton variant="danger" onClick={handleLogout}>
        Sign Out
      </ActionButton>
      <div style={{ height: 24 }} />
    </PageShell>
  )
}
