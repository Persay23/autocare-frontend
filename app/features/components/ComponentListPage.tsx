import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import ComponentModal from '@/features/components/ComponentModal'
import HealthBar from '@/ui/HealthBar'
import { getComponentHealth } from '@/features/components/api'
import { dedupFetch } from '@/shared/dedup'
import { LoadingState, ErrorState, EmptyState } from '@/ui/AsyncStates'
import { COMPONENT_ICONS } from '@/shared/icons'
import { formatEnumLabel } from '@/shared/formatters'
import QuickSetupSheet from '@/ui/QuickSetupSheet'

import type { ComponentHealth } from '@/shared/types'
import { colorFromPct } from '@/shared/healthState'

type SortKey  = 'health-asc' | 'health-desc' | 'name-asc' | 'name-desc'
type FilterKey = 'critical' | 'repair' | 'warning' | 'normal' | 'good' | 'perfect' | 'unknown'

const FILTER_COLORS: Record<FilterKey, string> = {
  critical: 'var(--red)',
  repair:   'var(--orange)',
  warning:  'var(--yellow)',
  normal:   'var(--text2)',
  good:     'var(--green)',
  perfect:  'var(--accent4)',
  unknown:  'var(--text3)',
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'health-asc',  label: '↑ Health' },
  { key: 'health-desc', label: '↓ Health' },
  { key: 'name-asc',    label: 'A → Z' },
  { key: 'name-desc',   label: 'Z → A' },
]

const ATTENTION_STATES = new Set(['Critical', 'Repair', 'Warning'])

const ATTENTION_STYLE: Record<string, { cardBg: string; cardBorder: string; labelColor: string }> = {
  Critical: { cardBg: 'rgba(248,113,113,0.07)', cardBorder: 'rgba(248,113,113,0.22)', labelColor: 'var(--red)' },
  Repair:   { cardBg: 'rgba(251,146,60,0.07)',  cardBorder: 'rgba(251,146,60,0.22)',  labelColor: 'var(--orange)' },
  Warning:  { cardBg: 'rgba(251,191,36,0.07)',  cardBorder: 'rgba(251,191,36,0.22)',  labelColor: 'var(--yellow)' },
}

/** Returns the component state from the backend health response. */
function getDerivedState(c: ComponentHealth): string {
  return c.currentState ?? 'Unknown'
}

export default function ComponentListPage() {
  const { vehicleId } = useParams()
  const [health, setHealth] = useState<ComponentHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showQuickSetup, setShowQuickSetup] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [modalComponentId, setModalComponentId] = useState<number | null | undefined>(undefined)
  const [sort, setSort] = useState<SortKey>('health-asc')
  const [filters, setFilters] = useState<FilterKey[]>([])
  const [showSort, setShowSort] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const sortRef   = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const typeRef   = useRef<HTMLDivElement>(null)

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
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setShowTypeFilter(false)
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
  const normalCount   = health.filter((c) => getDerivedState(c) === 'Normal').length
  const goodCount     = health.filter((c) => getDerivedState(c) === 'Good').length
  const perfectCount  = health.filter((c) => getDerivedState(c) === 'Perfect').length
  const unknownCount  = health.filter((c) => getDerivedState(c) === 'Unknown').length

  const filteredHealth = useMemo(() => {
    let result = health
    if (typeFilter.length > 0) result = result.filter((c) => typeFilter.includes(c.componentType))
    if (filters.length > 0) {
      result = result.filter((c) => filters.includes(getDerivedState(c).toLowerCase() as FilterKey))
    }
    return result
  }, [health, filters, typeFilter])

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
  const showGroups = filters.length === 0

  const filterOptions: { key: FilterKey; label: string; count: number }[] = ([
    { key: 'critical' as FilterKey, count: criticalCount },
    { key: 'repair'   as FilterKey, count: repairCount   },
    { key: 'warning'  as FilterKey, count: warningCount  },
    { key: 'normal'   as FilterKey, count: normalCount   },
    { key: 'good'     as FilterKey, count: goodCount     },
    { key: 'perfect'  as FilterKey, count: perfectCount  },
    { key: 'unknown'  as FilterKey, count: unknownCount  },
  ] as const).filter((o) => o.count > 0).map((o) => ({
    key: o.key,
    label: `${o.key.charAt(0).toUpperCase() + o.key.slice(1)} (${o.count})`,
    count: o.count,
  }))

  const typeFilterOptions = [...new Set(health.map((c) => c.componentType))].sort().map((t) => ({
    key: t, label: formatEnumLabel(t),
  }))

  const currentFilterLabel = filters.length === 0
    ? 'State'
    : filters.length === 1
    ? filterOptions.find((o) => o.key === filters[0])?.label?.split(' ')[0] ?? 'State'
    : `${filters.length} states`
  const currentSortLabel   = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? '⇅'
  const currentTypeLabel   = typeFilter.length === 0
    ? 'Type'
    : typeFilter.length === 1
      ? formatEnumLabel(typeFilter[0])
      : `${typeFilter.length} types`

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

        {/* State filter — multi-select */}
        <div ref={filterRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowFilter((p) => !p); setShowSort(false); setShowTypeFilter(false) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500,
              border: (showFilter || filters.length > 0) ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: (showFilter || filters.length > 0) ? 'rgba(108,99,255,0.1)' : 'var(--surface2)',
              color: (showFilter || filters.length > 0) ? 'var(--accent)' : 'var(--text3)',
              transition: 'all 0.15s',
            }}
          >
            {currentFilterLabel} ▾
          </button>
          {showFilter && (
            <div style={{
              position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 100,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, overflow: 'hidden', minWidth: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}>
              {filters.length > 0 && (
                <button
                  onClick={() => setFilters([])}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 14px', background: 'none', border: 'none',
                    borderBottom: '1px solid var(--border)',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                    color: 'var(--text3)', cursor: 'pointer',
                  }}
                >
                  × Clear ({filters.length} selected)
                </button>
              )}
              {filterOptions.map(({ key, label }) => {
                const selected = filters.includes(key)
                const dot = FILTER_COLORS[key]
                return (
                  <button
                    key={key}
                    onClick={() => setFilters((prev) =>
                      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
                    )}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', textAlign: 'left',
                      padding: '10px 14px', background: 'none', border: 'none',
                      borderBottom: '1px solid var(--border)',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      color: selected ? 'var(--accent)' : 'var(--text2)',
                      fontWeight: selected ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                      background: selected ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: '#fff',
                    }}>
                      {selected && '✓'}
                    </span>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: dot, flexShrink: 0,
                    }} />
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Type filter — multi-select */}
        <div ref={typeRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowTypeFilter((p) => !p); setShowFilter(false); setShowSort(false) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500,
              border: (showTypeFilter || typeFilter.length > 0) ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: (showTypeFilter || typeFilter.length > 0) ? 'rgba(108,99,255,0.1)' : 'var(--surface2)',
              color: (showTypeFilter || typeFilter.length > 0) ? 'var(--accent)' : 'var(--text3)',
              transition: 'all 0.15s',
            }}
          >
            {currentTypeLabel} ▾
          </button>
          {showTypeFilter && (
            <div style={{
              position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 100,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, overflow: 'hidden', minWidth: 190,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}>
              {typeFilter.length > 0 && (
                <button
                  onClick={() => setTypeFilter([])}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 14px', background: 'none', border: 'none',
                    borderBottom: '1px solid var(--border)',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                    color: 'var(--text3)', cursor: 'pointer',
                  }}
                >
                  × Clear ({typeFilter.length} selected)
                </button>
              )}
              {typeFilterOptions.map(({ key, label }) => {
                const selected = typeFilter.includes(key)
                return (
                  <button
                    key={key}
                    onClick={() => setTypeFilter((prev) =>
                      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
                    )}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', textAlign: 'left',
                      padding: '10px 14px', background: 'none', border: 'none',
                      borderBottom: '1px solid var(--border)',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      color: selected ? 'var(--accent)' : 'var(--text2)',
                      fontWeight: selected ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                      background: selected ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: '#fff',
                    }}>
                      {selected && '✓'}
                    </span>
                    {label}
                  </button>
                )
              })}
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
  const hColor = colorFromPct(healthPct)
  const CI = COMPONENT_ICONS[component.componentType] ?? COMPONENT_ICONS.Other
  const derivedState = component.currentState ?? 'Unknown'
  const isUnknown    = derivedState === 'Unknown'
  const attnStyle    = ATTENTION_STYLE[derivedState]
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
