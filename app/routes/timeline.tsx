import { useState, useEffect } from 'react'
import PageShell from '@/ui/layout/PageShell'
import FilterChips from '@/ui/FilterChips'
import TimelineItem from '@/ui/TimelineItem'
import { getVehicles } from '@/features/vehicles/api'
import { getVehicleTimeline } from '@/features/timeline/api'
import { useNavigate } from 'react-router-dom'
import type { Vehicle, TimelineEvent } from '@/lib/types'

export default function Timeline() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVehicles()
      .then((res) => setVehicles(res.data))
      .catch(() => {})
  }, [])


  const navigate = useNavigate()

  const handleEventClick = (event: TimelineEvent) => {
    if (!event.vehicleId || !event.relatedId) return

    if (event.type === 'Maintenance' || event.type === 'Service') {
      navigate(`/vehicles/${event.vehicleId}/records/${event.relatedId}`)
    } else if (event.type === 'Fuel') {
      navigate(`/vehicles/${event.vehicleId}/fuel/${event.relatedId}`)
    }
  }


  useEffect(() => {
    if (!vehicles.length) return


    const targets = selectedId
      ? vehicles.filter((v) => v.vehicleId === selectedId)
      : vehicles

    Promise.allSettled(
      targets.map((v) =>
        getVehicleTimeline(v.vehicleId).then((res) => ({
          vehicleId: v.vehicleId,
          vehicleName: `${v.brand} ${v.model}`,
          events: res.data as TimelineEvent[],
        }))
      )
    ).then((results) => {
      const allEvents: TimelineEvent[] = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => {
          const { value } = r as PromiseFulfilledResult<{ vehicleId: number; vehicleName: string; events: TimelineEvent[] }>
          return (Array.isArray(value.events) ? value.events : []).map((e) => ({
            ...e,
            vehicleName: value.vehicleName,
            vehicleId: value.vehicleId,
          }))
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setEvents(allEvents)
    }).finally(() => setLoading(false))
  }, [vehicles, selectedId])

  return (
    <PageShell>
      {/* Header */}
      <div style={{ padding: '20px 22px 8px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Timeline</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--text3)',
          marginTop: 3,
        }}>
          {selectedId ? 'filtered by vehicle' : 'all vehicles · tap to open'}
        </div>
      </div>

      {/* Filter chips */}
      <FilterChips
        vehicles={vehicles}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Loading */}
      {loading && (
        <div style={{
          padding: '40px 22px',
          textAlign: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'var(--text3)',
        }}>
          LOADING...
        </div>
      )}

      {/* Empty */}
      {!loading && events.length === 0 && (
        <div style={{ padding: '60px 22px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 14, color: 'var(--text2)' }}>
            No events yet — log a record or fuel refill to get started
          </div>
        </div>
      )}

      {/* Timeline */}
      {!loading && events.length > 0 && (
        <div style={{ padding: '0 22px' }}>
          {events.map((event, i) => (
            <TimelineItem
              key={`${event.type}-${event.relatedId ?? i}`}
              event={event}
              showVehicle={selectedId === null}
              isLast={i === events.length - 1}
              onClick={() => handleEventClick(event)}
            />
          ))}
        </div>
      )}
    </PageShell>
  )
}
