import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RecordItem from '@/features/records/RecordItem'
import { getRecordsByVehicle } from '@/features/records/api'
import { dedupFetch } from '@/lib/dedup'
import { LoadingState, ErrorState, EmptyState } from '@/ui/AsyncStates'
import { formatEnumLabel } from '@/lib/formatters'

import type { MaintenanceRecord } from '@/lib/types'

type SortKey = 'newest' | 'oldest' | 'cost-desc' | 'cost-asc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest',    label: '↓ Newest first' },
  { key: 'oldest',    label: '↑ Oldest first' },
  { key: 'cost-desc', label: 'Highest cost' },
  { key: 'cost-asc',  label: 'Lowest cost' },
]

export default function VehicleRecords() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('newest')
  const [filter, setFilter] = useState<string>('all')
  const [showSort, setShowSort] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    dedupFetch(`records-${vehicleId}`, () => getRecordsByVehicle(vehicleId!))
      .then((res) => { if (!cancelled) setRecords(res.data) })
      .catch(() => { if (!cancelled) setError('Failed to load records.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [vehicleId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false)
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filterOptions = useMemo(() => {
    const counts: Record<string, number> = {}
    records.forEach((r) => { const t = r.serviceType ?? 'Other'; counts[t] = (counts[t] ?? 0) + 1 })
    const typeOpts = Object.entries(counts).map(([type, count]) => ({
      key: type, label: `${formatEnumLabel(type)} (${count})`,
    }))
    return [{ key: 'all', label: `All (${records.length})` }, ...typeOpts]
  }, [records])

  const filteredRecords = useMemo(() => {
    if (filter === 'all') return records
    return records.filter((r) => (r.serviceType ?? 'Other') === filter)
  }, [records, filter])

  const sortedRecords = useMemo(() => {
    return filteredRecords.slice().sort((a, b) => {
      if (sort === 'newest')    return new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
      if (sort === 'oldest')    return new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime()
      if (sort === 'cost-desc') return (b.cost ?? 0) - (a.cost ?? 0)
      return (a.cost ?? 0) - (b.cost ?? 0)
    })
  }, [filteredRecords, sort])

  const totalSpent = useMemo(
    () => records.reduce((sum, r) => sum + (r.cost ?? 0), 0),
    [records]
  )

  const thisMonthSpent = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    return records
      .filter((r) => {
        const d = new Date(r.serviceDate)
        return d.getFullYear() === y && d.getMonth() === m
      })
      .reduce((sum, r) => sum + (r.cost ?? 0), 0)
  }, [records])

  const groupedRecords = useMemo(() => {
    if (sort === 'cost-desc' || sort === 'cost-asc') return null
    const groups: { label: string; items: MaintenanceRecord[] }[] = []
    for (const r of sortedRecords) {
      const label = new Date(r.serviceDate)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        .toUpperCase()
      const last = groups[groups.length - 1]
      if (last?.label === label) {
        last.items.push(r)
      } else {
        groups.push({ label, items: [r] })
      }
    }
    return groups
  }, [sortedRecords, sort])

  const currentFilterLabel = filterOptions.find((o) => o.key === filter)?.label ?? 'All'
  const currentSortLabel   = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? '⇅'

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 22px 12px',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Records</div>
        <button
          onClick={() => navigate(`/vehicles/${vehicleId}/records/new`)}
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

      {/* Stats bar */}
      {!loading && !error && records.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          margin: '0 16px 12px',
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 0', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
              {totalSpent.toLocaleString()} zł
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, color: 'var(--text2)', marginTop: 3,
            }}>
              total spent
            </div>
          </div>
          <div style={{ padding: '12px 0', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {records.length}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, color: 'var(--text2)', marginTop: 3,
            }}>
              records
            </div>
          </div>
          <div style={{ padding: '12px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--orange)' }}>
              {thisMonthSpent.toLocaleString()} zł
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, color: 'var(--text2)', marginTop: 3,
            }}>
              this month
            </div>
          </div>
        </div>
      )}

      {/* Filter + Sort dropdowns */}
      {!loading && !error && records.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '0 22px 12px' }}>

          {/* Filter */}
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowFilter((p) => !p); setShowSort(false) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500,
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
                borderRadius: 10, overflow: 'hidden', minWidth: 180,
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
        </div>
      )}

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && records.length === 0 && <EmptyState icon="🔧" message="No maintenance records yet" />}
      {!loading && !error && sortedRecords.length === 0 && records.length > 0 && (
        <EmptyState icon="🔧" message={`No ${formatEnumLabel(filter)} records`} />
      )}

      {/* Records list — grouped by month for date sorts, flat for cost sorts */}
      {!loading && !error && sortedRecords.length > 0 && (
        groupedRecords
          ? groupedRecords.map((group) => (
              <div key={group.label}>
                <div style={{
                  padding: '10px 22px 4px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, fontWeight: 700,
                  color: 'var(--text3)',
                  letterSpacing: '0.07em',
                }}>
                  {group.label}
                </div>
                {group.items.map((record) => (
                  <RecordItem
                    key={record.maintenanceRecordId}
                    record={record}
                    onClick={() => navigate(`/vehicles/${vehicleId}/records/${record.maintenanceRecordId}`)}
                  />
                ))}
              </div>
            ))
          : sortedRecords.map((record) => (
              <RecordItem
                key={record.maintenanceRecordId}
                record={record}
                onClick={() => navigate(`/vehicles/${vehicleId}/records/${record.maintenanceRecordId}`)}
              />
            ))
      )}
    </div>
  )
}
