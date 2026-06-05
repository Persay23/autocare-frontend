import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import DetailRow from '@/ui/DetailRow'
import ActionButton from '@/ui/ActionButton'
import FormInput from '@/ui/FormInput'
import DrivingSurveySheet from '@/ui/DrivingSurveySheet'
import { useAuth } from '@/features/auth/useAuth'
import { useVehiclesStore } from '@/features/vehicles/vehicleStore'
import { useExpensesStore } from '@/features/expenses/expenseStore'
import { getTheme, setTheme } from '@/styles/theme'
import { useCurrencyStore, formatMoney, type Currency, SYMBOLS } from '@/features/currency/currencyStore'
import { useNotificationsStore } from '@/features/notifications/notificationStore'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { updateUserProfile, changeUserPassword } from '@/features/users/api'
import {
  clearSkipped,
  formatAnnualKm,
  PRIMARY_USAGE_LABELS, STYLE_LABELS, USAGE_LABELS, CLIMATE_LABELS, PARKING_LABELS,
} from '@/features/drivingProfile/utils'
import { useDrivingProfileStore } from '@/features/drivingProfile/drivingProfileStore'


export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showSurvey, setShowSurvey] = useState(false)
  const {
    profile: drivingProfile,
    exists: profileExists,
    fetch: fetchProfile,
    save: saveProfile,
  } = useDrivingProfileStore()
  const [isDark, setIsDark] = useState(() => getTheme() !== 'light')
  const [notifOpen, setNotifOpen] = useState(false)
  const { currency, setCurrency } = useCurrencyStore()
  const { prefs: notifPrefs, toggle: toggleNotif, setAll: setAllNotif } = useNotificationsStore()

  const { vehicles, fetch: fetchVehicles } = useVehiclesStore()
  const { summaries, fetchAll: fetchExpenses } = useExpensesStore()

  useEffect(() => { fetchVehicles() }, [fetchVehicles])
  useEffect(() => {
    if (!vehicles.length) return
    fetchExpenses(vehicles.map((v) => v.vehicleId))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length])

  useEffect(() => {
    if (user) fetchProfile(user.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    setIsDark(!isDark)
  }, [isDark])

  const [form, setForm] = useState({
    name: user?.name ?? '',
    age: String(user?.age ?? ''),
    gender: user?.gender ?? '',
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
          { val: totalSpent > 0 ? formatMoney(totalSpent, currency) : '—', lbl: 'SPENT' },
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <FormInput label="Age" type="number" value={form.age} onChange={set('age')} />
            <FormInput label="Gender" value={form.gender} onChange={set('gender')}>
              <option value="">Not specified</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </FormInput>
          </div>
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
                    gender: form.gender || null,
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
              { label: 'Annual Distance', value: formatAnnualKm(drivingProfile.annualKm) },
              { label: 'Primary Usage',   value: PRIMARY_USAGE_LABELS[drivingProfile.primaryUsage] },
              { label: 'Driving Style',   value: STYLE_LABELS[drivingProfile.drivingStyle] },
              { label: 'Usage Pattern',   value: USAGE_LABELS[drivingProfile.usagePattern] },
              { label: 'Climate Zone',    value: CLIMATE_LABELS[drivingProfile.climateZone] },
              { label: 'Parking',         value: PARKING_LABELS[drivingProfile.parkingType] },
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
                6 quick questions · improves AI predictions
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
          borderRadius: 14, overflow: 'hidden',
        }}>
          {/* Currency row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Currency</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>
                amounts converted from PLN
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['PLN', 'USD', 'EUR', 'UAH'] as Currency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  style={{
                    padding: '5px 9px', borderRadius: 8,
                    background: currency === c ? 'var(--accent)' : 'var(--surface)',
                    border: `1px solid ${currency === c ? 'var(--accent)' : 'var(--border)'}`,
                    color: currency === c ? '#fff' : 'var(--text2)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11, fontWeight: currency === c ? 700 : 400,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {SYMBOLS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* Dark mode row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
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
      </div>

      {/* Notifications */}
      {(() => {
        const vals     = Object.values(notifPrefs)
        const onCount  = vals.filter(Boolean).length
        const allOn    = onCount === vals.length
        const anyOn    = onCount > 0
        const toggleBg = allOn ? 'var(--accent)' : anyOn ? 'var(--yellow)' : 'var(--surface3)'
        const statusTxt = allOn
          ? 'All notifications on'
          : anyOn
          ? `${onCount} of ${vals.length} enabled`
          : 'All notifications off'

        return (
          <div style={{ margin: '0 22px 12px' }}>

            {/* Accordion header */}
            <button
              type="button"
              onClick={() => setNotifOpen((p) => !p)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '13px 16px',
                background: notifOpen ? 'rgba(108,99,255,0.07)' : 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: notifOpen ? '14px 14px 0 0' : 14,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <NotificationsNoneIcon sx={{ fontSize: 18, color: 'var(--accent)' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>
                    Notifications
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                    color: anyOn ? 'var(--accent)' : 'var(--text3)', marginTop: 3,
                  }}>
                    {statusTxt}
                  </div>
                </div>
              </div>
              <ExpandMoreIcon sx={{
                fontSize: 20, color: 'var(--text3)',
                transform: notifOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </button>

            {/* Accordion body */}
            {notifOpen && (
              <div style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)', borderTop: 'none',
                borderRadius: '0 0 14px 14px', overflow: 'hidden',
              }}>
                {/* Turn on/off all */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderBottom: '1px solid var(--border)',
                  background: 'rgba(108,99,255,0.03)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                      Turn all {allOn ? 'off' : 'on'}
                    </div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                      color: 'var(--text3)', marginTop: 2,
                    }}>
                      {statusTxt}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllNotif(!allOn)}
                    style={{
                      position: 'relative', width: 48, height: 26,
                      borderRadius: 13, border: 'none', flexShrink: 0,
                      background: toggleBg, cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 3, left: anyOn ? 25 : 3,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#fff', transition: 'left 0.2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    }} />
                  </button>
                </div>

                {/* Individual rows */}
                {([
                  { key: 'alertBeforeLimit'  as const, emoji: '⏱', label: 'Alert Before Limit',  desc: 'Component approaching its service limit'  },
                  { key: 'componentHealth'   as const, emoji: '🔧', label: 'Component Health',    desc: 'Parts drop to Repair or Critical state'   },
                  { key: 'serviceReminders'  as const, emoji: '📅', label: 'Service Reminders',   desc: 'Predicted service dates approaching'       },
                  { key: 'recurringExpenses' as const, emoji: '💳', label: 'Recurring Expenses',  desc: 'Insurance, tax & vignette renewals'        },
                  { key: 'aiInsights'        as const, emoji: '✦',  label: 'AI Insights',         desc: 'New AI predictions & recommendations'      },
                  { key: 'diagnosisFollowup' as const, emoji: '🩺', label: 'Diagnosis Follow-up', desc: 'Reminders after urgent AI diagnoses'       },
                ]).map(({ key, emoji, label, desc }, i, arr) => {
                  const on = notifPrefs[key]
                  return (
                    <div
                      key={key}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '13px 16px',
                        borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <span style={{
                          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                          background: on ? 'rgba(108,99,255,0.1)' : 'var(--surface3)',
                          border: `1px solid ${on ? 'rgba(108,99,255,0.2)' : 'var(--border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, transition: 'background 0.2s, border-color 0.2s',
                        }}>
                          {emoji}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600,
                            color: on ? 'var(--text)' : 'var(--text2)',
                            transition: 'color 0.15s',
                          }}>
                            {label}
                          </div>
                          <div style={{
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                            color: 'var(--text3)', marginTop: 2,
                          }}>
                            {desc}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleNotif(key)}
                        style={{
                          position: 'relative', width: 44, height: 24,
                          borderRadius: 12, border: 'none', flexShrink: 0, marginLeft: 12,
                          background: on ? 'var(--accent)' : 'var(--surface3)',
                          cursor: 'pointer', transition: 'background 0.2s',
                        }}
                      >
                        <span style={{
                          position: 'absolute', top: 2, left: on ? 22 : 2,
                          width: 20, height: 20, borderRadius: '50%',
                          background: '#fff', transition: 'left 0.2s',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                        }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

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
          onComplete={async (profile) => {
            if (user) {
              try {
                await saveProfile(user.id, profile, profileExists)
                clearSkipped(user.id)
              } catch {
                // proceed regardless
              }
            }
            setShowSurvey(false)
          }}
          onSkip={() => setShowSurvey(false)}
        />
      )}
    </PageShell>
  )
}
