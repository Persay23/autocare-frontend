import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import ComponentModal from '@/ui/ComponentModal'
import HealthBar from '@/ui/HealthBar'
import { getComponentHealth } from '@/features/components/api'
import { dedupFetch } from '@/lib/dedup'
import { LoadingState, ErrorState, EmptyState } from '@/ui/AsyncStates'
import { COMPONENT_ICONS } from '@/lib/icons'
import { formatEnumLabel } from '@/lib/formatters'
import QuickSetupSheet from '@/ui/QuickSetupSheet'

import type { ComponentHealth } from '@/lib/types'
import { healthPctToState } from '@/lib/healthState'

type SortKey  = 'health-asc' | 'health-desc' | 'name-asc' | 'name-desc'
type FilterKey = 'all' | 'critical' | 'repair' | 'warning' | 'good' | 'unknown'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'health-asc',  label: '↑ Lowest health first' },
  { key: 'health-desc', label: '↓ Highest health first' },
  { key: 'name-asc',    label: 'A → Z' },
  { key: 'name-desc',   label: 'Z → A' },
]

const ATTENTION_STATES = new Set(['Critical', 'Repair', 'Warning'])

const ATTENTION_STYLE: Record<string, { cardBg: string; cardBorder: string; labelColor: string }> = {
  Critical: { cardBg: 'rgba(248,113,113,0.07)', cardBorder: 'rgba(248,113,113,0.22)', labelColor: 'var(--red)' },
  Repair:   { cardBg: 'rgba(251,146,60,0.07)',  cardBorder: 'rgba(251,146,60,0.22)',  labelColor: 'var(--orange)' },
  Warning:  { cardBg: 'rgba(251,191,36,0.07)',  cardBorder: 'rgba(251,191,36,0.22)',  labelColor: 'var(--yellow)' },
}

function healthColor(pct: number): string {
  if (pct >= 75) return 'var(--accent4)'
  if (pct >= 51) return 'var(--green)'
  if (pct >= 31) return 'var(--yellow)'
  if (pct >= 16) return 'var(--orange)'
  return 'var(--red)'
}

/** Always compute state from health %, respecting Unknown when data is insufficient */
function getDerivedState(c: ComponentHealth): string {
  if (c.currentState === 'Unknown') return 'Unknown'
  const pct = Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0)
  return healthPctToState(pct)
}

export default function VehicleComponents() {
  const { vehicleId } = useParams()
  const [health, setHealth] = useState<ComponentHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showQuickSetup, setShowQuickSetup] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [modalComponentId, setModalComponentId] = useState<number | null | undefined>(undefined)
  const [sort, setSort] = useState<SortKey>('health-asc')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showSort, setShowSort] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const sortRef   = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    dedupFetch(`health-${vehicleId}-${refreshKey}`, () => getComponentHealth(vehicleId!))
      .then((res) => { if (!cancelled) setHealth(res.data) })
      .catch(() => { if (!cancelled) setError('Failed to load components.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [vehicleId, refreshKey])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false)
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const existingNames = new Set(
    health.map((h) => h.vehicleComponentName).filter((n): n is string => Boolean(n))
  )

  const criticalCount = health.filter((c) => getDerivedState(c) === 'Critical').length
  const repairCount   = health.filter((c) => getDerivedState(c) === 'Repair').length
  const warningCount  = health.filter((c) => getDerivedState(c) === 'Warning').length
  const unknownCount  = health.filter((c) => getDerivedState(c) === 'Unknown').length

  const filteredHealth = useMemo(() => {
    let result = health
    if (filter === 'critical') result = result.filter((c) => getDerivedState(c) === 'Critical')
    else if (filter === 'repair')  result = result.filter((c) => getDerivedState(c) === 'Repair')
    else if (filter === 'warning') result = result.filter((c) => getDerivedState(c) === 'Warning')
    else if (filter === 'unknown') result = result.filter((c) => getDerivedState(c) === 'Unknown')
    else if (filter === 'good')    result = result.filter((c) => {
      const s = getDerivedState(c)
      return !ATTENTION_STATES.has(s) && s !== 'Unknown'
    })
    return result
  }, [health, filter])

  const sortedHealth = useMemo(() => {
    return filteredHealth.slice().sort((a, b) => {
      // Unknown components always sort last regardless of sort key
      const unkA = getDerivedState(a) === 'Unknown'
      const unkB = getDerivedState(b) === 'Unknown'
      if (unkA && !unkB) return 1
      if (!unkA && unkB) return -1

      const pctA = Math.min(a.kmLifetimePercent ?? 0, a.yearsLifetimePercent ?? 0)
      const pctB = Math.min(b.kmLifetimePercent ?? 0, b.yearsLifetimePercent ?? 0)
      const nameA = (a.vehicleComponentName || formatEnumLabel(a.componentType)).toLowerCase()
      const nameB = (b.vehicleComponentName || formatEnumLabel(b.componentType)).toLowerCase()
      if (sort === 'health-asc')  return pctA - pctB
      if (sort === 'health-desc') return pctB - pctA
      if (sort === 'name-asc')    return nameA.localeCompare(nameB)
      return nameB.localeCompare(nameA)
    })
  }, [filteredHealth, sort])

  const needsAttention = sortedHealth.filter((c) => ATTENTION_STATES.has(getDerivedState(c)))
  const healthy        = sortedHealth.filter((c) => {
    const s = getDerivedState(c)
    return !ATTENTION_STATES.has(s) && s !== 'Unknown'
  })
  const unknownGroup   = sortedHealth.filter((c) => getDerivedState(c) === 'Unknown')
  const showGroups     = filter === 'all'

  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: 'all',      label: `All (${health.length})` },
    ...(criticalCount > 0 ? [{ key: 'critical' as FilterKey, label: `Critical (${criticalCount})` }] : []),
    ...(repairCount   > 0 ? [{ key: 'repair'   as FilterKey, label: `Repair (${repairCount})`     }] : []),
    ...(warningCount  > 0 ? [{ key: 'warning'  as FilterKey, label: `Warning (${warningCount})`   }] : []),
    { key: 'good',    label: 'Good' },
    ...(unknownCount  > 0 ? [{ key: 'unknown'  as FilterKey, label: `Unknown (${unknownCount})`   }] : []),
  ]

  const currentFilterLabel = filterOptions.find((o) => o.key === filter)?.label ?? 'All'
  const currentSortLabel   = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? '⇅'

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 22px 12px',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Components</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => setModalComponentId(null)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '6px 14px', borderRadius: 10,
              background: 'var(--accent)', border: 'none',
              color: '#fff', fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Filter + Sort dropdowns */}
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


      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && health.length === 0 && (
        <EmptyState icon="⚙" message="No components tracked yet" />
      )}

      {!loading && !error && (
        <div style={{ padding: '0 22px' }}>
          {showGroups && needsAttention.length > 0 && (
            <>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                color: 'var(--red)', letterSpacing: '0.14em', textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                Needs Attention
              </div>
              {needsAttention.map((c) => (
                <ComponentCard key={c.componentId} component={c} vehicleId={vehicleId} onNavigate={() => setModalComponentId(c.componentId)} attention />
              ))}
            </>
          )}

          {showGroups && healthy.length > 0 && (
            <>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600,
                color: 'var(--text3)', letterSpacing: '0.14em', textTransform: 'uppercase',
                marginTop: needsAttention.length > 0 ? 16 : 0, marginBottom: 8,
              }}>
                Healthy
              </div>
              {healthy.map((c) => (
                <ComponentCard key={c.componentId} component={c} vehicleId={vehicleId} onNavigate={() => setModalComponentId(c.componentId)} />
              ))}
            </>
          )}

          {showGroups && unknownGroup.length > 0 && (
            <>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600,
                color: 'var(--text3)', letterSpacing: '0.14em', textTransform: 'uppercase',
                marginTop: (needsAttention.length > 0 || healthy.length > 0) ? 16 : 0, marginBottom: 8,
              }}>
                Not configured
              </div>
              {unknownGroup.map((c) => (
                <ComponentCard key={c.componentId} component={c} vehicleId={vehicleId} onNavigate={() => setModalComponentId(c.componentId)} />
              ))}
            </>
          )}

          {!showGroups && sortedHealth.map((c) => (
            <ComponentCard key={c.componentId} component={c} vehicleId={vehicleId} onNavigate={() => setModalComponentId(c.componentId)} attention={ATTENTION_STATES.has(getDerivedState(c))} />
          ))}
        </div>
      )}

      {!loading && !error && (
        <div style={{ padding: '8px 22px 24px' }}>
          <button
            onClick={() => setShowQuickSetup(true)}
            style={{
              width: '100%', padding: '12px', borderRadius: 12,
              background: 'rgba(108,99,255,0.06)', border: '1px dashed rgba(108,99,255,0.3)',
              color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, cursor: 'pointer',
            }}
          >
            ⚡ Quick Setup — add common components at once
          </button>
        </div>
      )}

      {showQuickSetup && (
        <QuickSetupSheet
          vehicleId={vehicleId!}
          existingNames={existingNames}
          onClose={() => setShowQuickSetup(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {modalComponentId !== undefined && (
        <ComponentModal
          componentId={modalComponentId}
          vehicleId={vehicleId!}
          onClose={() => setModalComponentId(undefined)}
          onSaved={() => { setRefreshKey((k) => k + 1); setModalComponentId(undefined) }}
          onDeleted={() => { setRefreshKey((k) => k + 1); setModalComponentId(undefined) }}
        />
      )}
    </div>
  )
}

function ComponentCard({
  component, vehicleId, onNavigate, attention = false,
}: {
  component: ComponentHealth
  vehicleId: string | undefined
  onNavigate: (path: string) => void
  attention?: boolean
}) {
  const healthPct = Math.min(component.kmLifetimePercent ?? 0, component.yearsLifetimePercent ?? 0)
  const hColor = healthColor(healthPct)
  const CI = COMPONENT_ICONS[component.componentType] ?? COMPONENT_ICONS.Other
  const isUnknown = component.currentState === 'Unknown'
  const derivedState = isUnknown ? 'Unknown' : healthPctToState(healthPct)
  const attnStyle = ATTENTION_STYLE[derivedState]
  const displayColor = isUnknown ? 'var(--text2)' : hColor
  const displayName = component.vehicleComponentName || formatEnumLabel(component.componentType)
  const subtitle = [
    component.vehicleComponentName ? formatEnumLabel(component.componentType) : null,
    component.vehicleComponentBrand,
  ].filter(Boolean).join(' · ')

  return (
    <div
      onClick={() => onNavigate(`/vehicles/${vehicleId}/components/${component.componentId}`)}
      style={{
        background: attention && attnStyle ? attnStyle.cardBg : 'var(--surface2)',
        border: `1px solid ${attention && attnStyle ? attnStyle.cardBorder : 'var(--border)'}`,
        borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'var(--surface3)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CI sx={{ fontSize: 18, color: attention && attnStyle ? attnStyle.labelColor : hColor }} />
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
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13, fontWeight: 700,
            color: displayColor,
            lineHeight: 1.2,
          }}>
            {derivedState}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: displayColor,
          }}>
            {isUnknown ? '??' : `${Math.round(healthPct)}% left`}
          </span>
        </div>
      </div>

      {isUnknown ? (
        <div style={{
          height: 4, borderRadius: 99,
          background: 'repeating-linear-gradient(90deg, var(--border) 0px, var(--border) 6px, transparent 6px, transparent 10px)',
        }} />
      ) : (
        <HealthBar percent={healthPct} />
      )}
    </div>
  )
}
