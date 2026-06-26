import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { getFuelByVehicle } from '@/features/fuel/api'
import { dedupFetch } from '@/shared/dedup'
import { LoadingState, ErrorState, EmptyState } from '@/ui/AsyncStates'
import { formatEnumLabel } from '@/shared/formatters'
import { useCurrencyStore, formatMoney, RATES, SYMBOLS } from '@/features/currency/currencyStore'
import type { FuelEntry } from '@/shared/types'
import FuelModal from '@/features/fuel/FuelModal'
import FilterPill from '@/ui/FilterPill'
import type { FilterOption } from '@/shared/filters'

type SortKey = 'newest' | 'oldest' | 'cost-desc' | 'litres-desc' | 'price-per-l'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest',      label: '↓ Newest first' },
  { key: 'oldest',      label: '↑ Oldest first' },
  { key: 'cost-desc',   label: 'Highest cost' },
  { key: 'litres-desc', label: 'Most litres' },
  { key: 'price-per-l', label: 'Cheapest per litre' },
]

function entryId(e: FuelEntry) { return e.liquidEntryId ?? e.fuelEntryId! }

export default function FuelListPage() {
  const { vehicleId } = useParams()
  const { currency } = useCurrencyStore()
  const [entries, setEntries] = useState<FuelEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [modalEntryId, setModalEntryId] = useState<number | null | undefined>(undefined)
  const [sort, setSort]               = useState<SortKey>('newest')
  const [typeFilter, setTypeFilter]   = useState<string[]>([])
  const [stationFilter, setStationFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    dedupFetch(`fuel-${vehicleId}-${refreshKey}`, () => getFuelByVehicle(vehicleId!))
      .then((res) => { if (!cancelled) setEntries(res.data) })
      .catch(() => { if (!cancelled) setError('Failed to load fuel entries.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [vehicleId, refreshKey])

  const typeFilterOptions: FilterOption[] = useMemo(() => {
    const counts: Record<string, number> = {}
    entries.forEach((e) => { const t = e.fuelType ?? e.liquidType ?? 'Other'; counts[t] = (counts[t] ?? 0) + 1 })
    return Object.entries(counts).map(([type, count]) => ({
      key: type, label: `${formatEnumLabel(type)} (${count})`,
    }))
  }, [entries])

  const stations = useMemo(() => {
    const names = [...new Set(entries.map((e) => e.notes).filter(Boolean))] as string[]
    return names.sort()
  }, [entries])

  const filteredEntries = useMemo(() => {
    let result = typeFilter.length === 0
      ? entries
      : entries.filter((e) => typeFilter.includes(e.fuelType ?? e.liquidType ?? 'Other'))
    if (stationFilter !== 'all') result = result.filter((e) => e.notes === stationFilter)
    return result
  }, [entries, typeFilter, stationFilter])

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

      {/* Filter + Sort bar */}
      {!loading && !error && entries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '0 22px 12px' }}>
          <FilterPill
            placeholder="Type"
            options={typeFilterOptions}
            selected={typeFilter}
            onChangeMulti={setTypeFilter}
            multi noun="types"
          />
          {stations.length >= 2 && (
            <FilterPill
              placeholder="Station"
              options={[{ key: 'all', label: 'All stations' }, ...stations.map((s) => ({ key: s, label: s }))]}
              value={stationFilter}
              onChange={setStationFilter}
              minWidth={160}
            />
          )}
          <FilterPill
            placeholder={SORT_OPTIONS.find((o) => o.key === sort)?.label ?? '⇅'}
            options={SORT_OPTIONS}
            value={sort}
            onChange={(k) => setSort(k as SortKey)}
            isSort minWidth={200}
          />
        </div>
      )}

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && entries.length === 0 && <EmptyState icon="⛽" message="No fuel entries yet" />}
      {!loading && !error && sortedEntries.length === 0 && entries.length > 0 && (
        <EmptyState icon="⛽" message="No entries match the current filter" />
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
        <FuelModal
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
