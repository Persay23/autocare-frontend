import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getPredictionsByVehicle, updatePrediction, triggerAiSuggest } from '@/features/predictions/api'
import { dedupFetch } from '@/shared/dedup'
import { LoadingState, ErrorState } from '@/ui/AsyncStates'
import PredictionCard from '@/features/predictions/PredictionCard'
import PredictionModal from '@/features/predictions/PredictionModal'
import FilterPill from '@/ui/FilterPill'
import type { FilterOption } from '@/shared/filters'
import type { Prediction } from '@/shared/types'

const URGENCY_ORDER: Prediction['urgency'][] = ['Immediate', 'Soon', 'Scheduled', 'Suggested']

const URGENCY_SECTION: Record<string, { label: string; color: string }> = {
  Immediate: { label: 'Immediate', color: 'var(--red)'    },
  Soon:      { label: 'Soon',      color: 'var(--orange)' },
  Scheduled: { label: 'Scheduled', color: 'var(--yellow)' },
  Suggested: { label: 'Suggested', color: 'var(--text3)'  },
}

export default function PredictionListPage() {
  const { vehicleId } = useParams()
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing]         = useState(false)
  const [urgencyFilter, setUrgencyFilter]   = useState<string[]>([])
  const [statusFilter,  setStatusFilter]    = useState<string>('all')
  const [modalId, setModalId] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    dedupFetch(`predictions-${vehicleId}`, () => getPredictionsByVehicle(vehicleId!))
      .then((res) => setPredictions(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError('Failed to load predictions.'))
      .finally(() => setLoading(false))
  }, [vehicleId])

  useEffect(() => { load() }, [load])


  const handleIgnore = async (p: Prediction) => {
    try {
      await updatePrediction(p.predictionId, { status: 'Ignored', ignoredAt: new Date().toISOString() })
      setPredictions((prev) => prev.map((x) =>
        x.predictionId === p.predictionId ? { ...x, status: 'Ignored', ignoredAt: new Date().toISOString() } : x
      ))
    } catch { /* no-op */ }
  }

  const handleDone = async (p: Prediction) => {
    const completedAt = new Date().toISOString()
    try {
      await updatePrediction(p.predictionId, { status: 'Completed', completedAt })
      setPredictions((prev) => prev.map((x) =>
        x.predictionId === p.predictionId ? { ...x, status: 'Completed', completedAt } : x
      ))
    } catch { /* no-op */ }
  }

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await triggerAiSuggest(vehicleId!)
      // Wait a moment for the backend fire-and-forget to complete, then re-fetch
      await new Promise((r) => setTimeout(r, 3000))
      const res = await getPredictionsByVehicle(vehicleId!)
      setPredictions(Array.isArray(res.data) ? res.data : [])
    } catch { /* no-op */ }
    finally { setRefreshing(false) }
  }

  const active = predictions.filter((p) => p.status === 'Active')
  const done   = predictions.filter((p) => p.status === 'Completed' || p.status === 'Ignored')

  const visibleActive = urgencyFilter.length === 0
    ? active
    : active.filter((p) => urgencyFilter.includes(p.urgency))

  const visibleDone = statusFilter === 'Active'  ? [] :
    statusFilter === 'Completed' ? done.filter((p) => p.status === 'Completed') :
    statusFilter === 'Ignored'   ? done.filter((p) => p.status === 'Ignored') :
    done

  const showActive = statusFilter === 'all' || statusFilter === 'Active'

  const activeByUrgency = URGENCY_ORDER
    .map((u) => ({ urgency: u, items: visibleActive.filter((p) => p.urgency === u) }))
    .filter((g) => g.items.length > 0)

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: '16px 22px 10px',
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            AI Predictions
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
            Prioritised action suggestions
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {active.length > 0 && (
            <div style={{
              padding: '5px 12px', borderRadius: 999,
              background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.35)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 600, color: 'var(--accent)',
            }}>
              {active.length} active
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '5px 12px', borderRadius: 999,
              background: refreshing ? 'var(--surface3)' : 'rgba(52,211,153,0.1)',
              border: `1px solid ${refreshing ? 'var(--border)' : 'rgba(52,211,153,0.3)'}`,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 600,
              color: refreshing ? 'var(--text3)' : 'var(--green)',
              cursor: refreshing ? 'not-allowed' : 'pointer',
            }}
          >
            {refreshing ? '⟳ Analysing...' : '⟳ Refresh'}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {!loading && !error && predictions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '0 22px 10px' }}>
          <FilterPill
            placeholder="Urgency"
            options={([
              { key: 'Immediate', color: 'var(--red)'    },
              { key: 'Soon',      color: 'var(--orange)' },
              { key: 'Scheduled', color: 'var(--yellow)' },
              { key: 'Suggested', color: 'var(--text3)'  },
            ] as const).map((o) => ({ key: o.key, label: o.key, color: o.color }))}
            selected={urgencyFilter}
            onChangeMulti={setUrgencyFilter}
            multi noun="levels"
            minWidth={160}
          />
          <FilterPill
            placeholder="Status"
            options={([
              { key: 'all',       label: 'All status' },
              { key: 'Active',    label: 'Active'     },
              { key: 'Completed', label: 'Completed'  },
              { key: 'Ignored',   label: 'Ignored'    },
            ] as FilterOption[])}
            value={statusFilter}
            onChange={setStatusFilter}
            minWidth={160}
          />
        </div>
      )}

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <div style={{ padding: '0 22px 24px' }}>

          {/* ── Active, grouped by urgency — or "all good" card ── */}
          {!showActive ? null : active.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 10, padding: '32px 16px', textAlign: 'center',
              background: 'rgba(52,211,153,0.06)',
              border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: 14, marginBottom: 20,
            }}>
              <div style={{ fontSize: 32 }}>🛡️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                Your vehicle is in great shape
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, maxWidth: 260 }}>
                AI found no urgent or scheduled actions needed. Keep up with regular
                maintenance to stay ahead.
              </div>
            </div>
          ) : activeByUrgency.map(({ urgency, items }) => {
            const sect = URGENCY_SECTION[urgency]
            return (
              <div key={urgency} style={{ marginBottom: 20 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: sect.color, flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9, fontWeight: 700, color: sect.color,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>
                    {sect.label}
                  </span>
                </div>
                {items.map((p) => (
                  <PredictionCard
                    key={p.predictionId}
                    prediction={p}
                    onDone={handleDone}
                    onIgnore={handleIgnore}
                    onClick={() => setModalId(p.predictionId)}
                  />
                ))}
              </div>
            )
          })}

          {/* ── Completed / Ignored ── */}
          {visibleDone.length > 0 && (
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                marginBottom: 8,
              }}>
                Completed
              </div>
              {visibleDone.map((p) => {
                const isIgnored = p.status === 'Ignored'
                const dateMeta = p.completedAt ? fmtDate(p.completedAt)
                  : p.ignoredAt ? fmtDate(p.ignoredAt) : ''
                return (
                  <div
                    key={p.predictionId}
                    onClick={() => setModalId(p.predictionId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                      opacity: 0.5, cursor: 'pointer',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--text3)',
                        marginBottom: 2, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {p.title}
                      </div>
                      {dateMeta && (
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                          {isIgnored ? 'Ignored' : 'Done'} · {dateMeta}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10, fontWeight: 600,
                      color: isIgnored ? 'var(--text3)' : 'var(--green)',
                      flexShrink: 0,
                    }}>
                      {isIgnored ? '✕' : '✓'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {modalId != null && (
        <PredictionModal
          predictionId={modalId}
          onClose={() => setModalId(null)}
          onUpdated={(updated) => {
            setPredictions((prev) => prev.map((p) => p.predictionId === updated.predictionId ? updated : p))
            setModalId(null)
          }}
        />
      )}
    </div>
  )
}
