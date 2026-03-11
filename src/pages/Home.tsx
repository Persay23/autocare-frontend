import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import StatCard from '../components/shared/StatCard'
import HealthBar from '../components/shared/HealthBar'
import StatusPill from '../components/shared/StatusPill'
import TimelineItem from '../components/shared/TimelineItem'
import FloatingAddButton from '../components/shared/FloatingAddButton'
import { useAuth } from '../context/useAuth'
import { getVehicles } from '../api/vehicles'
import { getComponentHealth } from '../api/components'
import { getVehicleTimeline } from '../api/timeline'
import logo from '../assets/Logo.png'
import type { Vehicle, ComponentHealth, TimelineEvent } from '../types'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [healthMap, setHealthMap] = useState<Record<number, ComponentHealth[]>>({})
  const [recentEvents, setRecentEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  const handleEventClick = (event: TimelineEvent) => {
    if (!event.vehicleId || !event.relatedId) return
    if (event.type === 'Maintenance' || event.type === 'Service') {
      navigate(`/vehicles/${event.vehicleId}/records/${event.relatedId}`)
    } else if (event.type === 'Fuel') {
      navigate(`/vehicles/${event.vehicleId}/fuel/${event.relatedId}`)
    }
  }



  useEffect(() => {
    getVehicles()
      .then(async (res) => {
        const list = res.data
        setVehicles(list)

        // Fetch health + timeline for all vehicles in parallel
        const [healthResults, timelineResults] = await Promise.all([
          Promise.allSettled(
            list.map((v: Vehicle) =>
              getComponentHealth(v.vehicleId).then((r) => ({
                vehicleId: v.vehicleId,
                health: r.data,
              }))
            )
          ),
          Promise.allSettled(
            list.map((v: Vehicle) =>
              getVehicleTimeline(v.vehicleId).then((r) => ({
                vehicleId: v.vehicleId,
                vehicleName: `${v.brand} ${v.model}`,
                events: r.data,
              }))
            )
          ),
        ])

        // Build health map
        const map: Record<number, ComponentHealth[]> = {}
        healthResults.forEach((r) => {
          if (r.status === 'fulfilled') {
            map[r.value.vehicleId] = r.value.health as ComponentHealth[]
          }
        })
        setHealthMap(map)

        // Merge and sort timeline events — take last 5
        const allEvents: TimelineEvent[] = timelineResults
          .filter((r) => r.status === 'fulfilled')
          .flatMap((r) => {
            const { value } = r as PromiseFulfilledResult<{ vehicleId: number; vehicleName: string; events: unknown }>
            return (Array.isArray(value.events) ? value.events as TimelineEvent[] : []).map((e) => ({
              ...e,
              vehicleName: value.vehicleName,
            }))
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5)

        setRecentEvents(allEvents)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // All components across all vehicles flattened
  const allComponents = Object.values(healthMap).flat()
  const alerts = allComponents.filter((c) =>
    c.currentState === 'Critical' ||
    c.currentState === 'Repair'
  )

  // FAB options — one fuel + one record per vehicle
  const fabOptions = [
  { icon: '⛽', label: 'Log Fuel Refill',        path: '/fuel/new'    },
  { icon: '🔧', label: 'New Maintenance Record',  path: '/records/new' },
]

  const initials = user?.name
    ?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  return (
    <PageShell>
      {/* App header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 22px 14px',
      }}>
        <div>
          {/* <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
            Auto<span style={{ color: 'var(--accent)' }}>Care</span>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            color: 'var(--text3)',
            letterSpacing: '0.1em',
          }}>
            YOUR GARAGE. YOUR DATA.
          </div> */}

            <img
              src={logo}
              alt="AutoCare"
              style={{ height: 25 }}
            />


              {/* <div>
                <div style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}>
                  Auto

                  <span style={{
                    display: 'inline-block',
                    width: 18,
                    height: 10,
                    position: 'relative'
                  }}>
                    <svg
                      viewBox="0 0 100 50"
                      style={{ width: '100%', height: '100%' }}
                    >
                      <path
                        d="M10,25 C20,0 40,0 50,25 C60,50 80,50 90,25 C80,0 60,0 50,25 C40,50 20,50 10,25 Z"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>

                  <span style={{ color: 'var(--accent)' }}>
                    Care
                  </span>
                </div>

                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8,
                  color: 'var(--text3)',
                  letterSpacing: '0.1em',
                }}>
                  YOUR GARAGE. YOUR DATA.
                </div>
              </div> */}







        </div>
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
      <div style={{ padding: '0 22px 16px', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
        Dashboard
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, padding: '0 22px', marginBottom: 10,
      }}>
        <StatCard label="Car Park" value={vehicles.length} sub={`${vehicles.length} active`} accent="purple" />
        <StatCard label="Alerts" value={alerts.length} sub="need attention" accent="red" />
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, padding: '0 22px', marginBottom: 10,
      }}>
        <StatCard label="Components" value={allComponents.length} sub="tracked" accent="blue" />
        <StatCard label="Vehicles" value={vehicles.length} sub="in garage" accent="teal" />
      </div>

      {/* Component alerts */}
      {alerts.length > 0 && (
        <>
          <div style={{
            padding: '6px 22px 8px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            ⚠ Component Alerts
          </div>
          <div style={{ padding: '0 22px' }}>
            {alerts.map((c) => {
              const vehicle = vehicles.find(
                (v) => healthMap[v.vehicleId]?.some((h) => h.componentId === c.componentId)
              )
              const healthPct = Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0)
              return (
                <div
                  key={c.componentId}
                  onClick={() => vehicle && navigate(`/vehicles/${vehicle.vehicleId}/components`)}
                  style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 6,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                      {c.vehicleComponentName || c.componentType?.replace(/([A-Z])/g, ' $1').trim()}
                      {vehicle && (
                        <span style={{ color: 'var(--text3)', fontWeight: 400 }}>
                          {' '}· {vehicle.brand} {vehicle.model}
                        </span>
                      )}
                    </div>
                    <StatusPill status={c.currentState} />
                  </div>
                  <HealthBar percent={healthPct} />
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9, color: 'var(--text3)', marginTop: 5,
                  }}>
                    {healthPct.toFixed(1)}% remaining
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Recent activity */}
      {recentEvents.length > 0 && (
        <>
          <div style={{
            padding: '6px 22px 12px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            Recent Activity · All Vehicles
          </div>
          <div style={{ padding: '0 22px' }}>
            {recentEvents.map((event, index) => (
              <TimelineItem
                key={`${event.type}-${event.relatedId ?? index}`}
                event={event}
                showVehicle={true}
                isLast={index === recentEvents.length - 1}
                onClick={() => handleEventClick(event)}
              />
            ))}
          </div>
          <div style={{ height: 8 }} />
          <button
            onClick={() => navigate('/timeline')}
            style={{
              display: 'block', margin: '0 auto',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, color: 'var(--accent)',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            View full timeline →
          </button>
        </>
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

      {/* FAB */}
      <FloatingAddButton options={fabOptions} />
    </PageShell>
  )
}
