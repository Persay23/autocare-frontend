import { useRecordModal } from '@/features/records/recordModalStore'
import { useVehiclesStore } from '@/features/vehicles/vehicleStore'
import RecordModal from './RecordModal'
import CloseIcon from '@mui/icons-material/Close'

export default function GlobalRecordModal() {
  const { isOpen, vehicleId, recordId, openCreate, close } = useRecordModal()
  const vehicles = useVehiclesStore((s) => s.vehicles)

  if (!isOpen) return null

  // ── vehicle picker (no vehicle chosen yet) ────────────────────────────────
  if (!vehicleId) {
    return (
      <>
        <div
          onClick={close}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300 }}
        />
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(480px, 92vw)',
          background: 'var(--surface)', borderRadius: 20,
          border: '1px solid var(--border)', zIndex: 301,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '15px 18px 12px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>New Service Record</div>
            <button onClick={close} style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
              padding: '4px 6px', display: 'flex', alignItems: 'center',
            }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
          <div style={{ padding: '16px 18px 20px' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12,
            }}>
              Select a vehicle
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vehicles.map((v) => (
                <button
                  key={v.vehicleId}
                  onClick={() => openCreate(String(v.vehicleId))}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    textAlign: 'left', width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(108,99,255,0.4)'
                    e.currentTarget.style.background  = 'rgba(108,99,255,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background  = 'var(--surface2)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {v.brand} {v.model}
                    </div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                      color: 'var(--text3)', marginTop: 2,
                    }}>
                      {v.yearOfProduction}{v.licensePlate ? ` · ${v.licensePlate}` : ''}
                    </div>
                  </div>
                  <span style={{ color: 'var(--accent)', fontSize: 18, lineHeight: 1 }}>›</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── record modal (vehicle chosen) ─────────────────────────────────────────
  return (
    <RecordModal
      vehicleId={vehicleId}
      recordId={recordId}
      onClose={close}
      onSaved={close}
      onDeleted={close}
    />
  )
}
