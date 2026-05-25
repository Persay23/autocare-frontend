import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getFuelById, deleteFuelEntry } from '@/features/fuel/api'
import { dedupFetch } from '@/lib/dedup'
import type { FuelEntry } from '@/lib/types'
import { LoadingText } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import { useCurrencyStore, formatMoney, RATES, SYMBOLS } from '@/features/currency/currencyStore'

export default function FuelDetail() {
  const { vehicleId, entryId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => location.key !== 'default'
    ? navigate(-1)
    : navigate(`/vehicles/${vehicleId}/fuel`)
  const [entry, setEntry] = useState<FuelEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!entryId) return
    let cancelled = false
    dedupFetch(`fuel-entry-${entryId}`, () => getFuelById(entryId))
      .then((res) => { if (!cancelled) setEntry(res.data as FuelEntry) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
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

  const { currency } = useCurrencyStore()

  if (loading) return <PageShell><LoadingText /></PageShell>
  if (!entry) return <PageShell><div style={{ padding: 22, color: 'var(--text2)' }}>Entry not found.</div></PageShell>
  const pricePerL = entry.amount > 0 ? (entry.cost / entry.amount).toFixed(2) : null
  const pricePerLDisplay = pricePerL != null
    ? `${(parseFloat(pricePerL) * RATES[currency]).toFixed(2)} ${SYMBOLS[currency]}/L`
    : '—'
  const formattedDate = new Date(entry.refillDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <PageShell>
      <button onClick={goBack} style={backBtnStyle}>
        {'<-'} Back
      </button>
      <VehicleLabel vehicleId={vehicleId} />

      {/* Cost hero card */}
      <div style={{
        margin: '0 22px 10px',
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '16px',
      }}>
        {/* Top row: label + fuel type pill + date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
            Total cost
          </span>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
              background: 'var(--surface3)', border: '1px solid var(--border)',
              color: 'var(--text)', borderRadius: 6, padding: '3px 9px',
              display: 'inline-block', marginBottom: 4,
            }}>
              {entry.fuelType}
            </span>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
              {formattedDate}
            </div>
          </div>
        </div>

        {/* Big cost */}
        <div style={{ fontSize: 38, fontWeight: 800, color: 'var(--accent3)', lineHeight: 1, marginBottom: 14 }}>
          {formatMoney(entry.cost ?? 0, currency)}
        </div>

        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Litres',    value: `${entry.amount} L` },
            { label: 'Per litre', value: pricePerLDisplay },
            { label: 'Total',     value: formatMoney(entry.cost ?? 0, currency), accent: true },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{
              background: 'var(--surface3)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                {label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: accent ? 'var(--accent3)' : 'var(--text)' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LOCATION & MILEAGE */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        padding: '0 22px', marginBottom: 8,
      }}>
        Location &amp; Mileage
      </div>
      <div style={{
        margin: '0 22px 14px',
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '13px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>Station</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {entry.notes ? (
              <><span>⛽</span>{entry.notes}</>
            ) : '—'}
          </span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '13px 16px',
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>Odometer</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {entry.mileage ? `${entry.mileage.toLocaleString()} km` : '—'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/fuel/${entryId}/edit`)}>
        Edit entry
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
          Delete entry
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
