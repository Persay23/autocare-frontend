import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import DetailRow from '@/ui/DetailRow'
import ActionButton from '@/ui/ActionButton'
import FormInput from '@/ui/FormInput'
import DrivingSurveySheet from '@/ui/DrivingSurveySheet'
import { useAuth } from '@/features/auth/useAuth'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { useExpensesStore } from '@/features/expenses/expensesStore'
import { getTheme, setTheme } from '@/lib/theme'
import { updateUserProfile, changeUserPassword } from '@/features/users/api'
import {
  loadProfile, saveProfile, clearSkipped,
  WEEKLY_KM_LABELS, ENVIRONMENT_LABELS, STYLE_LABELS, USAGE_LABELS,
} from '@/lib/drivingProfile'
import type { DrivingProfile } from '@/lib/drivingProfile'

function formatStat(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [drivingProfile, setDrivingProfile] = useState<DrivingProfile | null>(
    () => user ? loadProfile(user.id) : null
  )
  const [showSurvey, setShowSurvey] = useState(false)
  const [isDark, setIsDark] = useState(() => getTheme() !== 'light')

  const { vehicles, fetch: fetchVehicles } = useVehiclesStore()
  const { summaries, fetchAll: fetchExpenses } = useExpensesStore()

  useEffect(() => { fetchVehicles() }, [fetchVehicles])
  useEffect(() => {
    if (!vehicles.length) return
    fetchExpenses(vehicles.map((v) => v.vehicleId))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length])

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    setIsDark(!isDark)
  }, [isDark])

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
  const yearsExperience = licenceYear ? new Date().getFullYear() - licenceYear : null

  const totalSpent = Object.values(summaries)
    .flat()
    .reduce((sum, d) => sum + (d.maintenanceCost ?? 0) + (d.fuelCost ?? 0), 0)

  return (
    <PageShell>
      {/* Avatar + identity */}
      <div style={{
        padding: '28px 22px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 68, height: 68, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 800, color: '#fff',
        }}>
          {initials}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
          {user?.name}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
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

      {/* Stats strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        margin: '0 22px 16px',
        background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14,
        overflow: 'hidden',
      }}>
        {[
          { val: String(vehicles.length || '—'), lbl: 'CARS' },
          { val: totalSpent > 0 ? `${formatStat(totalSpent)} zł` : '—', lbl: 'SPENT ZŁ' },
          { val: yearsExperience != null ? String(yearsExperience) : '—', lbl: 'YRS EXP' },
        ].map(({ val, lbl }, i) => (
          <div key={lbl} style={{
            textAlign: 'center', padding: '12px 8px',
            borderRight: i < 2 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{val}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', marginTop: 3 }}>
              {lbl}
            </div>
          </div>
        ))}
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
        <div style={{ margin: '0 22px 10px' }}>
          {/* Section header with inline Edit */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 8,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              Personal Info
            </div>
            <button
              onClick={() => { setEditing(true); setSuccess(null) }}
              style={{
                padding: '3px 10px', borderRadius: 999,
                background: 'none', border: '1px solid var(--border)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: 'var(--text2)', cursor: 'pointer',
              }}
            >
              Edit
            </button>
          </div>
          <div style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 14,
          }}>
            <DetailRow label="Email" value={user?.email} />
            <DetailRow label="Age" value={user?.age} />
            <DetailRow
              label="Experience"
              value={yearsExperience != null ? `${yearsExperience} yrs (since ${licenceYear})` : null}
            />
          </div>
        </div>
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

      {/* Change password form (inline) */}
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

      {/* Driving profile */}
      <div style={{ margin: '0 22px 12px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 8,
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            Driving Profile
          </div>
          {drivingProfile && (
            <button
              onClick={() => setShowSurvey(true)}
              style={{
                padding: '3px 10px', borderRadius: 999,
                background: 'none', border: '1px solid var(--border)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: 'var(--text2)', cursor: 'pointer',
              }}
            >
              Edit
            </button>
          )}
        </div>

        {drivingProfile ? (
          <div style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            {([
              { label: 'Weekly Distance', value: WEEKLY_KM_LABELS[drivingProfile.weeklyKm] },
              { label: 'Environment',     value: ENVIRONMENT_LABELS[drivingProfile.environment] },
              { label: 'Driving Style',   value: STYLE_LABELS[drivingProfile.drivingStyle] },
              { label: 'Usage Pattern',   value: USAGE_LABELS[drivingProfile.usagePattern] },
            ] as { label: string; value: string }[]).map(({ label, value }, i, arr) => (
              <div
                key={label}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: i < arr.length - 1 ? 10 : 0,
                  marginBottom: i < arr.length - 1 ? 10 : 0,
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setShowSurvey(true)}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(108,99,255,0.07), rgba(79,143,255,0.07))',
              border: '1px dashed rgba(108,99,255,0.35)',
              cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <span style={{ fontSize: 24 }}>🚗</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                Set up your driving profile
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: 'var(--text3)', marginTop: 3,
              }}>
                4 quick questions · improves AI predictions
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Appearance */}
      <div style={{ margin: '0 22px 12px' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          marginBottom: 8,
        }}>
          Appearance
        </div>
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {isDark ? 'Dark mode' : 'Light mode'}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>
              {isDark ? 'Switch to light' : 'Switch to dark'}
            </div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              position: 'relative',
              width: 48, height: 26, borderRadius: 13,
              border: 'none',
              background: isDark ? 'var(--accent)' : 'var(--surface3, #1e2035)',
              cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute',
              top: 3, left: isDark ? 25 : 3,
              width: 20, height: 20, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
            }} />
          </button>
        </div>
      </div>

      {/* Change password */}
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

      {/* Sign Out — visually isolated */}
      <div style={{
        margin: '16px 22px 0',
        borderTop: '1px solid var(--border)',
        paddingTop: 16,
      }}>
        <ActionButton variant="danger" onClick={handleLogout}>
          Sign Out
        </ActionButton>
      </div>

      <div style={{ height: 24 }} />

      {showSurvey && (
        <DrivingSurveySheet
          initialProfile={drivingProfile}
          onComplete={(profile) => {
            if (user) {
              saveProfile(user.id, profile)
              clearSkipped(user.id)
            }
            setDrivingProfile(profile)
            setShowSurvey(false)
          }}
          onSkip={() => setShowSurvey(false)}
        />
      )}
    </PageShell>
  )
}
