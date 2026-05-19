import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getComponentById, deleteComponent, getComponentHistory } from '@/features/components/api'
import { dedupFetch } from '@/lib/dedup'
import type { VehicleComponent } from '@/lib/types'
import { LoadingText } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import { COMPONENT_ICONS } from '@/lib/icons'
import { formatEnumLabel } from '@/lib/formatters'
import { healthPctToState, stateColor } from '@/lib/healthState'
import { useCurrencyStore, formatMoney } from '@/features/currency/currencyStore'

const NOW_MS = Date.now()

const CHANGE_TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  Replaced:  { bg: 'rgba(52,211,153,0.1)',  color: 'var(--green)'   },
  Repaired:  { bg: 'rgba(108,99,255,0.1)',  color: 'var(--accent)'  },
  Inspected: { bg: 'rgba(79,143,255,0.1)',  color: 'var(--accent2)' },
  Adjusted:  { bg: 'rgba(251,191,36,0.1)',  color: 'var(--yellow)'  },
  Cleaned:   { bg: 'rgba(56,189,248,0.1)',  color: 'var(--accent4)' },
  Other:     { bg: 'rgba(123,128,168,0.1)', color: 'var(--text2)'   },
}

const STATE_PILL: Record<string, { bg: string; color: string }> = {
  Perfect:  { bg: 'rgba(56,189,248,0.12)',  color: 'var(--accent4)' },
  Good:     { bg: 'rgba(52,211,153,0.12)',  color: 'var(--green)'   },
  Normal:   { bg: 'rgba(251,191,36,0.12)',  color: 'var(--yellow)'  },
  Repair:   { bg: 'rgba(251,146,60,0.12)',  color: 'var(--orange)'  },
  Critical: { bg: 'rgba(248,113,113,0.12)', color: 'var(--red)'     },
  Unknown:  { bg: 'rgba(123,128,168,0.12)', color: 'var(--text2)'   },
}

function relativeFromNow(iso: string): string {
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (diff < 0)   return `${Math.abs(diff)} days ago`
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff < 30)  return `in ${diff} days`
  if (diff < 365) return `in ~${Math.round(diff / 30)} months`
  return `in ~${Math.round(diff / 365)} years`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HistoryItem({ item, vehicleId, onNavigate }: { item: any; vehicleId: string | undefined; onNavigate: (path: string) => void }) {
  const style = CHANGE_TYPE_STYLE[item.componentChangeType] ?? CHANGE_TYPE_STYLE.Other
  const date = new Date(item.serviceDate as string).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  const total = item.totalCost ?? ((item.laborCost ?? 0) + (item.partsCost ?? 0) + (item.otherCost ?? 0))
  const { currency } = useCurrencyStore()

  return (
    <button
      type="button"
      onClick={() => onNavigate(`/vehicles/${vehicleId}/records/${item.maintenanceRecordId}`)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        width: '100%', padding: '12px 0',
        background: 'none', border: 'none',
        borderBottom: '1px solid var(--border2)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{
        flexShrink: 0, marginTop: 2, padding: '3px 8px', borderRadius: 6,
        fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
        background: style.bg, color: style.color, whiteSpace: 'nowrap',
      }}>
        {item.componentChangeType?.toUpperCase()}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>
          {item.serviceName}
        </div>
        {item.workDescription && (
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.workDescription}
          </div>
        )}
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', display: 'flex', gap: 8 }}>
          <span>{date}</span>
          {item.newState && item.newState !== 'Unknown' && <span>→ {item.newState}</span>}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {total > 0 && (
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent3)', marginBottom: 3 }}>
            {formatMoney(total, currency)}
          </div>
        )}
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>→</div>
      </div>
    </button>
  )
}

export default function ComponentDetail() {
  const { vehicleId, componentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => location.key !== 'default'
    ? navigate(-1)
    : navigate(`/vehicles/${vehicleId}/components`)
  const [component, setComponent] = useState<VehicleComponent | null>(null)
  const [history, setHistory] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    dedupFetch(`component-${componentId}`, () => getComponentById(componentId!))
      .then((res) => { if (!cancelled) setComponent(res.data as VehicleComponent) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [componentId])

  useEffect(() => {
    let cancelled = false
    dedupFetch(`component-history-${componentId}`, () => getComponentHistory(componentId!))
      .then((res) => { if (!cancelled) setHistory(Array.isArray(res.data) ? res.data : []) })
      .catch(() => { if (!cancelled) setHistory([]) })
      .finally(() => { if (!cancelled) setHistoryLoading(false) })
    return () => { cancelled = true }
  }, [componentId])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteComponent(componentId!)
      navigate(`/vehicles/${vehicleId}/components`)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <PageShell><LoadingText /></PageShell>
  if (!component) return <PageShell><div style={{ padding: 22, color: 'var(--text2)' }}>Component not found.</div></PageShell>

  const CompIcon = COMPONENT_ICONS[component.componentType] ?? COMPONENT_ICONS.Other
  const formattedType = formatEnumLabel(component.componentType)
  const state = component.state ?? component.currentState ?? 'Unknown'
  const isUnknown = state === 'Unknown'

  // Health calculations — installedAtVehicleMileage is the vehicle odometer at install (fixed reference point)
  const kmUsed    = Math.max(0, (component.vehicleCurrentMileage ?? 0) - (component.installedAtVehicleMileage ?? 0))
  const kmPercent = component.expectedLifetimeKm > 0
    ? Math.max(0, Math.min(100, (1 - kmUsed / component.expectedLifetimeKm) * 100))
    : 100
  const ageYears = component.installationDate
    ? (NOW_MS - new Date(component.installationDate).getTime()) / (365.25 * 24 * 3600 * 1000)
    : 0
  const yearsPercent = component.expectedLifetimeYears
    ? Math.max(0, Math.min(100, 100 - (ageYears / component.expectedLifetimeYears) * 100))
    : 100
  const healthPct = Math.min(kmPercent, yearsPercent)
  const healthColor =
    healthPct >= 75 ? 'var(--accent4)'
    : healthPct >= 51 ? 'var(--green)'
    : healthPct >= 31 ? 'var(--yellow)'
    : healthPct >= 16 ? 'var(--orange)'
    : 'var(--red)'
  const derivedState = isUnknown ? 'Unknown' : healthPctToState(healthPct)
  const pill = STATE_PILL[derivedState] ?? STATE_PILL.Unknown
  const kmColor = stateColor(healthPctToState(kmPercent))
  const yearsColor = stateColor(healthPctToState(yearsPercent))
  const aiHealthColor = component.aiHealthPercent != null
    ? stateColor(healthPctToState(component.aiHealthPercent))
    : 'var(--text)'

  const remainingKm   = Math.max(0, (component.expectedLifetimeKm ?? 0) - kmUsed)
  const remainingYears = Math.max(0, (component.expectedLifetimeYears ?? 0) - ageYears)

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const installedDate = component.installationDate ? fmtDate(component.installationDate) : null
  const warrantyDateStr = component.warrantyDate ? fmtDate(component.warrantyDate) : null
  const warrantyValid  = component.warrantyDate ? new Date(component.warrantyDate) > new Date() : false
  const nextDateStr    = component.nextServiceRecommendedDate ? fmtDate(component.nextServiceRecommendedDate) : null
  const nextRelative   = component.nextServiceRecommendedDate ? relativeFromNow(component.nextServiceRecommendedDate) : null
  const kmAway = component.nextServiceRecommendedKm != null
    ? component.nextServiceRecommendedKm - (component.vehicleCurrentMileage ?? 0)
    : null

  // AI next-service values (primary when available, fall back to manual)
  const aiNextDateStr  = component.aiEstimatedNextServiceDate ? fmtDate(component.aiEstimatedNextServiceDate) : null
  const aiNextRelative = component.aiEstimatedNextServiceDate ? relativeFromNow(component.aiEstimatedNextServiceDate) : null
  const showAiDate  = aiNextDateStr != null
  const showManDate = !showAiDate && nextDateStr != null
  const showDate    = showAiDate || showManDate
  const showAiKm    = component.aiEstimatedRemainingKm != null
  const showManKm   = !showAiKm && component.nextServiceRecommendedKm != null
  const showKm      = showAiKm || showManKm

  const hasWarranty    = warrantyDateStr || component.warrantyKm
  const hasNextService = showDate || showKm

  const sectionLabel = (text: string, action?: { label: string; onClick: () => void }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
      color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em',
      padding: '0 22px', marginBottom: 8,
    }}>
      <span>{text}</span>
      {action && (
        <button type="button" onClick={action.onClick} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: 'var(--accent)', textDecoration: 'none',
        }}>
          {action.label}
        </button>
      )}
    </div>
  )

  const statTile = (label: string, value: string, sub: string, valueColor = 'var(--text)') => (
    <div style={{
      background: 'var(--surface3)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: valueColor, marginBottom: 3 }}>
        {value}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
        {sub}
      </div>
    </div>
  )

  return (
    <PageShell>
      <button onClick={goBack} style={backBtnStyle}>
        {'<-'} Back
      </button>
      <VehicleLabel vehicleId={vehicleId} />

      {/* ── Header ── */}
      <div style={{ padding: '0 22px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: 'var(--surface3)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CompIcon sx={{ fontSize: 26, color: 'var(--accent3)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
              {component.vehicleComponentName || formattedType}
            </div>
          </div>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
            background: pill.bg, color: pill.color,
            borderRadius: 20, padding: '4px 11px', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: pill.color, display: 'inline-block' }} />
            {derivedState}
          </span>
        </div>

        {/* Tag pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)',
            color: 'var(--accent)', borderRadius: 20, padding: '3px 10px',
          }}>
            {formattedType}
          </span>
          {(component.vehicleComponentBrand || component.brand) && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              background: 'var(--surface3)', border: '1px solid var(--border)',
              color: 'var(--text2)', borderRadius: 20, padding: '3px 10px',
            }}>
              {component.vehicleComponentBrand ?? component.brand}
            </span>
          )}
          {component.partNumber && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              background: 'var(--surface3)', border: '1px solid var(--border)',
              color: 'var(--text2)', borderRadius: 20, padding: '3px 10px',
            }}>
              {component.partNumber}
            </span>
          )}
        </div>
      </div>

      {/* ── Remaining lifespan ── */}
      {sectionLabel('Remaining lifespan')}
      {isUnknown ? (
        <div style={{
          margin: '0 22px 16px',
          background: 'rgba(123,128,168,0.06)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: 'var(--text3)', lineHeight: 1 }}>??</div>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              background: 'rgba(123,128,168,0.12)', color: 'var(--text2)',
              borderRadius: 20, padding: '3px 10px',
            }}>
              Not configured
            </span>
          </div>
          <div style={{
            height: 6, borderRadius: 3, marginBottom: 14,
            background: 'repeating-linear-gradient(90deg, var(--border) 0px, var(--border) 6px, transparent 6px, transparent 10px)',
          }} />
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: 'var(--text2)', lineHeight: 1.6, marginBottom: 12,
          }}>
            {!component.expectedLifetimeKm && !component.expectedLifetimeYears
              ? 'Set expected lifetime (km and/or years) on this component to enable health tracking.'
              : !component.expectedLifetimeKm
                ? 'Expected lifetime in km is not set — add it for distance-based health tracking.'
                : !component.expectedLifetimeYears
                  ? 'Expected lifetime in years is not set — add it for age-based health tracking.'
                  : 'Lifetime is configured. Add this component to a service record to compute its health state.'
            }
          </div>
          <button
            onClick={() => navigate(`/vehicles/${vehicleId}/components/${component.vehicleComponentId ?? component.componentId}/edit`)}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 10,
              background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.3)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
              color: 'var(--accent)', cursor: 'pointer',
            }}
          >
            Configure component →
          </button>
        </div>
      ) : (
        <div style={{
          margin: '0 22px 10px',
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: healthColor, lineHeight: 1 }}>
              {Math.round(healthPct)}%
            </div>
            <div style={{ textAlign: 'right' }}>
              {installedDate && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>
                  Installed {installedDate}
                </div>
              )}
              {kmUsed > 0 && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                  {kmUsed.toLocaleString()} km used
                </div>
              )}
            </div>
          </div>

          <div style={{ height: 6, borderRadius: 3, background: 'var(--surface3)', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{
              height: '100%', width: `${healthPct}%`,
              background: healthColor, borderRadius: 3,
              transition: 'width 0.4s ease',
            }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: component.aiHealthPercent != null ? 'repeat(3, 1fr)' : '1fr 1fr', gap: 8 }}>
            {statTile(
              'By distance',
              `${Math.round(kmPercent)}%`,
              `of ${remainingKm.toLocaleString()} km left`,
              kmColor,
            )}
            {statTile(
              'By age',
              `${Math.round(yearsPercent)}%`,
              `of ${remainingYears.toFixed(1)} years left`,
              yearsColor,
            )}
            {component.aiHealthPercent != null && statTile(
              'AI adjusted',
              `${component.aiHealthPercent}%`,
              component.aiConfidenceScore != null
                ? `${Math.round(component.aiConfidenceScore * 100)}% confidence`
                : 'AI health score',
              aiHealthColor,
            )}
          </div>
        </div>
      )}

      {/* ── Warranty ── */}
      {hasWarranty && (
        <>
          {sectionLabel('Warranty')}
          <div style={{
            margin: '0 22px 10px',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            {warrantyDateStr && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '13px 16px', borderBottom: component.warrantyKm ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>Valid until</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: warrantyValid ? 'var(--green)' : 'var(--red)' }}>
                  {warrantyDateStr}
                </span>
              </div>
            )}
            {component.warrantyKm && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '13px 16px',
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>Coverage</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {component.warrantyKm.toLocaleString()} km
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Next Service ── */}
      {hasNextService && (
        <>
          {sectionLabel('Next Service', {
            label: '+ Schedule',
            onClick: () => navigate(`/vehicles/${vehicleId}/components/${componentId}/edit`),
          })}
          <div style={{
            margin: '0 22px 10px',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {showDate && statTile(
                showAiDate ? 'AI est. date' : 'By date',
                showAiDate ? aiNextDateStr! : nextDateStr!,
                showAiDate ? (aiNextRelative ?? '') : (nextRelative ?? ''),
                showAiDate ? 'var(--accent)' : undefined,
              )}
              {showKm && statTile(
                showAiKm ? 'AI est. (km)' : 'By mileage',
                showAiKm
                  ? `${component.aiEstimatedRemainingKm!.toLocaleString()} km`
                  : `${component.nextServiceRecommendedKm!.toLocaleString()} km`,
                showAiKm
                  ? 'km remaining'
                  : (kmAway != null ? `${Math.abs(kmAway).toLocaleString()} km ${kmAway >= 0 ? 'away' : 'overdue'}` : ''),
                showAiKm ? 'var(--accent)' : undefined,
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Notes ── */}
      {component.notes && (
        <>
          {sectionLabel('Notes')}
          <div style={{
            margin: '0 22px 10px',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <div style={{
              borderLeft: '3px solid var(--accent)',
              paddingLeft: 12,
            }}>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                {component.notes}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── AI Advice ── */}
      {sectionLabel('AI Advice')}
      <div style={{
        margin: '0 22px 10px',
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 16px',
      }}>
        {component.aiGeneratedAt ? (
          <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 6 }}>
              {component.aiRecommendation ?? 'No specific recommendation.'}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              Generated {fmtDate(component.aiGeneratedAt)}
              {component.aiConfidenceScore != null && ` · ${Math.round(component.aiConfidenceScore * 100)}% confidence`}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🤖</span>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>
                AI analysis pending
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', opacity: 0.6, lineHeight: 1.5 }}>
                Add a service record with this component to trigger AI advice
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Service History ── */}
      {sectionLabel('Service History', history.length > 0 ? {
        label: `${history.length} record${history.length !== 1 ? 's' : ''}`,
        onClick: () => navigate(`/vehicles/${vehicleId}/records`),
      } : undefined)}
      <div style={{
        margin: '0 22px 10px',
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '0 14px',
      }}>
        {historyLoading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
            LOADING...
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', lineHeight: 1.6 }}>
            No service history yet.<br />Appears when this component is included in a record.
          </div>
        ) : (
          <div>
            {history.map((item) => (
              <HistoryItem
                key={item.maintenanceRecordComponentId as number}
                item={item}
                vehicleId={vehicleId}
                onNavigate={navigate}
              />
            ))}
            <div style={{ height: 4 }} />
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div style={{ height: 4 }} />
      <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/components/${componentId}/edit`)}>
        Edit Component
      </ActionButton>
      <div style={{ height: 12 }} />
      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          style={{
            display: 'block', margin: '0 auto',
            background: 'none', border: 'none',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: 'var(--red)',
            textDecoration: 'underline', cursor: 'pointer',
          }}
        >
          Delete component
        </button>
      ) : (
        <div style={{
          margin: '0 22px',
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 12, padding: 14,
        }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--red)', marginBottom: 12, textAlign: 'center' }}>
            Are you sure? This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                background: 'var(--red)', color: '#fff', border: 'none',
                fontSize: 13, fontWeight: 600,
                cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                background: 'var(--surface2)', color: 'var(--text2)',
                border: '1px solid var(--border)', fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div style={{ height: 24 }} />
    </PageShell>
  )
}
