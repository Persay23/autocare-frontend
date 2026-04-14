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
  Monitor:  { bg: 'rgba(251,191,36,0.12)',  color: 'var(--yellow)'  },
  Warning:  { bg: 'rgba(251,146,60,0.12)',  color: 'var(--orange)'  },
  Repair:   { bg: 'rgba(248,113,113,0.12)', color: 'var(--red)'     },
  Critical: { bg: 'rgba(248,113,113,0.12)', color: 'var(--red)'     },
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
            {total.toFixed(2)} zł
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
  const pill = STATE_PILL[state] ?? { bg: 'rgba(123,128,168,0.12)', color: 'var(--text2)' }

  // Health calculations
  const kmPercent = component.expectedLifetimeKm && component.currentMileage != null
    ? Math.max(0, Math.min(100, 100 - (component.currentMileage / component.expectedLifetimeKm) * 100))
    : 100
  const ageYears = component.installationDate
    ? (Date.now() - new Date(component.installationDate).getTime()) / (365.25 * 24 * 3600 * 1000)
    : 0
  const yearsPercent = component.expectedLifetimeYears
    ? Math.max(0, Math.min(100, 100 - (ageYears / component.expectedLifetimeYears) * 100))
    : 100
  const healthPct = Math.min(kmPercent, yearsPercent)
  const healthColor =
    healthPct <= 15 ? 'var(--red)'
    : healthPct <= 30 ? 'var(--orange)'
    : healthPct <= 50 ? 'var(--yellow)'
    : healthPct <= 75 ? 'var(--green)'
    : 'var(--accent4)'

  const remainingKm   = Math.max(0, (component.expectedLifetimeKm ?? 0) - (component.currentMileage ?? 0))
  const remainingYears = Math.max(0, (component.expectedLifetimeYears ?? 0) - ageYears)

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const installedDate = component.installationDate ? fmtDate(component.installationDate) : null
  const warrantyDateStr = component.warrantyDate ? fmtDate(component.warrantyDate) : null
  const warrantyValid  = component.warrantyDate ? new Date(component.warrantyDate) > new Date() : false
  const nextDateStr    = component.nextServiceRecommendedDate ? fmtDate(component.nextServiceRecommendedDate) : null
  const nextRelative   = component.nextServiceRecommendedDate ? relativeFromNow(component.nextServiceRecommendedDate) : null
  const kmAway = component.nextServiceRecommendedKm != null && component.currentMileage != null
    ? component.nextServiceRecommendedKm - component.currentMileage
    : null

  const hasWarranty     = warrantyDateStr || component.warrantyKm
  const hasNextService  = nextDateStr || component.nextServiceRecommendedKm

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
            {state}
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
            {component.currentMileage != null && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                {component.currentMileage.toLocaleString()} km used
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, borderRadius: 3, background: 'var(--surface3)', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{
            height: '100%', width: `${healthPct}%`,
            background: healthColor, borderRadius: 3,
            transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {statTile(
            'By distance',
            `${Math.round(kmPercent)}%`,
            `of ${remainingKm.toLocaleString()} km left`,
            healthColor,
          )}
          {statTile(
            'By age',
            `${Math.round(yearsPercent)}%`,
            `of ${remainingYears.toFixed(1)} years left`,
            healthColor,
          )}
        </div>
      </div>

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
              {nextDateStr && statTile('By date', nextDateStr, nextRelative ?? '')}
              {component.nextServiceRecommendedKm != null && statTile(
                'By mileage',
                `${component.nextServiceRecommendedKm.toLocaleString()} km`,
                kmAway != null ? `${Math.abs(kmAway).toLocaleString()} km ${kmAway >= 0 ? 'away' : 'overdue'}` : '',
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
