import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import TimelineItem from '@/ui/TimelineItem'
import HealthBar from '@/ui/HealthBar'
import GlobalFab from '@/ui/GlobalFab'
import { useAuth } from '@/features/auth/useAuth'
import { useVehiclesStore } from '@/features/vehicles/vehicleStore'
import { useTimelineStore } from '@/features/timeline/timelineStore'
import { useExpensesStore } from '@/features/expenses/expenseStore'
import { usePredictionsStore } from '@/features/predictions/predictionStore'
import { formatEnumLabel } from '@/shared/formatters'
import { COMPONENT_ICONS } from '@/shared/icons'
import logo from '@/assets/Logo.png'
import type { TimelineEvent } from '@/shared/types'
import { useCurrencyStore, formatMoney } from '@/features/currency/currencyStore'
import { colorFromPct } from '@/shared/healthState'
import { useIsDesktop } from '@/ui/hooks/useIsDesktop'
import { useRecordModal } from '@/features/records/recordModalStore'
import { useFuelModal } from '@/features/fuel/fuelModalStore'
import { useVehicleModal } from '@/features/vehicles/vehicleModalStore'

const ATTENTION_STYLE: Record<string, { cardBg: string; cardBorder: string; labelColor: string }> = {
  Critical: { cardBg: 'rgba(248,113,113,0.07)', cardBorder: 'rgba(248,113,113,0.22)', labelColor: 'var(--red)'    },
  Repair:   { cardBg: 'rgba(251,146,60,0.07)',  cardBorder: 'rgba(251,146,60,0.22)',  labelColor: 'var(--orange)' },
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
  const navigate    = useNavigate()
  const isDesktop   = useIsDesktop()
  const openRecord  = useRecordModal((s) => s.openFor)
  const openFuel    = useFuelModal((s) => s.openFor)
  const openAddVehicle = useVehicleModal((s) => s.openCreate)
  const { currency } = useCurrencyStore()

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
      if (event.relatedId) {
        openRecord(String(event.vehicleId), event.relatedId)
      } else {
        navigate(`/vehicles/${event.vehicleId}/records`)
      }
    } else if (event.type === 'Fuel') {
      if (event.relatedId) {
        openFuel(String(event.vehicleId), event.relatedId)
      } else {
        navigate(`/vehicles/${event.vehicleId}/fuel`)
      }
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
      (a, b) => {
        const da = a.prediction.suggestedByDate ? new Date(a.prediction.suggestedByDate).getTime() : Infinity
        const db = b.prediction.suggestedByDate ? new Date(b.prediction.suggestedByDate).getTime() : Infinity
        return da - db
      }
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


  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0] ?? 'sir'
  const statusLine = loading
    ? 'Scanning systems…'
    : vehicles.length === 0
    ? 'No vehicles registered.'
    : alerts.length > 0
    ? `${alerts.length} component${alerts.length !== 1 ? 's' : ''} need${alerts.length === 1 ? 's' : ''} your attention.`
    : 'All systems nominal.'

  const initials = user?.name
    ?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  return (
    <PageShell>
      {/* Mobile: logo + avatar on same line (as before) */}
      {!isDesktop && (
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
      )}

      {/* JARVIS greeting — avatar on right for desktop, standalone for mobile */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: isDesktop ? '24px 22px 18px' : '0 22px 18px',
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
            {greeting}, {firstName}.
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'var(--text3)', marginTop: 4,
          }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: 'var(--text2)', marginTop: 3,
          }}>
            {statusLine}
          </div>
        </div>
        {isDesktop && (
          <div
            onClick={() => navigate('/profile')}
            style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
            }}
          >
            {initials}
          </div>
        )}
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
                {thisMonthSpend > 0 ? formatMoney(thisMonthSpend, currency) : '—'}
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
                  {nextService.prediction.title}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: 'var(--orange)' }}>
                  {nextService.prediction.suggestedByDate ? relativeDay(nextService.prediction.suggestedByDate) : nextService.prediction.urgency}
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
            marginBottom: 8, paddingLeft: 4,
          }}>
            Needs Attention · {alerts.length} component{alerts.length > 1 ? 's' : ''}
          </div>
          {alerts.slice(0, 3).map((c) => {
            const vehicle = vehicles.find((v) =>
              healthMap[v.vehicleId]?.some((h) => h.componentId === c.componentId)
            )
            const healthPct = Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0)
            const derivedState = c.currentState ?? 'Unknown'
            const attnStyle = ATTENTION_STYLE[derivedState]
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
                    <CI sx={{ fontSize: 18, color: attnStyle?.labelColor ?? colorFromPct(healthPct) }} />
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
                    {derivedState}
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
          {alerts.length > 3 && (
            <button
              onClick={() => navigate('/carpark')}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 10,
                background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
                color: 'var(--red)', cursor: 'pointer', letterSpacing: '0.05em',
              }}
            >
              See {alerts.length - 3} more →
            </button>
          )}
        </div>
      )}

      {/* Recent activity card */}
      {recentEvents.length > 0 && (
        <div style={{ padding: '0 22px', marginBottom: 16 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            marginBottom: 8, paddingLeft: 4,
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
            onClick={openAddVehicle}
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
      <GlobalFab />
    </PageShell>
  )
}
