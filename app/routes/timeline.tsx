import { useState, useEffect } from 'react'
import PageShell from '@/ui/layout/PageShell'
import FilterChips from '@/ui/FilterChips'
import TimelineItem from '@/ui/TimelineItem'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { useTimelineStore } from '@/features/timeline/timelineStore'
import { useNavigate } from 'react-router-dom'
import type { TimelineEvent } from '@/lib/types'

export default function Timeline() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const navigate = useNavigate()

  const { vehicles, loading: vehiclesLoading, fetch: fetchVehicles } = useVehiclesStore()
  const { eventsByVehicle, loading: timelineLoading, fetchAll } = useTimelineStore()

  const loading = vehiclesLoading || timelineLoading

  // Vehicles from shared cache — 0 calls if Home/CarPark was visited first
  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  // Fetch all vehicle timelines once — filter chips are then instant
  useEffect(() => {
    if (!vehicles.length) return
    let cancelled = false
    fetchAll(vehicles).then(() => { if (cancelled) return })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length])

  // Filter client-side — no API call when switching between vehicles
  const events: TimelineEvent[] = (
    selectedId
      ? (eventsByVehicle[selectedId] ?? [])
      : Object.values(eventsByVehicle).flat()
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const handleEventClick = (event: TimelineEvent) => {
    if (!event.vehicleId || !event.relatedId) return
    if (event.type === 'Maintenance' || event.type === 'Service') {
      navigate(`/vehicles/${event.vehicleId}/records/${event.relatedId}`)
    } else if (event.type === 'Fuel') {
      navigate(`/vehicles/${event.vehicleId}/fuel/${event.relatedId}`)
    }
  }

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
