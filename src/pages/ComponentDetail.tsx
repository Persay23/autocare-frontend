import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import DetailCard from '../components/shared/DetailCard'
import DetailRow from '../components/shared/DetailRow'
import ActionButton from '../components/shared/ActionButton'
import StatusPill from '../components/shared/StatusPill'
import HealthBar from '../components/shared/HealthBar'
import { getComponentById, deleteComponent, getComponentHistory } from '../api/components'
import { LoadingText } from '../components/shared/AsyncStates'
import { backBtnStyle } from '../styles/pageStyles'
import { COMPONENT_ICONS } from '../constants/icons'
import { formatEnumLabel } from '../utils/formatters'

// ── change type colours ───────────────────────────────────────────────────────
const CHANGE_TYPE_STYLE = {
  Replaced: { bg: 'rgba(52,211,153,0.1)',  color: 'var(--green)'   },
  Repaired: { bg: 'rgba(108,99,255,0.1)',  color: 'var(--accent)'  },
  Inspected:{ bg: 'rgba(79,143,255,0.1)',  color: 'var(--accent2)' },
  Adjusted: { bg: 'rgba(251,191,36,0.1)',  color: 'var(--yellow)'  },
  Cleaned:  { bg: 'rgba(56,189,248,0.1)',  color: 'var(--accent4)' },
  Other:    { bg: 'rgba(123,128,168,0.1)', color: 'var(--text2)'   },
}

function HistoryItem({ item, vehicleId, onNavigate }) {
  const style = CHANGE_TYPE_STYLE[item.componentChangeType] ?? CHANGE_TYPE_STYLE.Other
  const date = new Date(item.serviceDate).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  const total =
    (item.totalCost) ??
    ((item.laborCost ?? 0) + (item.partsCost ?? 0) + (item.otherCost ?? 0)) //|| null

  return (
    <button
      type="button"
      onClick={() => onNavigate(`/vehicles/${vehicleId}/records/${item.maintenanceRecordId}`)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        width: '100%',
        padding: '12px 0',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--border2)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {/* Change type pill */}
      <span
        style={{
          flexShrink: 0,
          marginTop: 2,
          padding: '3px 8px',
          borderRadius: 6,
          fontSize: 9,
          fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          background: style.bg,
          color: style.color,
          whiteSpace: 'nowrap',
        }}
      >
        {item.componentChangeType?.toUpperCase()}
      </span>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>
          {item.serviceName}
        </div>
        {item.workDescription && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text2)',
              marginBottom: 3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.workDescription}
          </div>
        )}
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--text3)',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span>{date}</span>
          {item.newState && item.newState !== 'Unknown' && (
            <span>→ {item.newState}</span>
          )}
        </div>
      </div>

      {/* Cost + arrow */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {total > 0 && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--accent3)',
              marginBottom: 3,
            }}
          >
            {total.toFixed(2)} zł
          </div>
        )}
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--text3)',
          }}
        >
          →
        </div>
      </div>
    </button>
  )
}

export default function ComponentDetail() {
  const { vehicleId, componentId } = useParams()
  const navigate = useNavigate()
  const [component, setComponent] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getComponentById(componentId)
      .then((res) => setComponent(res.data))
      .finally(() => setLoading(false))
  }, [componentId])

  useEffect(() => {
    getComponentHistory(componentId)
      .then((res) => setHistory(Array.isArray(res.data) ? res.data : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [componentId])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteComponent(componentId)
      navigate(`/vehicles/${vehicleId}/components`)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <PageShell><LoadingText /></PageShell>
  if (!component) return <PageShell><div style={{ padding: 22, color: 'var(--text2)' }}>Component not found.</div></PageShell>

  const formattedType = formatEnumLabel(component.componentType)
  const kmPercent = component.expectedLifetimeKm && component.currentMileage
    ? Math.max(0, Math.min(100, 100 - (component.currentMileage / component.expectedLifetimeKm) * 100))
    : 100
  const yearsPercent = component.expectedLifetimeYears && component.installationDate
    ? (() => {
        const installDate = Temporal.PlainDate.from(component.installationDate);
        const today = Temporal.Now.plainDateISO();

        const ageYears = installDate.until(today, { largestUnit: 'years' }).years;
        return Math.max(0, Math.min(100, 100 - (ageYears / component.expectedLifetimeYears) * 100))
      })()
    : 100
  const healthPct = Math.min(kmPercent, yearsPercent)

  const healthColor =
    healthPct <= 15 ? 'var(--red)'
    : healthPct <= 30 ? 'var(--orange)'
    : healthPct <= 50 ? 'var(--yellow)'
    : 'var(--green)'

  return (
    <PageShell>
      <button onClick={() => navigate(`/vehicles/${vehicleId}/components`)} style={backBtnStyle}>
        {'<-'} Components
      </button>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '0 22px 16px' }}>
        <div
          style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: 'var(--surface3)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
          }}
        >
          {COMPONENT_ICONS[component.componentType] ?? COMPONENT_ICONS.Other}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
            {component.vehicleComponentName || formattedType}
            {component.vehicleComponentName && (
              <span style={{ color: 'var(--text2)', fontWeight: 400, fontSize: 13 }}>
                {' '}· {formattedType}
              </span>
            )}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)' }}>
            {component.vehicleComponentBrand ?? 'Unknown brand'}
          </div>
        </div>
        <StatusPill status={component.state ?? component.currentState} />
      </div>

      {/* ── Health card ── */}
      <div
        style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 14, margin: '0 22px 10px',
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4, color: healthColor }}>
          {healthPct.toFixed(1)}%
        </div>
        <HealthBar percent={healthPct} height={8} />
        <div
          style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: 'var(--text3)', marginTop: 8,
          }}
        >
          <span>km: {kmPercent.toFixed(1)}%</span>
          <span>age: {yearsPercent.toFixed(1)}%</span>
        </div>
      </div>

      {/* ── Component Info ── */}
      <DetailCard title="Component Info">
        <DetailRow label="Type" value={formattedType} />
        <DetailRow label="Brand" value={component.vehicleComponentBrand} />
        <DetailRow label="Name" value={component.vehicleComponentName} />
        <DetailRow label="State" value={component.state ?? component.currentState} />
        <DetailRow
          label="Installed"
          value={
            component.installationDate
              ? new Date(component.installationDate).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })
              : null
          }
        />
        <DetailRow label="Km used" value={component.currentMileage ? `${component.currentMileage?.toLocaleString()} km` : null} />
        <DetailRow label="Lifetime km" value={component.expectedLifetimeKm ? `${component.expectedLifetimeKm?.toLocaleString()} km` : null} />
        <DetailRow label="Lifetime years" value={component.expectedLifetimeYears} />
        <DetailRow label="Notes" value={component.notes} />
      </DetailCard>

      {/* ── Service History ── */}
      <div
        style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 14, margin: '10px 22px', padding: '14px 14px 0',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: 'var(--text3)', textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span>Service History</span>
          {history.length > 0 && (
            <span style={{ color: 'var(--accent)' }}>{history.length} record{history.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {historyLoading ? (
          <div
            style={{
              padding: '20px 0',
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--text3)',
            }}
          >
            LOADING...
          </div>
        ) : history.length === 0 ? (
          <div
            style={{
              padding: '20px 0 14px',
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--text3)',
              lineHeight: 1.6,
            }}
          >
            No service history yet.
            <br />
            History appears when this component is included in a record.
          </div>
        ) : (
          <div>
            {history.map((item, idx) => (
              <div
                key={item.maintenanceRecordComponentId}
                style={{ borderBottom: idx === history.length - 1 ? 'none' : undefined }}
              >
                <HistoryItem
                  item={item}
                  vehicleId={vehicleId}
                  onNavigate={navigate}
                />
              </div>
            ))}
            <div style={{ height: 4 }} />
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div style={{ height: 12 }} />
      <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/components/${componentId}/edit`)}>
        Edit Component
      </ActionButton>
      <div style={{ height: 8 }} />
      {!confirmDelete ? (
        <ActionButton variant="danger" onClick={() => setConfirmDelete(true)}>
          Delete Component
        </ActionButton>
      ) : (
        <div
          style={{
            margin: '0 22px',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 12, padding: 14,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: 'var(--red)', marginBottom: 12, textAlign: 'center',
            }}
          >
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
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.6 : 1,
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