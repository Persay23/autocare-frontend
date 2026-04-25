import { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import type { DrivingProfile } from '@/lib/drivingProfile'

interface Props {
  initialProfile?: DrivingProfile | null
  onComplete: (profile: DrivingProfile) => void
  onSkip: () => void
}

type Answers = {
  weeklyKm: DrivingProfile['weeklyKm'] | ''
  environment: DrivingProfile['environment'] | ''
  drivingStyle: DrivingProfile['drivingStyle'] | ''
  usagePattern: DrivingProfile['usagePattern'] | ''
}

const STEPS = [
  {
    key: 'weeklyKm' as const,
    title: 'Weekly distance',
    subtitle: 'How far do you drive per week on average?',
    options: [
      { value: 'under100',   label: '< 100 km',       icon: '🐌', sub: 'Low usage' },
      { value: '100to300',   label: '100–300 km',      icon: '🚗', sub: 'Light commuter' },
      { value: '300to500',   label: '300–500 km',      icon: '🚕', sub: 'Regular driver' },
      { value: '500to1000',  label: '500–1000 km',     icon: '🚀', sub: 'Heavy user' },
      { value: 'over1000',   label: '1000+ km',        icon: '🏎️', sub: 'Road warrior' },
    ],
  },
  {
    key: 'environment' as const,
    title: 'Driving environment',
    subtitle: 'Where do you spend most of your time behind the wheel?',
    options: [
      { value: 'city',    label: 'City / Urban',      icon: '🏙️', sub: 'Stop-and-go, < 50 km/h' },
      { value: 'highway', label: 'Highway',            icon: '🛣️', sub: 'Consistent high speed' },
      { value: 'mixed',   label: 'Mixed',              icon: '🔀', sub: 'City + highway blend' },
      { value: 'offroad', label: 'Off-road / Rural',   icon: '🏔️', sub: 'Rough terrain, gravel' },
    ],
  },
  {
    key: 'drivingStyle' as const,
    title: 'Driving style',
    subtitle: 'How would you describe how you drive?',
    options: [
      { value: 'gentle',     label: 'Gentle',     icon: '🐢', sub: 'Smooth, economy-focused' },
      { value: 'normal',     label: 'Normal',     icon: '🚗', sub: 'Average driver' },
      { value: 'aggressive', label: 'Aggressive', icon: '🏎️', sub: 'Fast acceleration, sporty' },
    ],
  },
  {
    key: 'usagePattern' as const,
    title: 'Usage pattern',
    subtitle: 'When do you typically use your car?',
    options: [
      { value: 'daily',      label: 'Daily commuter', icon: '📅', sub: 'Every workday' },
      { value: 'weekend',    label: 'Weekend driver',  icon: '🗓️', sub: 'Mostly weekends' },
      { value: 'occasional', label: 'Occasional',      icon: '🎯', sub: 'Leisure, irregular' },
    ],
  },
]

export default function DrivingSurveySheet({ initialProfile, onComplete, onSkip }: Props) {
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({
    weeklyKm:     initialProfile?.weeklyKm     ?? '',
    environment:  initialProfile?.environment  ?? '',
    drivingStyle: initialProfile?.drivingStyle ?? '',
    usagePattern: initialProfile?.usagePattern ?? '',
  })

  const current = STEPS[step]
  const selected = answers[current.key]
  const isLast = step === STEPS.length - 1

  const select = (value: string) =>
    setAnswers((prev) => ({ ...prev, [current.key]: value }))

  const handleNext = () => {
    if (!selected) return
    if (isLast) {
      onComplete({
        weeklyKm:     answers.weeklyKm     as DrivingProfile['weeklyKm'],
        environment:  answers.environment  as DrivingProfile['environment'],
        drivingStyle: answers.drivingStyle as DrivingProfile['drivingStyle'],
        usagePattern: answers.usagePattern as DrivingProfile['usagePattern'],
        completedAt:  new Date().toISOString(),
      })
    } else {
      setStep((s) => s + 1)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onSkip}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 300,
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        maxHeight: '88vh',
        background: 'var(--surface)',
        borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border)',
        borderBottom: 'none',
        zIndex: 301,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '6px 20px 10px',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
              Driving Profile
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, color: 'var(--text3)', marginTop: 3,
            }}>
              {started ? `Question ${step + 1} of ${STEPS.length}` : 'Helps AI give more precise predictions'}
            </div>
          </div>
          <button
            onClick={onSkip}
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text2)',
              cursor: 'pointer',
              padding: '4px 6px',
              display: 'flex', alignItems: 'center',
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>

        {!started ? (
          /* ── Intro screen ─────────────────────────────────────────────── */
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {/* Big icon */}
              <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
                <span style={{ fontSize: 56 }}>🚗</span>
              </div>

              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
                Would you like to help us predict your car's needs more accurately?
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20,
              }}>
                Answer 4 quick questions about how you drive. This helps the AI tailor
                service predictions to your actual usage — not just generic intervals.
              </div>

              {/* Benefit pills */}
              {[
                { icon: '📍', text: 'Smarter service reminders' },
                { icon: '⏱️', text: 'Predictions based on your habits' },
                { icon: '🔧', text: 'Fewer unexpected breakdowns' },
              ].map(({ icon, text }) => (
                <div
                  key={text}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', marginBottom: 8,
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{text}</span>
                </div>
              ))}

              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: 'var(--text3)', marginTop: 16, textAlign: 'center',
              }}>
                Takes about 30 seconds · stored locally · can be changed anytime in Profile
              </div>
            </div>

            <div style={{
              padding: '12px 16px 32px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface)',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <button
                type="button"
                onClick={() => setStarted(true)}
                style={{
                  width: '100%', padding: '14px 0',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  border: 'none',
                  color: '#fff',
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
              >
                Start survey →
              </button>
              <button
                type="button"
                onClick={onSkip}
                style={{
                  width: '100%', padding: '11px 0',
                  borderRadius: 14,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text3)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                Skip for now
              </button>
            </div>
          </>
        ) : (
          /* ── Survey steps ─────────────────────────────────────────────── */
          <>
            {/* Progress bar */}
            <div style={{ padding: '0 20px 14px' }}>
              <div style={{
                height: 3, borderRadius: 99,
                background: 'var(--border)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${((step + 1) / STEPS.length) * 100}%`,
                  background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                  borderRadius: 99,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>

            {/* Question */}
            <div style={{ padding: '0 20px 12px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                {current.title}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: 'var(--text2)',
              }}>
                {current.subtitle}
              </div>
            </div>

            {/* Options — scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {current.options.map((opt) => {
                  const isSelected = selected === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => select(opt.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 14px',
                        borderRadius: 14,
                        background: isSelected ? 'rgba(108,99,255,0.12)' : 'var(--surface2)',
                        border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{opt.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {opt.label}
                        </div>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9, color: 'var(--text3)', marginTop: 2,
                        }}>
                          {opt.sub}
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%',
                          background: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 16px 32px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface)',
              display: 'flex', gap: 8,
            }}>
              <button
                type="button"
                onClick={() => step === 0 ? setStarted(false) : setStep((s) => s - 1)}
                style={{
                  padding: '13px 20px',
                  borderRadius: 14,
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text2)',
                  fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!selected}
                style={{
                  flex: 1,
                  padding: '13px 0',
                  borderRadius: 14,
                  background: selected
                    ? 'linear-gradient(135deg, var(--accent), var(--accent2))'
                    : 'var(--surface2)',
                  border: selected ? 'none' : '1px solid var(--border)',
                  color: selected ? '#fff' : 'var(--text3)',
                  fontSize: 14, fontWeight: 700,
                  cursor: selected ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  letterSpacing: '0.01em',
                }}
              >
                {isLast ? 'Save profile' : 'Next →'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
