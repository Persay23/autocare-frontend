import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getRecordById, deleteRecord } from '@/features/records/api'
import { getComponentsByVehicle } from '@/features/components/api'
import { dedupFetch } from '@/lib/dedup'
import type { MaintenanceRecord, VehicleComponent } from '@/lib/types'
import { LoadingText } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import { SERVICE_ICONS } from '@/lib/icons'
import { formatEnumLabel } from '@/lib/formatters'

export default function RecordDetail() {
  const { vehicleId, recordId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => location.key !== 'default'
    ? navigate(-1)
    : navigate(`/vehicles/${vehicleId}/records`)
  const [record, setRecord] = useState<MaintenanceRecord | null>(null)
  const [vehicleComponents, setVehicleComponents] = useState<VehicleComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const toggleComponent = (id: number) =>
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  useEffect(() => {
    let cancelled = false
    dedupFetch(`record-${recordId}`, () => getRecordById(recordId!))
      .then((res) => { if (!cancelled) setRecord(res.data as MaintenanceRecord) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [recordId])

  useEffect(() => {
    if (!vehicleId) return
    let cancelled = false
    dedupFetch(`components-vehicle-${vehicleId}`, () => getComponentsByVehicle(vehicleId))
      .then((res) => { if (!cancelled) setVehicleComponents(Array.isArray(res.data) ? res.data : []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [vehicleId])

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

  const fmtDate = (iso: string | undefined) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined

  const startedAt = record.startedAt ?? record.serviceDate
  const formattedStarted = fmtDate(startedAt)
  const formattedCompleted = fmtDate(record.completedAt)

  const componentNameMap = new Map(vehicleComponents.map((c) => [c.vehicleComponentId ?? c.componentId, c]))

  return (
    <PageShell>
      <button onClick={goBack} style={backBtnStyle}>
        {'<-'} Back
      </button>
      <VehicleLabel vehicleId={vehicleId} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '0 22px 16px' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RecordIcon sx={{ fontSize: 24, color: 'var(--accent)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6, lineHeight: 1.2 }}>
            {record.serviceName}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500,
              background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)',
              color: 'var(--accent)', borderRadius: 20, padding: '3px 9px',
            }}>
              {formattedType}
            </span>
            {record.mileage != null && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)',
                color: 'var(--accent)', borderRadius: 20, padding: '3px 9px',
              }}>
                {record.mileage.toLocaleString()} km
              </span>
            )}
          </div>
        </div>
        {record.cost > 0 && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent3)', lineHeight: 1 }}>
              {record.cost.toLocaleString()} zł
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 3 }}>
              total
            </div>
          </div>
        )}
      </div>

      {/* TIME & STATUS */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        padding: '0 22px', marginBottom: 8,
      }}>
        Time &amp; Status
      </div>
      <div style={{
        margin: '0 22px 10px',
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '14px 16px', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginBottom: 5 }}>Started</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{formattedStarted ?? '—'}</div>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginBottom: 5 }}>Completed</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{formattedCompleted ?? '—'}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ padding: '14px 16px', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginBottom: 5 }}>Duration</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {record.laborDays != null ? `${record.laborDays} day${record.laborDays !== 1 ? 's' : ''}` : '—'}
            </div>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginBottom: 5 }}>Mileage at service</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {record.mileage != null ? `${record.mileage.toLocaleString()} km` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ASSIGNMENT */}
      {(record.technicianName || record.vendorOrShop) && (
        <>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            padding: '0 22px', marginBottom: 8,
          }}>
            Assignment
          </div>
          <div style={{
            margin: '0 22px 10px',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>Technician / Vendor</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {(record.technicianName?.[0] ?? record.vendorOrShop?.[0] ?? '?').toUpperCase()}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  {[record.technicianName, record.vendorOrShop].filter(Boolean).join(' / ')}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* DESCRIPTION */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        padding: '0 22px', marginBottom: 8,
      }}>
        Description
      </div>
      <div style={{
        margin: '0 22px 10px',
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 16px',
      }}>
        {record.description ? (
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{record.description}</div>
        ) : (
          <div style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '4px 0' }}>
            No description added
          </div>
        )}
      </div>

      {/* NOTES */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        padding: '0 22px', marginBottom: 8,
      }}>
        Notes
      </div>
      <div style={{
        margin: '0 22px 10px',
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 16px',
      }}>
        {record.notes ? (
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{record.notes}</div>
        ) : (
          <div style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '4px 0' }}>
            No notes added
          </div>
        )}
      </div>

      {/* INVOICE */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        padding: '0 22px', marginBottom: 8,
      }}>
        Invoice
      </div>
      <div style={{
        margin: '0 22px 10px',
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 16px',
      }}>
        {record.invoiceNumber || record.invoiceImageUrl ? (
          <>
            {record.invoiceNumber && (
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: record.invoiceImageUrl ? 6 : 0 }}>
                Invoice №: <span style={{ fontWeight: 600 }}>{record.invoiceNumber}</span>
              </div>
            )}
            {record.invoiceImageUrl && (
              <a
                href={record.invoiceImageUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  color: 'var(--accent)', textDecoration: 'underline',
                }}
              >
                View invoice →
              </a>
            )}
          </>
        ) : (
          <>
            <div style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--text3)', textAlign: 'center', marginBottom: 12 }}>
              No invoice attached
            </div>
            <button
              onClick={() => navigate(`/vehicles/${vehicleId}/records/${recordId}/edit`)}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 10,
                background: 'var(--surface3)', border: '1px solid var(--border)',
                color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              + Attach invoice
            </button>
          </>
        )}
      </div>

      {/* Components serviced */}
      {(record.maintenanceRecordComponents?.length ?? 0) > 0 && (
        <div style={{
          margin: '0 22px 10px',
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          {/* Section header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Components serviced</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
              {record.maintenanceRecordComponents!.length} component{record.maintenanceRecordComponents!.length !== 1 ? 's' : ''}
            </span>
          </div>

          {(record.maintenanceRecordComponents ?? []).map((c, i, arr) => {
            const vehicleComp = componentNameMap.get(c.componentId)
            const typeName = c.componentType
              ? formatEnumLabel(c.componentType)
              : vehicleComp?.componentType ? formatEnumLabel(vehicleComp.componentType) : null
            const displayName = c.vehicleComponentName || vehicleComp?.vehicleComponentName
            const compName = typeName && displayName
              ? `${typeName} · ${displayName}`
              : displayName || typeName || 'Unknown'
            const brand = vehicleComp?.brand || vehicleComp?.vehicleComponentBrand
            const changeType = c.componentChangeType ?? c.changeType
            const hasCosts = c.laborCost || c.partsCost || c.otherCost
            const id = c.maintenanceRecordComponentId
            const isExpanded = expandedIds.has(id)
            const isLast = i === arr.length - 1

            return (
              <div key={id} style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>

                {/* Collapsed row — always visible, tap to toggle */}
                <button
                  type="button"
                  onClick={() => toggleComponent(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '12px 16px',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: changeType ? 4 : 0 }}>
                      {compName}
                    </div>
                    {changeType && (
                      <span style={{
                        display: 'inline-block',
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600,
                        background: 'rgba(108,99,255,0.15)', color: 'var(--accent)',
                        borderRadius: 20, padding: '2px 8px',
                      }}>
                        {changeType}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {c.totalCost != null && (
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent3)' }}>
                        {c.totalCost.toLocaleString()} zł
                      </span>
                    )}
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      color: 'var(--text3)', transition: 'transform 0.2s',
                      display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}>
                      ▾
                    </span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ padding: '14px 16px' }}>

                    {brand && (
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                        Brand: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{brand}</span>
                      </div>
                    )}

                    {(c.customerComplaint || c.workDescription) && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                          {c.customerComplaint && (
                            <div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 5 }}>
                                Complaint
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{c.customerComplaint}</div>
                            </div>
                          )}
                          {c.workDescription && (
                            <div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 5 }}>
                                Work performed
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{c.workDescription}</div>
                            </div>
                          )}
                        </div>
                        {(c.changedParts || hasCosts) && <div style={{ height: 1, background: 'var(--border)', marginBottom: 12 }} />}
                      </>
                    )}

                    {c.changedParts && (
                      <div style={{ marginBottom: hasCosts ? 12 : 0 }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 5 }}>
                          Parts used
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{c.changedParts}</div>
                        {hasCosts && <div style={{ height: 1, background: 'var(--border)', marginTop: 12 }} />}
                      </div>
                    )}

                    {hasCosts && (
                      <div style={{ marginTop: c.changedParts ? 12 : 0 }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginBottom: 8 }}>
                          Cost breakdown
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          {([
                            { label: 'Labour', val: c.laborCost },
                            { label: 'Parts',  val: c.partsCost },
                            { label: 'Other',  val: c.otherCost },
                          ] as { label: string; val: number | null | undefined }[])
                            .filter(({ val }) => val)
                            .map(({ label, val }) => (
                              <div key={label} style={{
                                background: 'var(--surface3)', border: '1px solid var(--border)',
                                borderRadius: 10, padding: '10px 0',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                              }}>
                                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                                  {label}
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                                  {val?.toLocaleString()} zł
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ height: 12 }} />
      <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/records/${recordId}/edit`)}>
        Edit Record
      </ActionButton>
      <div style={{ height: 8 }} />
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
          Delete record
        </button>
      ) : (
        <div style={{
          margin: '0 22px',
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 12, padding: '14px',
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: 'var(--red)', marginBottom: 12, textAlign: 'center',
          }}>
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
