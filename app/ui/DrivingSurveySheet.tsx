import { useState, useRef, useEffect, type ReactNode } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import DriveEtaIcon from '@mui/icons-material/DriveEta'
import SpeedIcon from '@mui/icons-material/Speed'
import BoltIcon from '@mui/icons-material/Bolt'
import LocationCityIcon from '@mui/icons-material/LocationCity'
import RouteIcon from '@mui/icons-material/Route'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import TerrainIcon from '@mui/icons-material/Terrain'
import FlagIcon from '@mui/icons-material/Flag'
import NatureIcon from '@mui/icons-material/Nature'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import WorkIcon from '@mui/icons-material/Work'
import WeekendIcon from '@mui/icons-material/Weekend'
import EventNoteIcon from '@mui/icons-material/EventNote'
import WbCloudyIcon from '@mui/icons-material/WbCloudy'
import AcUnitIcon from '@mui/icons-material/AcUnit'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import OpacityIcon from '@mui/icons-material/Opacity'
import GarageIcon from '@mui/icons-material/Garage'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import BuildIcon from '@mui/icons-material/Build'
import type { DrivingProfile } from '@/shared/drivingProfile'

interface Props {
  initialProfile?: DrivingProfile | null
  onComplete: (profile: DrivingProfile) => void
  onSkip: () => void
}

// ── Annual km ranges ──────────────────────────────────────────────────────────

type KmRangeKey = 'lt5k' | 'k5to15' | 'k15to25' | 'k25to40' | 'gt40k'

const KM_RANGES: { key: KmRangeKey; label: string; icon: ReactNode; sub: string; value: number }[] = [
  { key: 'lt5k',    label: '< 5,000 km',       icon: <DirectionsWalkIcon sx={{ fontSize: 20 }} />, sub: 'Very low mileage',  value: 3000  },
  { key: 'k5to15',  label: '5,000–15,000 km',  icon: <DirectionsCarIcon  sx={{ fontSize: 20 }} />, sub: 'Light commuter',    value: 10000 },
  { key: 'k15to25', label: '15,000–25,000 km', icon: <DriveEtaIcon       sx={{ fontSize: 20 }} />, sub: 'Average driver',    value: 20000 },
  { key: 'k25to40', label: '25,000–40,000 km', icon: <SpeedIcon          sx={{ fontSize: 20 }} />, sub: 'Heavy user',        value: 30000 },
  { key: 'gt40k',   label: '40,000+ km',        icon: <BoltIcon           sx={{ fontSize: 20 }} />, sub: 'Road warrior',      value: 50000 },
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

type StepOption = { value: string; label: string; icon: ReactNode; sub: string }

const STEPS: { key: StepKey; title: string; subtitle: string; options: StepOption[] }[] = [
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
      { value: 'City',    label: 'City / Urban',    icon: <LocationCityIcon        sx={{ fontSize: 20 }} />, sub: 'Stop-and-go, < 50 km/h'      },
      { value: 'Highway', label: 'Highway',          icon: <RouteIcon               sx={{ fontSize: 20 }} />, sub: 'Consistent high speed'        },
      { value: 'Mixed',   label: 'Mixed',            icon: <SwapHorizIcon           sx={{ fontSize: 20 }} />, sub: 'City + highway blend'         },
      { value: 'OffRoad', label: 'Off-road / Rural', icon: <TerrainIcon             sx={{ fontSize: 20 }} />, sub: 'Rough terrain, gravel'        },
      { value: 'Track',   label: 'Track / Sport',    icon: <FlagIcon                sx={{ fontSize: 20 }} />, sub: 'Circuit, performance driving' },
    ],
  },
  {
    key: 'drivingStyle',
    title: 'Driving style',
    subtitle: 'How would you describe how you drive?',
    options: [
      { value: 'Gentle',     label: 'Gentle',     icon: <NatureIcon              sx={{ fontSize: 20 }} />, sub: 'Smooth, economy-focused'    },
      { value: 'Normal',     label: 'Normal',     icon: <DirectionsCarIcon       sx={{ fontSize: 20 }} />, sub: 'Average driver'             },
      { value: 'Aggressive', label: 'Aggressive', icon: <LocalFireDepartmentIcon sx={{ fontSize: 20 }} />, sub: 'Fast acceleration, sporty'  },
    ],
  },
  {
    key: 'usagePattern',
    title: 'Usage pattern',
    subtitle: 'When do you typically use your car?',
    options: [
      { value: 'Daily',        label: 'Daily commuter', icon: <CalendarTodayIcon sx={{ fontSize: 20 }} />, sub: 'Every day'              },
      { value: 'WeekdaysOnly', label: 'Weekdays only',  icon: <WorkIcon          sx={{ fontSize: 20 }} />, sub: 'Work commute, Mon–Fri'  },
      { value: 'WeekendsOnly', label: 'Weekend driver', icon: <WeekendIcon       sx={{ fontSize: 20 }} />, sub: 'Mostly weekends'        },
      { value: 'Occasional',   label: 'Occasional',     icon: <EventNoteIcon     sx={{ fontSize: 20 }} />, sub: 'Leisure, irregular'     },
    ],
  },
  {
    key: 'climateZone',
    title: 'Climate zone',
    subtitle: 'What climate do you mainly drive in?',
    options: [
      { value: 'Temperate', label: 'Temperate',        icon: <WbCloudyIcon sx={{ fontSize: 20 }} />, sub: 'Mild seasons, moderate rain'  },
      { value: 'Cold',      label: 'Cold / Winter',    icon: <AcUnitIcon   sx={{ fontSize: 20 }} />, sub: 'Snow, ice, sub-zero temps'    },
      { value: 'Hot',       label: 'Hot / Arid',       icon: <WbSunnyIcon  sx={{ fontSize: 20 }} />, sub: 'High heat, dry conditions'    },
      { value: 'Humid',     label: 'Humid / Tropical', icon: <OpacityIcon  sx={{ fontSize: 20 }} />, sub: 'High humidity, frequent rain' },
    ],
  },
  {
    key: 'parkingType',
    title: 'Parking type',
    subtitle: 'Where do you usually park your car?',
    options: [
      { value: 'Garage',  label: 'Garage',          icon: <GarageIcon     sx={{ fontSize: 20 }} />, sub: 'Covered, protected from elements'    },
      { value: 'Outdoor', label: 'Outdoor / Street', icon: <LocationOnIcon sx={{ fontSize: 20 }} />, sub: 'Exposed to weather'                  },
      { value: 'Mixed',   label: 'Mixed',            icon: <SwapHorizIcon  sx={{ fontSize: 20 }} />, sub: 'Garage at home, outdoor elsewhere'   },
    ],
  },
]

export default function DrivingSurveySheet({ initialProfile, onComplete, onSkip }: Props) {
  const [started, setStarted] = useState(false)
  const [step,    setStep]    = useState(0)
  const [answers, setAnswers] = useState<Answers>({
    annualKm:     initialProfile ? kmToRangeKey(initialProfile.annualKm) : '',
    primaryUsage: initialProfile?.primaryUsage ?? '',
    drivingStyle: initialProfile?.drivingStyle ?? '',
    usagePattern: initialProfile?.usagePattern ?? '',
    climateZone:  initialProfile?.climateZone  ?? '',
    parkingType:  initialProfile?.parkingType  ?? '',
  })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const advancing    = useRef(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const current  = STEPS[step]
  const selected = answers[current.key]
  const isLast   = step === STEPS.length - 1

  const submit = (a: Answers) => {
    const kmRange = KM_RANGES.find((r) => r.key === a.annualKm)!
    onComplete({
      annualKm:     kmRange.value,
      primaryUsage: a.primaryUsage as DrivingProfile['primaryUsage'],
      drivingStyle: a.drivingStyle as DrivingProfile['drivingStyle'],
      usagePattern: a.usagePattern as DrivingProfile['usagePattern'],
      climateZone:  a.climateZone  as DrivingProfile['climateZone'],
      parkingType:  a.parkingType  as DrivingProfile['parkingType'],
    })
  }

  const selectAndAdvance = (value: string) => {
    if (advancing.current) return
    advancing.current = true

    const next: Answers = { ...answers, [current.key]: value }
    setAnswers(next)

    advanceTimer.current = setTimeout(() => {
      advancing.current = false
      if (isLast) submit(next)
      else setStep((s) => s + 1)
    }, 200)
  }

  const goBack = () => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    advancing.current = false
    if (step === 0) setStarted(false)
    else setStep((s) => s - 1)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onSkip}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 300 }}
      />

      {/* Floating window */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(540px, 94vw)',
        height: '92vh',
        background: 'var(--surface)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        zIndex: 301,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '16px 20px 10px',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
              Driving Profile
            </div>
            {started ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 6 }}>
                {STEPS.map((_, i) => (
                  <div key={i} style={{
                    height: 5,
                    width: i === step ? 18 : 5,
                    borderRadius: 99,
                    background: 'var(--accent)',
                    opacity: i < step ? 0.4 : i === step ? 1 : 0.18,
                    transition: 'width 0.25s ease, opacity 0.25s ease',
                  }} />
                ))}
              </div>
            ) : (
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: 'var(--text3)', marginTop: 3,
              }}>
                Helps AI give more precise predictions
              </div>
            )}
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
              {/* <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
                <DirectionsCarIcon sx={{ fontSize: 64, color: 'var(--accent)' }} />
              </div> */}

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

              {([
                { icon: <NotificationsActiveIcon sx={{ fontSize: 18 }} />, text: 'Smarter service reminders' },
                { icon: <TrendingUpIcon          sx={{ fontSize: 18 }} />, text: 'Predictions based on your habits' },
                { icon: <BuildIcon               sx={{ fontSize: 18 }} />, text: 'Fewer unexpected breakdowns' },
              ] as { icon: ReactNode; text: string }[]).map(({ icon, text }) => (
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
                  <div style={{ color: 'var(--accent)', display: 'flex', flexShrink: 0 }}>{icon}</div>
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
              <div style={{ height: 3, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
                {current.options.map((opt) => {
                  const isSelected = selected === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => selectAndAdvance(opt.value)}
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
                      <div style={{
                        color: isSelected ? 'var(--accent)' : 'var(--text3)',
                        display: 'flex', flexShrink: 0,
                        transition: 'color 0.15s',
                      }}>
                        {opt.icon}
                      </div>
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
              padding: '10px 16px 32px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface)',
              display: 'flex', gap: 8,
            }}>
              <button
                type="button"
                onClick={goBack}
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

              {isLast && (
                <button
                  type="button"
                  onClick={() => submit(answers)}
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
                  Save profile
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
