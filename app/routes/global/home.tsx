import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import TimelineItem from '@/ui/TimelineItem'
import HealthBar from '@/ui/HealthBar'
import FloatingAddButton from '@/ui/FloatingAddButton'
import { useAuth } from '@/features/auth/useAuth'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { useTimelineStore } from '@/features/timeline/timelineStore'
import { useExpensesStore } from '@/features/expenses/expensesStore'
import { usePredictionsStore } from '@/features/predictions/predictionsStore'
import { formatEnumLabel } from '@/lib/formatters'
import { COMPONENT_ICONS } from '@/lib/icons'
import logo from '@/assets/Logo.png'
import type { TimelineEvent } from '@/lib/types'
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation'
import BuildIcon from '@mui/icons-material/Build'
import AddCardIcon from '@mui/icons-material/AddCard'

const ATTENTION_STYLE: Record<string, { cardBg: string; cardBorder: string; labelColor: string }> = {
  Critical: { cardBg: 'rgba(248,113,113,0.07)', cardBorder: 'rgba(248,113,113,0.22)', labelColor: 'var(--red)'    },
  Repair:   { cardBg: 'rgba(251,146,60,0.07)',  cardBorder: 'rgba(251,146,60,0.22)',  labelColor: 'var(--orange)' },
}

function healthColor(pct: number): string {
  if (pct <= 15) return 'var(--red)'
  if (pct <= 30) return 'var(--orange)'
  if (pct <= 50) return 'var(--yellow)'
  if (pct <= 75) return 'var(--green)'
  return 'var(--accent4)'
}

function relativeDay(dateStr: string): string {
  const diff = Math.round(
    (new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  )
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff > 1 && diff <= 30) return `in ${diff} days`
  if (diff < -1) return `${Math.abs(diff)} days ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { vehicles, healthMap, loading: vehiclesLoading, fetch: fetchVehicles } = useVehiclesStore()
  const { eventsByVehicle, loading: timelineLoading, fetchAll: fetchTimeline } = useTimelineStore()
  const { summaries, fetchAll: fetchExpenses } = useExpensesStore()
  const { predictions, fetchAll: fetchPredictions } = usePredictionsStore()

  const loading = vehiclesLoading || timelineLoading

  const recentEvents: TimelineEvent[] = Object.values(eventsByVehicle)
    .flat()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const handleEventClick = (event: TimelineEvent) => {
    if (!event.vehicleId) return
    if (event.type === 'Maintenance' || event.type === 'Service') {
      navigate(event.relatedId
        ? `/vehicles/${event.vehicleId}/records/${event.relatedId}`
        : `/vehicles/${event.vehicleId}/records`)
    } else if (event.type === 'Fuel') {
      navigate(event.relatedId
        ? `/vehicles/${event.vehicleId}/fuel/${event.relatedId}`
        : `/vehicles/${event.vehicleId}/fuel`)
    }
  }

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  useEffect(() => {
    if (!vehicles.length) return
    fetchTimeline(vehicles)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length])

  useEffect(() => {
    if (!vehicles.length) return
    fetchExpenses(vehicles.map((v) => v.vehicleId))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length])

  useEffect(() => {
    if (!vehicles.length) return
    fetchPredictions(vehicles.map((v) => v.vehicleId))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length])

  const nextService = (() => {
    const candidates = vehicles.flatMap((v) =>
      (predictions[v.vehicleId] ?? [])
        .filter((p) => p.status === 'Active')
        .map((p) => ({ prediction: p, vehicleName: `${v.brand} ${v.model}` }))
    )
    return candidates.sort(
      (a, b) =>
        new Date(a.prediction.predictedServiceDate).getTime() -
        new Date(b.prediction.predictedServiceDate).getTime()
    )[0] ?? null
  })()

  const allComponents = Object.values(healthMap).flat()
  const alerts = allComponents.filter((c) =>
    c.currentState === 'Critical' || c.currentState === 'Repair'
  )

  const currentMonthKey = new Date().toISOString().slice(0, 7)
  const thisMonthSpend = Object.values(summaries)
    .flat()
    .filter((s) => (s.month ?? '').startsWith(currentMonthKey))
    .reduce((sum, s) => sum + (s.maintenanceCost ?? 0) + (s.fuelCost ?? 0), 0)

  const topAlert = [...alerts].sort((a, b) => {
    const order: Record<string, number> = { Critical: 0, Repair: 1 }
    return (order[a.currentState] ?? 2) - (order[b.currentState] ?? 2)
  })[0] ?? null

  const topAlertVehicle = topAlert
    ? vehicles.find((v) => healthMap[v.vehicleId]?.some((h) => h.componentId === topAlert.componentId))
    : null

  const fabOptions = [
    { icon: LocalGasStationIcon, label: 'Log Fuel Refill',       path: '/fuel/new'     },
    { icon: BuildIcon,           label: 'New Maintenance Record', path: '/records/new'  },
    { icon: AddCardIcon,         label: 'New General Expense',    path: '/expenses/new' },
  ]

  const initials = user?.name
    ?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  return (
    <PageShell>
      {/* App header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 22px 14px',
      }}>
        <img src={logo} alt="AutoCare" style={{ height: 25 }} />
        <div
          onClick={() => navigate('/profile')}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
          }}
        >
          {initials}
        </div>
      </div>

      {/* Page title */}
      <div style={{ padding: '0 22px 14px', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
        Dashboard
      </div>

      {/* Stat cards + next service */}
      {vehicles.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 22px', marginBottom: 8 }}>
            {/* Spend this month */}
            <div style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 14px',
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 4 }}>
                THIS MONTH
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                {thisMonthSpend > 0 ? `${thisMonthSpend.toLocaleString()} zł` : '—'}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 3 }}>
                Subtotal
              </div>
            </div>

            {/* Top alert or all-clear */}
            {topAlert ? (
              <div
                onClick={() => topAlertVehicle && navigate(`/vehicles/${topAlertVehicle.vehicleId}/components`)}
                style={{
                  background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 12, padding: '12px 14px',
                  cursor: topAlertVehicle ? 'pointer' : 'default',
                }}
              >
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 4 }}>
                  TOP ALERT
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--red)', lineHeight: 1.2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {topAlert.vehicleComponentName ?? formatEnumLabel(topAlert.componentType)}
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)', marginTop: 3,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {topAlert.currentState}{topAlertVehicle ? ` · ${topAlertVehicle.brand} ${topAlertVehicle.model}` : ''}
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)',
                borderRadius: 12, padding: '12px 14px',
              }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 4 }}>
                  ALERTS
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>All good</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 3 }}>
                  no attention needed
                </div>
              </div>
            )}
          </div>

          {/* Next service */}
          {nextService && (
            <div
              onClick={() => navigate(`/vehicles/${nextService.prediction.vehicleId}/predictions`)}
              style={{
                margin: '0 22px 12px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                  NEXT SERVICE
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                  {nextService.vehicleName}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {formatEnumLabel(nextService.prediction.componentType)} service
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: 'var(--orange)' }}>
                  {relativeDay(nextService.prediction.predictedServiceDate)}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Alert components */}
      {alerts.length > 0 && (
        <div style={{ padding: '0 22px', marginBottom: 12 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 700, color: 'var(--red)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            Needs Attention · {alerts.length} component{alerts.length > 1 ? 's' : ''}
          </div>
          {alerts.map((c) => {
            const vehicle = vehicles.find((v) =>
              healthMap[v.vehicleId]?.some((h) => h.componentId === c.componentId)
            )
            const healthPct = Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0)
            const attnStyle = ATTENTION_STYLE[c.currentState]
            const CI = COMPONENT_ICONS[c.componentType] ?? COMPONENT_ICONS.Other
            const displayName = c.vehicleComponentName || formatEnumLabel(c.componentType)
            const subtitle = [
              c.vehicleComponentName ? formatEnumLabel(c.componentType) : null,
              c.vehicleComponentBrand,
              vehicle ? `${vehicle.brand} ${vehicle.model}` : null,
            ].filter(Boolean).join(' · ')

            return (
              <div
                key={c.componentId}
                onClick={() => vehicle && navigate(`/vehicles/${vehicle.vehicleId}/components`)}
                style={{
                  background: attnStyle?.cardBg ?? 'var(--surface2)',
                  border: `1px solid ${attnStyle?.cardBorder ?? 'var(--border)'}`,
                  borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'var(--surface3)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CI sx={{ fontSize: 18, color: attnStyle?.labelColor ?? healthColor(healthPct) }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                      {displayName}
                    </div>
                    {subtitle && (
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                        color: 'var(--text3)', marginTop: 2,
                      }}>
                        {subtitle}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
                    color: attnStyle?.labelColor ?? 'var(--text2)', flexShrink: 0,
                  }}>
                    {c.currentState}
                  </span>
                </div>
                <HealthBar percent={healthPct} />
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                  color: attnStyle?.labelColor, marginTop: 5, textAlign: 'right',
                }}>
                  {Math.round(healthPct)}% left
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent activity card */}
      {recentEvents.length > 0 && (
        <div style={{ padding: '0 22px', marginBottom: 16 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            marginBottom: 8,
          }}>
            Recent Activity
          </div>
          <div style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            {recentEvents.map((event, index) => (
              <TimelineItem
                key={`${event.type}-${event.relatedId ?? index}`}
                event={event}
                showVehicle={true}
                showDate={true}
                isLast={index === recentEvents.length - 1}
                onClick={() => handleEventClick(event)}
              />
            ))}
            <div style={{ height: 10 }} />
            <button
              onClick={() => navigate('/timeline')}
              style={{
                display: 'block', width: '100%', textAlign: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: 'var(--accent)',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              View full timeline →
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && vehicles.length === 0 && (
        <div style={{ padding: '60px 22px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🚗</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            Welcome to AutoCare
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: 'var(--text3)', marginBottom: 20,
          }}>
            Add your first vehicle to get started
          </div>
          <button
            onClick={() => navigate('/vehicles/new')}
            style={{
              padding: '10px 20px', borderRadius: 10,
              background: 'var(--accent)', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Add Vehicle
          </button>
        </div>
      )}

      <div style={{ height: 20 }} />
      <FloatingAddButton options={fabOptions} />
    </PageShell>
  )
}
