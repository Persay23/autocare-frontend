import { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import type { DrivingProfile } from '@/lib/drivingProfile'

interface Props {
  initialProfile?: DrivingProfile | null
  onComplete: (profile: DrivingProfile) => void
  onSkip: () => void
}

// ── Annual km ranges ──────────────────────────────────────────────────────────

type KmRangeKey = 'lt5k' | 'k5to15' | 'k15to25' | 'k25to40' | 'gt40k'

const KM_RANGES: { key: KmRangeKey; label: string; icon: string; sub: string; value: number }[] = [
  { key: 'lt5k',    label: '< 5,000 km',       icon: '🐌', sub: 'Very low mileage',  value: 3000  },
  { key: 'k5to15',  label: '5,000–15,000 km',  icon: '🚗', sub: 'Light commuter',    value: 10000 },
  { key: 'k15to25', label: '15,000–25,000 km', icon: '🚕', sub: 'Average driver',    value: 20000 },
  { key: 'k25to40', label: '25,000–40,000 km', icon: '🚀', sub: 'Heavy user',        value: 30000 },
  { key: 'gt40k',   label: '40,000+ km',        icon: '🏎️', sub: 'Road warrior',     value: 50000 },
]

const kmToRangeKey = (km: number): KmRangeKey => {
  if (km < 5000)  return 'lt5k'
  if (km < 15000) return 'k5to15'
  if (km < 25000) return 'k15to25'
  if (km < 40000) return 'k25to40'
  return 'gt40k'
}

// ── Survey steps ──────────────────────────────────────────────────────────────

type StepKey = 'annualKm' | 'primaryUsage' | 'drivingStyle' | 'usagePattern' | 'climateZone' | 'parkingType'

type Answers = {
  annualKm:     KmRangeKey | ''
  primaryUsage: DrivingProfile['primaryUsage'] | ''
  drivingStyle: DrivingProfile['drivingStyle'] | ''
  usagePattern: DrivingProfile['usagePattern'] | ''
  climateZone:  DrivingProfile['climateZone']  | ''
  parkingType:  DrivingProfile['parkingType']  | ''
}

const STEPS: {
  key: StepKey
  title: string
  subtitle: string
  options: { value: string; label: string; icon: string; sub: string }[]
}[] = [
  {
    key: 'annualKm',
    title: 'Annual distance',
    subtitle: 'How many kilometres do you drive per year on average?',
    options: KM_RANGES.map((r) => ({ value: r.key, label: r.label, icon: r.icon, sub: r.sub })),
  },
  {
    key: 'primaryUsage',
    title: 'Driving environment',
    subtitle: 'Where do you spend most of your time behind the wheel?',
    options: [
      { value: 'City',    label: 'City / Urban',    icon: '🏙️', sub: 'Stop-and-go, < 50 km/h' },
      { value: 'Highway', label: 'Highway',          icon: '🛣️', sub: 'Consistent high speed' },
      { value: 'Mixed',   label: 'Mixed',            icon: '🔀', sub: 'City + highway blend' },
      { value: 'OffRoad', label: 'Off-road / Rural', icon: '🏔️', sub: 'Rough terrain, gravel' },
      { value: 'Track',   label: 'Track / Sport',    icon: '🏁', sub: 'Circuit, performance driving' },
    ],
  },
  {
    key: 'drivingStyle',
    title: 'Driving style',
    subtitle: 'How would you describe how you drive?',
    options: [
      { value: 'Gentle',     label: 'Gentle',     icon: '🐢', sub: 'Smooth, economy-focused' },
      { value: 'Normal',     label: 'Normal',     icon: '🚗', sub: 'Average driver' },
      { value: 'Aggressive', label: 'Aggressive', icon: '🏎️', sub: 'Fast acceleration, sporty' },
    ],
  },
  {
    key: 'usagePattern',
    title: 'Usage pattern',
    subtitle: 'When do you typically use your car?',
    options: [
      { value: 'Daily',        label: 'Daily commuter',  icon: '📅', sub: 'Every day' },
      { value: 'WeekdaysOnly', label: 'Weekdays only',   icon: '💼', sub: 'Work commute, Mon–Fri' },
      { value: 'WeekendsOnly', label: 'Weekend driver',  icon: '🗓️', sub: 'Mostly weekends' },
      { value: 'Occasional',   label: 'Occasional',      icon: '🎯', sub: 'Leisure, irregular' },
    ],
  },
  {
    key: 'climateZone',
    title: 'Climate zone',
    subtitle: 'What climate do you mainly drive in?',
    options: [
      { value: 'Temperate', label: 'Temperate',       icon: '🌤️', sub: 'Mild seasons, moderate rain' },
      { value: 'Cold',      label: 'Cold / Winter',   icon: '❄️',  sub: 'Snow, ice, sub-zero temps' },
      { value: 'Hot',       label: 'Hot / Arid',      icon: '☀️',  sub: 'High heat, dry conditions' },
      { value: 'Humid',     label: 'Humid / Tropical', icon: '🌧️', sub: 'High humidity, frequent rain' },
    ],
  },
  {
    key: 'parkingType',
    title: 'Parking type',
    subtitle: 'Where do you usually park your car?',
    options: [
      { value: 'Garage',  label: 'Garage',         icon: '🏠', sub: 'Covered, protected from elements' },
      { value: 'Outdoor', label: 'Outdoor / Street', icon: '🌆', sub: 'Exposed to weather' },
      { value: 'Mixed',   label: 'Mixed',            icon: '🔀', sub: 'Garage at home, outdoor elsewhere' },
    ],
  },
]

export default function DrivingSurveySheet({ initialProfile, onComplete, onSkip }: Props) {
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({
    annualKm:     initialProfile ? kmToRangeKey(initialProfile.annualKm) : '',
    primaryUsage: initialProfile?.primaryUsage ?? '',
    drivingStyle: initialProfile?.drivingStyle ?? '',
    usagePattern: initialProfile?.usagePattern ?? '',
    climateZone:  initialProfile?.climateZone  ?? '',
    parkingType:  initialProfile?.parkingType  ?? '',
  })

  const current = STEPS[step]
  const selected = answers[current.key]
  const isLast = step === STEPS.length - 1

  const select = (value: string) =>
    setAnswers((prev) => ({ ...prev, [current.key]: value }))

  const handleNext = () => {
    if (!selected) return
    if (isLast) {
      const kmRange = KM_RANGES.find((r) => r.key === answers.annualKm)!
      onComplete({
        annualKm:     kmRange.value,
        primaryUsage: answers.primaryUsage as DrivingProfile['primaryUsage'],
        drivingStyle: answers.drivingStyle as DrivingProfile['drivingStyle'],
        usagePattern: answers.usagePattern as DrivingProfile['usagePattern'],
        climateZone:  answers.climateZone  as DrivingProfile['climateZone'],
        parkingType:  answers.parkingType  as DrivingProfile['parkingType'],
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
                Answer 6 quick questions about how you drive. This helps the AI tailor
                service predictions to your actual usage — not just generic intervals.
              </div>

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
                Takes about 30 seconds · can be changed anytime in Profile
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

            {/* Options */}
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
