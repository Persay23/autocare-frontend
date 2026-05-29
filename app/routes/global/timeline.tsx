import { useState, useEffect, useRef, type ElementType } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import TimelineItem from '@/ui/TimelineItem'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { useTimelineStore } from '@/features/timeline/timelineStore'
import { useExpensesStore } from '@/features/expenses/expensesStore'
import type { TimelineEvent } from '@/lib/types'
import { TIMELINE_ICONS } from '@/lib/icons'
import { formatEnumLabel } from '@/lib/formatters'
import { useCurrencyStore, formatMoney } from '@/features/currency/currencyStore'

const TYPE_COLOR: Record<string, string> = {
  Maintenance: 'var(--accent)',
  Service:     'var(--accent)',
  Fuel:        'var(--orange)',
  Liquid:      'var(--orange)',
  Expense:     'var(--accent4)',
  Other:       'var(--orange)',
}

function TimelineEventSheet({ event, onClose, onViewEntry }: { event: TimelineEvent; onClose: () => void; onViewEntry: () => void }) {
  const { currency } = useCurrencyStore()
  const Icon: ElementType = TIMELINE_ICONS[event.type] ?? TIMELINE_ICONS.Other
  const color = TYPE_COLOR[event.type] ?? 'var(--orange)'
  const dateStr = new Date(event.date).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border)', borderBottom: 'none',
        zIndex: 301, boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 12px' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: `color-mix(in srgb, ${color} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon sx={{ fontSize: 18, color }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{event.type}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
              {dateStr}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text2)', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Rows */}
        <div style={{ padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {event.description && event.description.trim() !== '' && (
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</div>
              <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{event.description}</div>
            </div>
          )}

          {event.cost != null && event.cost > 0 && (
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cost</div>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{formatMoney(event.cost, currency)}</div>
            </div>
          )}

          {event.vehicleName && (
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vehicle</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{event.vehicleName}</div>
            </div>
          )}
        </div>

        {/* View Entry button */}
        {event.relatedId && (
          <div style={{ padding: '0 20px 28px' }}>
            <button
              onClick={onViewEntry}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                width: '100%', padding: '12px 16px', borderRadius: 12,
                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                color, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              View Entry →
            </button>
          </div>
        )}
      </div>
    </>
  )
}

type Category = 'All' | 'Service' | 'Fuel' | 'Expense'

function dayKey(dateStr: string): string {
  return new Date(dateStr).toDateString()
}

function dayLabel(dateStr: string): string {
  const d     = new Date(dateStr)
  const today = new Date()
  const short = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()
  if (d.toDateString() === today.toDateString()) return `TODAY — ${short}`
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `YESTERDAY — ${short}`
  return short
}

// Abbreviate vehicle name to brand only ("BMW 320d" → "BMW")
function abbrev(name: string | undefined | null): string | undefined {
  return name?.split(' ')[0]
}

export default function Timeline() {
  const navigate = useNavigate()
  const { currency } = useCurrencyStore()
  const [selectedId, setSelectedId]       = useState<number | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)
  const [showFilter, setShowFilter]       = useState(false)
  const [category, setCategory]           = useState<Category>('All')
  const [showCategory, setShowCategory]   = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')
  const filterRef   = useRef<HTMLDivElement>(null)
  const categoryRef = useRef<HTMLDivElement>(null)

  const { vehicles, loading: vehiclesLoading, fetch: fetchVehicles } = useVehiclesStore()
  const { eventsByVehicle, loading: timelineLoading, fetchAll }      = useTimelineStore()
  const { generalExpenses, generalLoading, fetchGeneralExpenses }    = useExpensesStore()

  const loading = vehiclesLoading || timelineLoading || generalLoading

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current   && !filterRef.current.contains(e.target as Node))   setShowFilter(false)
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setShowCategory(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  useEffect(() => {
    if (!vehicles.length) return
    const vehicleIds = vehicles.map((v) => v.vehicleId)
    let cancelled = false
    fetchAll(vehicles).then(() => { if (cancelled) return })
    fetchGeneralExpenses(vehicleIds)
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length])

  // Map general expenses to timeline events
  const expenseEvents: TimelineEvent[] = (
    selectedId
      ? generalExpenses.filter((e) => e.vehicleId === selectedId)
      : generalExpenses
  ).map((e) => {
    const vehicle = vehicles.find((v) => v.vehicleId === e.vehicleId)
    return {
      date:        e.date,
      type:        'Expense',
      description: formatEnumLabel(e.expenseCategory) + (e.description ? ` · ${e.description}` : ''),
      cost:        e.cost,
      vehicleId:   e.vehicleId,
      vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model}` : '',
      relatedId:   e.generalExpenseId,
    }
  })

  // Base: filter by vehicle, sort newest first — merge timeline + general expenses
  const baseEvents: TimelineEvent[] = [
    ...(
      selectedId
        ? (eventsByVehicle[selectedId] ?? [])
        : Object.values(eventsByVehicle).flat()
    ),
    ...expenseEvents,
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Duplicate detection — same vehicle + same day + same type appearing more than once
  const dupSet = new Set<string>()
  const seen   = new Set<string>()
  for (const e of baseEvents) {
    const k = `${e.vehicleId}-${dayKey(e.date)}-${e.type}`
    if (seen.has(k)) dupSet.add(k)
    else seen.add(k)
  }
  const isDup = (e: TimelineEvent) => dupSet.has(`${e.vehicleId}-${dayKey(e.date)}-${e.type}`)

  // Category filter
  const categoryFiltered: TimelineEvent[] =
    category === 'Service'
      ? baseEvents.filter((e) => e.type === 'Maintenance' || e.type === 'Service')
      : category === 'Fuel'
        ? baseEvents.filter((e) => e.type === 'Fuel' || e.type === 'Liquid')
        : category === 'Expense'
          ? baseEvents.filter((e) => e.type === 'Expense')
          : baseEvents

  // Search filter
  const filteredEvents = searchQuery.trim()
    ? categoryFiltered.filter((e) =>
        (e.description ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.vehicleName ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categoryFiltered

  // Group by day
  const groups: { key: string; label: string; events: TimelineEvent[] }[] = []
  for (const e of filteredEvents) {
    const key  = dayKey(e.date)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.events.push(e)
    else groups.push({ key, label: dayLabel(e.date), events: [e] })
  }

  const shownTotal = filteredEvents.reduce((sum, e) => sum + (e.cost ?? 0), 0)

  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEvent(event)
  }

  const CATEGORY_LABELS: Category[] = ['All', 'Service', 'Fuel', 'Expense']

  return (
    <PageShell>
      {/* Header */}
      <div style={{ padding: '20px 22px 8px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Timeline</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 3 }}>
          {selectedId ? 'filtered by vehicle' : 'all vehicles · tap to open'}
        </div>
      </div>

      {/* Filter row: vehicle + category */}
      <div style={{ padding: '0 22px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {/* Vehicle filter */}
        {vehicles.length > 0 && (
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowFilter((p) => !p); setShowCategory(false) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500,
                border: (showFilter || selectedId !== null) ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: (showFilter || selectedId !== null) ? 'rgba(108,99,255,0.1)' : 'var(--surface2)',
                color: (showFilter || selectedId !== null) ? 'var(--accent)' : 'var(--text3)',
                transition: 'all 0.15s',
              }}
            >
              {selectedId === null
                ? 'All cars'
                : (() => { const v = vehicles.find((x) => x.vehicleId === selectedId); return v ? `${v.brand} ${v.model}` : 'All cars' })()
              } ▾
            </button>
            {showFilter && (
              <div style={{
                position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 100,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden', minWidth: 200,
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              }}>
                {[{ vehicleId: null, label: 'All cars' }, ...vehicles.map((v) => ({ vehicleId: v.vehicleId, label: `${v.brand} ${v.model}` }))].map(({ vehicleId, label }) => (
                  <button
                    key={vehicleId ?? 'all'}
                    onClick={() => { setSelectedId(vehicleId as number | null); setShowFilter(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '11px 14px', background: 'none', border: 'none',
                      borderBottom: '1px solid var(--border)',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      color: selectedId === vehicleId ? 'var(--accent)' : 'var(--text2)',
                      fontWeight: selectedId === vehicleId ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {selectedId === vehicleId && '✓ '}{label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category filter */}
        <div ref={categoryRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowCategory((p) => !p); setShowFilter(false) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500,
              border: (showCategory || category !== 'All') ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: (showCategory || category !== 'All') ? 'rgba(108,99,255,0.1)' : 'var(--surface2)',
              color: (showCategory || category !== 'All') ? 'var(--accent)' : 'var(--text3)',
              transition: 'all 0.15s',
            }}
          >
            {category} ▾
          </button>
          {showCategory && (
            <div style={{
              position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 100,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, overflow: 'hidden', minWidth: 140,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}>
              {CATEGORY_LABELS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setShowCategory(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '11px 14px', background: 'none', border: 'none',
                    borderBottom: '1px solid var(--border)',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                    color: category === cat ? 'var(--accent)' : 'var(--text2)',
                    fontWeight: category === cat ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {category === cat && '✓ '}{cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      {!loading && baseEvents.length > 0 && (
        <div style={{ padding: '0 22px 10px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: 12, color: 'var(--text3)', pointerEvents: 'none',
            }}>
              ⌕
            </span>
            <input
              type="text"
              placeholder="Search timeline…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px 9px 30px',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 10, outline: 'none',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: 'var(--text)', caretColor: 'var(--accent)',
              }}
            />
          </div>
        </div>
      )}

      {/* Shown total */}
      {!loading && filteredEvents.length > 0 && (
        <div style={{
          margin: '0 22px 12px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '10px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 3 }}>
              SHOWN TOTAL
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
              {formatMoney(shownTotal, currency)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              {filteredEvents.length} entr{filteredEvents.length !== 1 ? 'ies' : 'y'}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          padding: '40px 22px', textAlign: 'center',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)',
        }}>
          LOADING...
        </div>
      )}

      {/* Empty */}
      {!loading && filteredEvents.length === 0 && (
        <div style={{ padding: '60px 22px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 14, color: 'var(--text2)' }}>
            {searchQuery || category !== 'All' ? 'No results for those filters' : 'No events yet — log a record or fuel refill to get started'}
          </div>
        </div>
      )}

      {/* Grouped timeline */}
      {!loading && groups.length > 0 && (
        <div style={{ padding: '0 22px 24px' }}>
          {groups.map((group) => (
            <div key={group.key} style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, fontWeight: 700, color: 'var(--text3)',
                letterSpacing: '0.1em', marginBottom: 12,
              }}>
                {group.label}
              </div>
              {group.events.map((event, i) => (
                <TimelineItem
                  key={`${event.type}-${event.relatedId ?? i}`}
                  event={selectedId === null && event.vehicleName
                    ? { ...event, vehicleName: abbrev(event.vehicleName) ?? event.vehicleName }
                    : event
                  }
                  showVehicle={selectedId === null}
                  isLast={i === group.events.length - 1}
                  isDuplicate={isDup(event)}
                  onClick={() => handleEventClick(event)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {selectedEvent && (
        <TimelineEventSheet
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onViewEntry={() => {
            const e = selectedEvent
            setSelectedEvent(null)
            if (!e.relatedId) return
            if (e.type === 'Expense') {
              navigate(`/expenses/${e.relatedId}`)
            } else if (!e.vehicleId) {
              // no-op — other types require vehicleId
            } else if (e.type === 'Maintenance' || e.type === 'Service') {
              navigate(`/vehicles/${e.vehicleId}/records/${e.relatedId}`)
            } else if (e.type === 'Fuel' || e.type === 'Liquid') {
              navigate(`/vehicles/${e.vehicleId}/fuel/${e.relatedId}`)
            }
          }}
        />
      )}
    </PageShell>
  )
}
