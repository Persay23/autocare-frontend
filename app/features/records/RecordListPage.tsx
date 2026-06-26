import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import RecordItem from '@/features/records/RecordItem'
import { getRecordsByVehicle } from '@/features/records/api'
import { dedupFetch } from '@/shared/dedup'
import RecordModal from '@/features/records/RecordModal'
import { LoadingState, ErrorState, EmptyState } from '@/ui/AsyncStates'
import { formatEnumLabel } from '@/shared/formatters'
import { useCurrencyStore, formatMoney } from '@/features/currency/currencyStore'
import FilterPill from '@/ui/FilterPill'
import type { FilterOption } from '@/shared/filters'
import type { MaintenanceRecord } from '@/shared/types'

type SortKey = 'newest' | 'oldest' | 'cost-desc' | 'cost-asc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest',    label: '↓ Newest first' },
  { key: 'oldest',    label: '↑ Oldest first' },
  { key: 'cost-desc', label: 'Highest cost' },
  { key: 'cost-asc',  label: 'Lowest cost' },
]

export default function RecordListPage() {
  const { vehicleId } = useParams()
  const { currency } = useCurrencyStore()
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort]             = useState<SortKey>('newest')
  const [typeFilter, setTypeFilter] = useState<string[]>([])

  // undefined = closed, null = create mode, number = detail/edit mode
  const [modalRecordId, setModalRecordId] = useState<number | null | undefined>(undefined)
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    dedupFetch(`records-${vehicleId}-${fetchKey}`, () => getRecordsByVehicle(vehicleId!))
      .then((res) => { if (!cancelled) setRecords(res.data) })
      .catch(() => { if (!cancelled) setError('Failed to load records.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [vehicleId, fetchKey])

  const typeFilterOptions: FilterOption[] = useMemo(() => {
    const counts: Record<string, number> = {}
    records.forEach((r) => { const t = r.serviceType ?? 'Other'; counts[t] = (counts[t] ?? 0) + 1 })
    return Object.entries(counts).map(([type, count]) => ({
      key: type, label: `${formatEnumLabel(type)} (${count})`,
    }))
  }, [records])

  const filteredRecords = useMemo(() => {
    if (typeFilter.length === 0) return records
    return records.filter((r) => typeFilter.includes(r.serviceType ?? 'Other'))
  }, [records, typeFilter])

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


  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 22px 12px',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Records</div>
        <button
          onClick={() => setModalRecordId(null)}
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
              {formatMoney(totalSpent, currency)}
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
              {formatMoney(thisMonthSpent, currency)}
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

      {/* Filter + Sort bar */}
      {!loading && !error && records.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '0 22px 12px' }}>
          <FilterPill
            placeholder="Type"
            options={typeFilterOptions}
            selected={typeFilter}
            onChangeMulti={setTypeFilter}
            multi noun="types"
          />
          <FilterPill
            placeholder={SORT_OPTIONS.find((o) => o.key === sort)?.label ?? '⇅'}
            options={SORT_OPTIONS}
            value={sort}
            onChange={(k) => setSort(k as SortKey)}
            isSort
          />
        </div>
      )}

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && records.length === 0 && <EmptyState icon="🔧" message="No maintenance records yet" />}
      {!loading && !error && sortedRecords.length === 0 && records.length > 0 && (
        <EmptyState icon="🔧" message="No records match the current filter" />
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
                    onClick={() => setModalRecordId(record.maintenanceRecordId)}
                  />
                ))}
              </div>
            ))
          : sortedRecords.map((record) => (
              <RecordItem
                key={record.maintenanceRecordId}
                record={record}
                onClick={() => setModalRecordId(record.maintenanceRecordId)}
              />
            ))
      )}

      {/* Record modal — create (null) or detail/edit (recordId) */}
      {modalRecordId !== undefined && vehicleId && (
        <RecordModal
          vehicleId={vehicleId}
          recordId={modalRecordId}
          onClose={() => setModalRecordId(undefined)}
          onSaved={() => { setModalRecordId(undefined); setFetchKey((k) => k + 1) }}
          onDeleted={() => { setModalRecordId(undefined); setFetchKey((k) => k + 1) }}
        />
      )}
    </div>
  )
}
