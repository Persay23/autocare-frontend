import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getFuelByVehicle } from '@/features/fuel/api'
import { dedupFetch } from '@/lib/dedup'
import { LoadingState, ErrorState, EmptyState } from '@/ui/AsyncStates'
import { formatEnumLabel } from '@/lib/formatters'
import { useCurrencyStore, formatMoney, RATES, SYMBOLS, toPLN } from '@/features/currency/currencyStore'
import type { FuelEntry } from '@/lib/types'
import FuelEntryModal from '@/ui/FuelEntryModal'

type SortKey = 'newest' | 'oldest' | 'cost-desc' | 'litres-desc' | 'price-per-l'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest',      label: '↓ Newest first' },
  { key: 'oldest',      label: '↑ Oldest first' },
  { key: 'cost-desc',   label: 'Highest cost' },
  { key: 'litres-desc', label: 'Most litres' },
  { key: 'price-per-l', label: 'Cheapest per litre' },
]

function entryId(e: FuelEntry) { return e.liquidEntryId ?? e.fuelEntryId! }

export default function VehicleFuel() {
  const { vehicleId } = useParams()
  const { currency } = useCurrencyStore()
  const [entries, setEntries] = useState<FuelEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [modalEntryId, setModalEntryId] = useState<number | null | undefined>(undefined)
  const [sort, setSort] = useState<SortKey>('newest')
  const [filter, setFilter] = useState<string>('all')
  const [showSort, setShowSort] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [showCostPLPanel, setShowCostPLPanel] = useState(false)
  const [showStationFilter, setShowStationFilter] = useState(false)
  const [costPLMin, setCostPLMin] = useState('')
  const [costPLMax, setCostPLMax] = useState('')
  const [stationFilter, setStationFilter] = useState('all')
  const sortRef    = useRef<HTMLDivElement>(null)
  const filterRef  = useRef<HTMLDivElement>(null)
  const stationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    dedupFetch(`fuel-${vehicleId}-${refreshKey}`, () => getFuelByVehicle(vehicleId!))
      .then((res) => { if (!cancelled) setEntries(res.data) })
      .catch(() => { if (!cancelled) setError('Failed to load fuel entries.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [vehicleId, refreshKey])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current    && !sortRef.current.contains(e.target as Node))    setShowSort(false)
      if (filterRef.current  && !filterRef.current.contains(e.target as Node))  setShowFilter(false)
      if (stationRef.current && !stationRef.current.contains(e.target as Node)) setShowStationFilter(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filterOptions = useMemo(() => {
    const counts: Record<string, number> = {}
    entries.forEach((e) => { const t = e.fuelType ?? e.liquidType ?? 'Other'; counts[t] = (counts[t] ?? 0) + 1 })
    const typeOpts = Object.entries(counts).map(([type, count]) => ({
      key: type, label: `${formatEnumLabel(type)} (${count})`,
    }))
    return [{ key: 'all', label: `All (${entries.length})` }, ...typeOpts]
  }, [entries])

  const stations = useMemo(() => {
    const names = [...new Set(entries.map((e) => e.notes).filter(Boolean))] as string[]
    return names.sort()
  }, [entries])

  const filteredEntries = useMemo(() => {
    let result = filter === 'all' ? entries : entries.filter((e) => (e.fuelType ?? e.liquidType ?? 'Other') === filter)
    if (stationFilter !== 'all') result = result.filter((e) => e.notes === stationFilter)
    if (costPLMin) result = result.filter((e) => e.amount > 0 && (e.cost / e.amount) >= toPLN(parseFloat(costPLMin), currency))
    if (costPLMax) result = result.filter((e) => e.amount > 0 && (e.cost / e.amount) <= toPLN(parseFloat(costPLMax), currency))
    return result
  }, [entries, filter, stationFilter, costPLMin, costPLMax, currency])

  const sortedEntries = useMemo(() => {
    return filteredEntries.slice().sort((a, b) => {
      if (sort === 'newest')      return new Date(b.refillDate).getTime() - new Date(a.refillDate).getTime()
      if (sort === 'oldest')      return new Date(a.refillDate).getTime() - new Date(b.refillDate).getTime()
      if (sort === 'cost-desc')   return (b.cost ?? 0) - (a.cost ?? 0)
      if (sort === 'litres-desc') return (b.amount ?? 0) - (a.amount ?? 0)
      const pplA = a.amount > 0 ? a.cost / a.amount : Infinity
      const pplB = b.amount > 0 ? b.cost / b.amount : Infinity
      return pplA - pplB
    })
  }, [filteredEntries, sort])

  // Summary stats — always over all entries (vehicle totals)
  const totalSpent  = useMemo(() => entries.reduce((s, e) => s + (e.cost ?? 0), 0), [entries])
  const totalLitres = useMemo(() => entries.reduce((s, e) => s + (e.amount ?? 0), 0), [entries])
  const avgPerL     = totalLitres > 0 ? totalSpent / totalLitres : null
  const avgRefill   = entries.length > 0 ? Math.round(totalSpent / entries.length) : null
  const per100km    = useMemo(() => {
    if (entries.length < 2 || totalLitres === 0) return null
    const mileages = entries.map((e) => e.mileage).filter(Boolean)
    const range = Math.max(...mileages) - Math.min(...mileages)
    return range > 0 ? (totalLitres / range) * 100 : null
  }, [entries, totalLitres])

  // km driven since previous fill (by mileage order)
  const kmGapMap = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.mileage - a.mileage)
    const map = new Map<number, number>()
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i].mileage - sorted[i + 1].mileage
      if (gap > 0) map.set(entryId(sorted[i]), gap)
    }
    return map
  }, [entries])

  // Month groups (only for date sorts)
  const groupedEntries = useMemo(() => {
    if (sort !== 'newest' && sort !== 'oldest') return null
    const groups: { label: string; totalCost: number; totalLitres: number; items: FuelEntry[] }[] = []
    for (const e of sortedEntries) {
      const label = new Date(e.refillDate)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        .toUpperCase()
      const last = groups[groups.length - 1]
      if (last?.label === label) {
        last.totalCost   += e.cost ?? 0
        last.totalLitres += e.amount ?? 0
        last.items.push(e)
      } else {
        groups.push({ label, totalCost: e.cost ?? 0, totalLitres: e.amount ?? 0, items: [e] })
      }
    }
    return groups
  }, [sortedEntries, sort])

  const currentFilterLabel = filterOptions.find((o) => o.key === filter)?.label ?? 'All'
  const currentSortLabel   = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? '⇅'

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 22px 12px',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Fuel</div>
        <button
          onClick={() => setModalEntryId(null)}
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '6px 14px', borderRadius: 10,
            background: 'var(--accent)', border: 'none',
            color: '#fff', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >
          + Add
        </button>
      </div>

      {/* Stats block */}
      {!loading && !error && entries.length > 0 && (
        <div style={{
          margin: '0 16px 12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {/* Row 1: Total spent / Total litres — equal columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ padding: '14px 16px', borderRight: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: 'var(--text2)', marginBottom: 5,
              }}>
                Total spent
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
                {formatMoney(totalSpent, currency)}
              </div>
            </div>
            <div style={{ padding: '14px 16px', textAlign: 'center' }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: 'var(--text2)', marginBottom: 5,
              }}>
                Total litres
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
                {totalLitres.toLocaleString()} L
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Row 2: avg per L / per 100 km / avg refill */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div style={{ padding: '10px 0', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                {avgPerL != null ? formatMoney(avgPerL, currency) : '—'}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)', marginTop: 3 }}>
                avg per L
              </div>
            </div>
            <div style={{ padding: '10px 0', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                {per100km != null ? `${per100km.toFixed(1)} L` : '—'}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)', marginTop: 3 }}>
                per 100 km
              </div>
            </div>
            <div style={{ padding: '10px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {avgRefill != null ? formatMoney(avgRefill, currency) : '—'}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)', marginTop: 3 }}>
                avg refill
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter + Sort dropdowns */}
      {!loading && !error && entries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '0 22px 12px' }}>

          {/* Filter */}
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowFilter((p) => !p); setShowSort(false) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500,
                whiteSpace: 'nowrap',
                border: (showFilter || filter !== 'all') ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: (showFilter || filter !== 'all') ? 'rgba(108,99,255,0.1)' : 'var(--surface2)',
                color: (showFilter || filter !== 'all') ? 'var(--accent)' : 'var(--text3)',
                transition: 'all 0.15s',
              }}
            >
              {currentFilterLabel} ▾
            </button>
            {showFilter && (
              <div style={{
                position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 100,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden', minWidth: 180,
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              }}>
                {filterOptions.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setFilter(key); setShowFilter(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '11px 14px', background: 'none', border: 'none',
                      borderBottom: '1px solid var(--border)',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      color: filter === key ? 'var(--accent)' : 'var(--text2)',
                      fontWeight: filter === key ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {filter === key && '✓ '}{label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <div ref={sortRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowSort((p) => !p); setShowFilter(false) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500,
                whiteSpace: 'nowrap',
                border: showSort ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: showSort ? 'rgba(108,99,255,0.1)' : 'var(--surface2)',
                color: showSort ? 'var(--accent)' : 'var(--text3)',
                transition: 'all 0.15s',
              }}
            >
              {currentSortLabel} ▾
            </button>
            {showSort && (
              <div style={{
                position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 100,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden', minWidth: 200,
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              }}>
                {SORT_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setSort(key); setShowSort(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '11px 14px', background: 'none', border: 'none',
                      borderBottom: '1px solid var(--border)',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      color: sort === key ? 'var(--accent)' : 'var(--text2)',
                      fontWeight: sort === key ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {sort === key && '✓ '}{label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cost/L range pill */}
          <button
            onClick={() => { setShowCostPLPanel((p) => !p) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500,
              whiteSpace: 'nowrap',
              border: (showCostPLPanel || costPLMin || costPLMax) ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: (showCostPLPanel || costPLMin || costPLMax) ? 'rgba(108,99,255,0.1)' : 'var(--surface2)',
              color: (showCostPLPanel || costPLMin || costPLMax) ? 'var(--accent)' : 'var(--text3)',
              transition: 'all 0.15s',
            }}
          >
            Price range
          </button>

          {/* Station filter pill — only when 2+ unique station names exist */}
          {stations.length >= 2 && (
            <div ref={stationRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowStationFilter((p) => !p) }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500,
                  whiteSpace: 'nowrap',
                  border: (showStationFilter || stationFilter !== 'all') ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: (showStationFilter || stationFilter !== 'all') ? 'rgba(108,99,255,0.1)' : 'var(--surface2)',
                  color: (showStationFilter || stationFilter !== 'all') ? 'var(--accent)' : 'var(--text3)',
                  transition: 'all 0.15s',
                }}
              >
                {stationFilter === 'all' ? 'Station' : stationFilter} ▾
              </button>
              {showStationFilter && (
                <div style={{
                  position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 100,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 10, overflow: 'hidden', minWidth: 160,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                }}>
                  {[{ key: 'all', label: 'All stations' }, ...stations.map((s) => ({ key: s, label: s }))].map(({ key, label }) => (
                    <button key={key}
                      onClick={() => { setStationFilter(key); setShowStationFilter(false) }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '11px 14px', background: 'none', border: 'none',
                        borderBottom: '1px solid var(--border)',
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                        color: stationFilter === key ? 'var(--accent)' : 'var(--text2)',
                        fontWeight: stationFilter === key ? 600 : 400, cursor: 'pointer',
                      }}
                    >
                      {stationFilter === key && '✓ '}{label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && !error && entries.length > 0 && showCostPLPanel && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '0 22px 10px', flexWrap: 'wrap' }}>
          <input type="number" min="0" step="0.01" placeholder={`Min ${SYMBOLS[currency]}/L`} value={costPLMin} onChange={(e) => setCostPLMin(e.target.value)}
            style={{ padding: '5px 8px', width: 80, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text)', outline: 'none' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>–</span>
          <input type="number" min="0" step="0.01" placeholder={`Max ${SYMBOLS[currency]}/L`} value={costPLMax} onChange={(e) => setCostPLMax(e.target.value)}
            style={{ padding: '5px 8px', width: 80, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text)', outline: 'none' }} />
          {(costPLMin || costPLMax) && (
            <button onClick={() => { setCostPLMin(''); setCostPLMax('') }}
              style={{ padding: '4px 8px', borderRadius: 6, background: 'none', border: '1px solid var(--border)', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>
      )}

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && entries.length === 0 && <EmptyState icon="⛽" message="No fuel entries yet" />}
      {!loading && !error && sortedEntries.length === 0 && entries.length > 0 && (
        <EmptyState icon="⛽" message={`No ${formatEnumLabel(filter)} entries`} />
      )}

      {/* Entry list — grouped by month for date sorts, flat for other sorts */}
      {!loading && !error && sortedEntries.length > 0 && (
        groupedEntries
          ? groupedEntries.map((group) => (
              <div key={group.label}>
                <div style={{
                  padding: '10px 22px 4px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, fontWeight: 700,
                  color: 'var(--text3)',
                  letterSpacing: '0.07em',
                }}>
                  {group.label} · {formatMoney(group.totalCost, currency)} · {group.totalLitres} L
                </div>
                {group.items.map((entry) => (
                  <FuelEntryRow
                    key={entryId(entry)}
                    entry={entry}
                    kmGap={kmGapMap.get(entryId(entry))}
                    onClick={() => setModalEntryId(entryId(entry))}
                  />
                ))}
              </div>
            ))
          : sortedEntries.map((entry) => (
              <FuelEntryRow
                key={entryId(entry)}
                entry={entry}
                kmGap={kmGapMap.get(entryId(entry))}
                onClick={() => setModalEntryId(entryId(entry))}
              />
            ))
      )}

      {modalEntryId !== undefined && (
        <FuelEntryModal
          vehicleId={vehicleId!}
          entryId={modalEntryId}
          onClose={() => setModalEntryId(undefined)}
          onSaved={() => { setRefreshKey((k) => k + 1); setModalEntryId(undefined) }}
        />
      )}
    </div>
  )
}

function FuelEntryRow({ entry, kmGap, onClick }: {
  entry: FuelEntry
  kmGap: number | undefined
  onClick: () => void
}) {
  const { currency } = useCurrencyStore()
  const pricePerLPLN = entry.amount > 0 ? entry.cost / entry.amount : null
  const pricePerL = pricePerLPLN != null ? (pricePerLPLN * RATES[currency]).toFixed(2) : null
  const shortDate = new Date(entry.refillDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  const title = entry.notes ? `${entry.notes} · ${entry.amount} L` : `${entry.amount} L`

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 22px', borderBottom: '1px solid var(--border2)',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 20, width: 32, textAlign: 'center', flexShrink: 0 }}>⛽</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)' }}>
          {pricePerL ? `${pricePerL} ${SYMBOLS[currency]}/L` : ''}
          {pricePerL && entry.mileage ? ' · ' : ''}
          {entry.mileage ? `${entry.mileage.toLocaleString()} km` : ''}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent3)' }}>
          {formatMoney(entry.cost, currency)}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
          {shortDate}{kmGap != null ? ` · +${kmGap.toLocaleString()} km` : ''}
        </div>
      </div>
    </div>
  )
}
