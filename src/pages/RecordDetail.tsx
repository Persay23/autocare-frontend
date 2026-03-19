import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import DetailCard from '../components/shared/DetailCard'
import DetailRow from '../components/shared/DetailRow'
import ActionButton from '../components/shared/ActionButton'
import { getRecordById, deleteRecord } from '../api/records'
import type { MaintenanceRecord } from '../types'
import { LoadingText } from '../components/shared/AsyncStates'
import { backBtnStyle } from '../styles/pageStyles'
import { SERVICE_ICONS } from '../constants/icons'
import { formatEnumLabel } from '../utils/formatters'

export default function RecordDetail() {
  const { vehicleId, recordId } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState<MaintenanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    getRecordById(recordId!)
      .then((res) => setRecord(res.data as MaintenanceRecord))
      .finally(() => setLoading(false))
  }, [recordId])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteRecord(recordId!)
      navigate(`/vehicles/${vehicleId}/records`)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <PageShell><LoadingText /></PageShell>
  if (!record) return <PageShell><div style={{ padding: 22, color: 'var(--text2)' }}>Record not found.</div></PageShell>

  const RecordIcon = SERVICE_ICONS[record.serviceType] ?? SERVICE_ICONS.Other
  const formattedType = formatEnumLabel(record.serviceType)
  const formattedDate = record.serviceDate
    ? new Date(record.serviceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '\u2014'

  return (
    <PageShell>
      <button onClick={() => navigate(`/vehicles/${vehicleId}/records`)} style={backBtnStyle}>
        {'<-'} Records
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '0 22px 16px' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            flexShrink: 0,
            background: 'rgba(108,99,255,0.12)',
            border: '1px solid rgba(108,99,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RecordIcon sx={{ fontSize: 24, color: 'var(--accent)' }} />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{formattedType}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)' }}>
            {formattedDate}
          </div>
        </div>
      </div>

      <DetailCard title="Record Info">
        <DetailRow label="Service Name" value={record.serviceName} />
        <DetailRow label="Service Type" value={formattedType} />
        <DetailRow label="Date" value={formattedDate} />
        <DetailRow label="Mileage" value={record.mileage ? `${record.mileage?.toLocaleString()} km` : null} />
        <DetailRow
          label="Total Cost"
          value={record.cost != null ? `${record.cost.toLocaleString()} zl` : null}
          valueColor="var(--accent3)"
        />
        <DetailRow label="Description" value={record.description} />
      </DetailCard>

      {(record.maintenanceRecordComponents?.length ?? 0) > 0 && (
        <DetailCard title="Components Serviced">
          {(record.maintenanceRecordComponents ?? []).map((component) => (
            <div
              key={component.maintenanceRecordComponentId}
              style={{
                background: 'var(--surface3)',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                  {formatEnumLabel(component.componentType) ?? 'Component'}
                </div>
                {component.totalCost != null && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--accent3)' }}>
                    {component.totalCost.toLocaleString()} zl
                  </span>
                )}
              </div>
              {component.workDescription && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                  {component.workDescription}
                </div>
              )}
            </div>
          ))}
        </DetailCard>
      )}

      <div style={{ height: 12 }} />
      <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/records/${recordId}/edit`)}>
        Edit Record
      </ActionButton>
      <div style={{ height: 8 }} />
      {!confirmDelete ? (
        <ActionButton variant="danger" onClick={() => setConfirmDelete(true)}>
          Delete Record
        </ActionButton>
      ) : (
        <div
          style={{
            margin: '0 22px',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 12,
            padding: '14px',
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'var(--red)',
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            Are you sure? This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 10,
                background: 'var(--red)',
                color: '#fff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 10,
                background: 'var(--surface2)',
                color: 'var(--text2)',
                border: '1px solid var(--border)',
                fontSize: 13,
                cursor: 'pointer',
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
