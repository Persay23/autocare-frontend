import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import DetailCard from '@/ui/DetailCard'
import DetailRow from '@/ui/DetailRow'
import ActionButton from '@/ui/ActionButton'
import { getFuelById, deleteFuelEntry } from '@/features/fuel/api'
import type { FuelEntry } from '@/lib/types'
import { LoadingText } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'

export default function FuelDetail() {
  const { vehicleId, entryId } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<FuelEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!entryId) return
    getFuelById(entryId)
      .then((res) => setEntry(res.data as FuelEntry))
      .finally(() => setLoading(false))
  }, [entryId])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteFuelEntry(entryId!)
      navigate(`/vehicles/${vehicleId}/fuel`)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <PageShell><LoadingText /></PageShell>
  if (!entry) return <PageShell><div style={{ padding: 22, color: 'var(--text2)' }}>Entry not found.</div></PageShell>

  const pricePerL = entry.amount > 0 ? (entry.cost / entry.amount).toFixed(2) : null
  const formattedDate = new Date(entry.refillDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <PageShell>
      <button onClick={() => navigate(`/vehicles/${vehicleId}/fuel`)} style={backBtnStyle}>
        {'<-'} Fuel
      </button>

      <div
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '20px 14px',
          margin: '0 22px 10px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginBottom: 6 }}>
          TOTAL COST
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent3)' }}>{entry.cost?.toLocaleString()} zl</div>
        {pricePerL && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
            {pricePerL} zl/L
          </div>
        )}
      </div>

      <DetailCard title="Refill Details">
        <DetailRow label="Date" value={formattedDate} />
        <DetailRow label="Amount" value={`${entry.amount} L`} />
        <DetailRow label="Price per litre" value={pricePerL ? `${pricePerL} zl` : null} />
        <DetailRow label="Mileage" value={entry.mileage ? `${entry.mileage?.toLocaleString()} km` : null} />
        <DetailRow label="Station" value={entry.notes} />
        <DetailRow label="Fuel Type" value={entry.fuelType} />
      </DetailCard>

      <div style={{ height: 12 }} />
      <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/fuel/${entryId}/edit`)}>
        Edit Entry
      </ActionButton>
      <div style={{ height: 8 }} />
      {!confirmDelete ? (
        <ActionButton variant="danger" onClick={() => setConfirmDelete(true)}>
          Delete Entry
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
